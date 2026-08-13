import { connectToDatabase } from "@/lib/db";
import { OrderModel } from "@/models/Order";
import { isMetaCapiConfigured } from "@/lib/analytics/config";
import { purchaseEventId } from "@/lib/analytics/event-id";
import type {
  AdminOrderDetail,
  AdminOrderListItem,
  MetaPurchaseStatus,
  Order,
  OrderConfirmationEmailStatus,
  OrderListItem,
  OrderStatus,
  OrderSummary,
  OrderTrackingSummary,
  PaymentMethod,
  PaymentStatus,
} from "@/types/order";

/**
 * Order data-access layer — mirrors `src/services/products.ts`'s role.
 * Every exported function calls `connectToDatabase()` itself so a caller
 * can never accidentally skip it.
 */

/** What comes back from Mongo — same shape as `Order` minus `idempotencyKey`'s absence-in-summaries concern; dates are real `Date`s here, ISO strings only at the summary boundary. */
interface OrderRecord extends Omit<Order, "createdAt" | "updatedAt" | "statusHistory" | "notifications" | "analytics"> {
  statusHistory: { status: OrderStatus; changedAt: Date; changedBy: string | null }[];
  // Optional: orders placed before Phase 10.5 never had this field written — see `toAdminOrderDetail`.
  notifications?: {
    orderConfirmationEmail: {
      status: OrderConfirmationEmailStatus;
      sentAt: Date | null;
      providerMessageId: string | null;
      lastError: string | null;
    };
  };
  // Optional: orders placed before Phase 11 never had this field written — see `toAdminOrderDetail`.
  analytics?: {
    metaPurchase: { status: MetaPurchaseStatus; eventId: string | null; sentAt: Date | null };
  };
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_ORDER_NOTIFICATIONS: NonNullable<OrderRecord["notifications"]> = {
  orderConfirmationEmail: { status: "not_applicable", sentAt: null, providerMessageId: null, lastError: null },
};

const DEFAULT_ORDER_ANALYTICS: NonNullable<OrderRecord["analytics"]> = {
  metaPurchase: { status: "not_applicable", eventId: null, sentAt: null },
};

const ORDER_NUMBER_SUFFIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ORDER_NUMBER_SUFFIX_LENGTH = 6;
const MAX_ORDER_NUMBER_ATTEMPTS = 5;

function randomOrderSuffix(): string {
  let suffix = "";
  for (let i = 0; i < ORDER_NUMBER_SUFFIX_LENGTH; i++) {
    suffix += ORDER_NUMBER_SUFFIX_CHARS[Math.floor(Math.random() * ORDER_NUMBER_SUFFIX_CHARS.length)];
  }
  return suffix;
}

function todayStamp(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/** Collision-resistant, server-generated, customer-friendly order number (e.g. `RV-20260811-K3F9QZ`) — never the Mongo `_id`. */
export async function generateOrderNumber(): Promise<string> {
  await connectToDatabase();
  const datePart = todayStamp();

  for (let attempt = 0; attempt < MAX_ORDER_NUMBER_ATTEMPTS; attempt++) {
    const candidate = `RV-${datePart}-${randomOrderSuffix()}`;
    const existing = await OrderModel.findOne({ orderNumber: candidate }).lean();
    if (!existing) return candidate;
  }

  throw new Error("Could not generate a unique order number after multiple attempts.");
}

export async function findOrderByIdempotencyKey(idempotencyKey: string): Promise<OrderRecord | null> {
  await connectToDatabase();
  return OrderModel.findOne({ idempotencyKey }).lean<OrderRecord>();
}

export async function findOrderByOrderNumber(orderNumber: string): Promise<OrderRecord | null> {
  await connectToDatabase();
  return OrderModel.findOne({ orderNumber }).lean<OrderRecord>();
}

/** Every order placed while signed in as this user — newest first. Guest orders (`customerUserId: null`) never match. */
export async function getOrdersForCustomer(userId: string): Promise<OrderRecord[]> {
  await connectToDatabase();
  return OrderModel.find({ customerUserId: userId }).sort({ createdAt: -1 }).lean<OrderRecord[]>();
}

/** Ownership-scoped read for `/account/orders/[orderNumber]` — returns `null` if the order doesn't exist *or* belongs to a different user, so a caller can't distinguish the two. */
export async function getOrderForCustomerDetail(orderNumber: string, userId: string): Promise<OrderRecord | null> {
  await connectToDatabase();
  return OrderModel.findOne({ orderNumber, customerUserId: userId }).lean<OrderRecord>();
}

export interface InsertOrderInput {
  orderNumber: string;
  idempotencyKey: string;
  customerUserId: string | null;
  customer: Order["customer"];
  shippingAddress: Order["shippingAddress"];
  items: Order["items"];
  pricing: Order["pricing"];
  payment: Order["payment"];
}

/**
 * Throws Mongo's raw duplicate-key error (code 11000) on an `idempotencyKey`
 * race — the caller (the `createOrder` Server Action) is responsible for
 * catching that and re-fetching the already-created order instead of
 * surfacing it as a failure.
 */
export async function insertOrder(input: InsertOrderInput): Promise<OrderRecord> {
  await connectToDatabase();
  const now = new Date();
  const statusHistory = [{ status: "pending" as OrderStatus, changedAt: now, changedBy: null }];
  // "pending" (not "not_applicable") the moment an email address exists, written before the actual
  // send is even attempted — see the doc comment on `orderNotificationsSchema` in `src/models/Order.ts`.
  const notifications: NonNullable<OrderRecord["notifications"]> = {
    orderConfirmationEmail: {
      status: input.customer.email ? "pending" : "not_applicable",
      sentAt: null,
      providerMessageId: null,
      lastError: null,
    },
  };
  // "pending" (not "not_applicable") the moment Meta CAPI is configured, mirroring
  // `orderConfirmationEmail`'s pattern above — `eventId` is always the deterministic
  // `purchase:{orderNumber}` value regardless of whether the send is even attempted, so an admin
  // can always cross-reference Events Manager once CAPI is configured later.
  const analytics: NonNullable<OrderRecord["analytics"]> = {
    metaPurchase: {
      status: isMetaCapiConfigured() ? "pending" : "not_applicable",
      eventId: purchaseEventId(input.orderNumber),
      sentAt: null,
    },
  };
  await OrderModel.create({ ...input, orderStatus: "pending", statusHistory, notifications, analytics });
  return { ...input, orderStatus: "pending", statusHistory, notifications, analytics, createdAt: now, updatedAt: now };
}

/**
 * Records the outcome of the one order-confirmation-email attempt
 * (`src/actions/orders.ts`'s `after()` callback calls this right after
 * `sendOrderConfirmationEmail` resolves). Never throws — a failure to
 * record the outcome must not surface as anything the customer sees, since
 * this always runs after the order response has already been returned.
 */
export async function recordOrderConfirmationEmailResult(
  orderNumber: string,
  result: { status: "sent" | "failed"; providerMessageId?: string | null; lastError?: string | null },
): Promise<void> {
  await connectToDatabase();
  await OrderModel.updateOne(
    { orderNumber },
    {
      $set: {
        "notifications.orderConfirmationEmail.status": result.status,
        "notifications.orderConfirmationEmail.sentAt": result.status === "sent" ? new Date() : null,
        "notifications.orderConfirmationEmail.providerMessageId": result.providerMessageId ?? null,
        "notifications.orderConfirmationEmail.lastError": result.lastError ?? null,
      },
    },
  );
}

/**
 * Records the outcome of the one Meta CAPI Purchase send attempt (`scheduleMetaPurchaseCapi` in
 * `src/actions/orders.ts`'s `after()` callback calls this right after `sendMetaCapiPurchase`
 * resolves). Never throws, for the same reason `recordOrderConfirmationEmailResult` doesn't — this
 * always runs after the order response has already gone back to the browser.
 */
export async function recordMetaPurchaseResult(orderNumber: string, result: { status: "sent" | "failed" }): Promise<void> {
  await connectToDatabase();
  await OrderModel.updateOne(
    { orderNumber },
    {
      $set: {
        "analytics.metaPurchase.status": result.status,
        "analytics.metaPurchase.sentAt": result.status === "sent" ? new Date() : null,
      },
    },
  );
}

/** Sanitized projection for the success page / post-creation response — no Mongo `_id`, no `idempotencyKey`, no `statusHistory`. */
export function toOrderSummary(record: OrderRecord): OrderSummary {
  return {
    orderNumber: record.orderNumber,
    customer: record.customer,
    shippingAddress: record.shippingAddress,
    items: record.items,
    pricing: record.pricing,
    payment: record.payment,
    orderStatus: record.orderStatus,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/** Row projection for `/account/orders` — just enough to list, never the full item/address detail. */
export function toOrderListItem(record: OrderRecord): OrderListItem {
  return {
    orderNumber: record.orderNumber,
    createdAt: record.createdAt.toISOString(),
    orderStatus: record.orderStatus,
    paymentStatus: record.payment.status,
    total: record.pricing.total,
    itemCount: record.items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

/** Even more restricted projection for `/track-order` — no transactionId, no full address, no Mongo `_id`. */
export function toTrackingSummary(record: OrderRecord): OrderTrackingSummary {
  return {
    orderNumber: record.orderNumber,
    customerName: record.customer.name,
    orderStatus: record.orderStatus,
    payment: { method: record.payment.method, status: record.payment.status },
    pricing: record.pricing,
    items: record.items.map((item) => ({ titleSnapshot: item.titleSnapshot, quantity: item.quantity, lineTotal: item.lineTotal })),
    shippingAreaSummary: {
      division: record.shippingAddress.division,
      district: record.shippingAddress.district,
      upazila: record.shippingAddress.upazila,
    },
    createdAt: record.createdAt.toISOString(),
  };
}

/**
 * Full detail for `/admin/orders/[orderNumber]` — the one place `statusHistory`/`customerUserId`/
 * `idempotencyKey` are ever returned. `record.statusHistory` can be `undefined` for any order
 * placed before this field was added to the schema — Mongoose's `default: []` only applies on
 * document creation, not to a `.lean()` read of a pre-existing document that never had the field
 * — so this defaults to `[]` rather than assuming every historical order already has it.
 */
export function toAdminOrderDetail(record: OrderRecord): AdminOrderDetail {
  const notifications = record.notifications ?? DEFAULT_ORDER_NOTIFICATIONS;
  const analytics = record.analytics ?? DEFAULT_ORDER_ANALYTICS;
  return {
    orderNumber: record.orderNumber,
    idempotencyKey: record.idempotencyKey,
    customerUserId: record.customerUserId,
    customer: record.customer,
    shippingAddress: record.shippingAddress,
    items: record.items,
    pricing: record.pricing,
    payment: record.payment,
    orderStatus: record.orderStatus,
    statusHistory: (record.statusHistory ?? []).map((entry) => ({ ...entry, changedAt: entry.changedAt.toISOString() })),
    notifications: {
      orderConfirmationEmail: {
        ...notifications.orderConfirmationEmail,
        sentAt: notifications.orderConfirmationEmail.sentAt ? notifications.orderConfirmationEmail.sentAt.toISOString() : null,
      },
    },
    analytics: {
      metaPurchase: {
        ...analytics.metaPurchase,
        sentAt: analytics.metaPurchase.sentAt ? analytics.metaPurchase.sentAt.toISOString() : null,
      },
    },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toAdminOrderListItem(record: OrderRecord): AdminOrderListItem {
  return {
    orderNumber: record.orderNumber,
    createdAt: record.createdAt.toISOString(),
    customerName: record.customer.name,
    customerPhone: record.customer.phone,
    itemCount: record.items.reduce((sum, item) => sum + item.quantity, 0),
    total: record.pricing.total,
    paymentMethod: record.payment.method,
    paymentStatus: record.payment.status,
    orderStatus: record.orderStatus,
  };
}

export interface AdminOrderListParams {
  page?: number;
  pageSize?: number;
  /** Matches order number (prefix), customer name, or customer phone. */
  search?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminOrderListResult {
  orders: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Server-side paginated/filtered/searched order list for `/admin/orders` — never loads the full table into memory. */
export async function listOrdersForAdmin(params: AdminOrderListParams): Promise<AdminOrderListResult> {
  await connectToDatabase();

  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
  const page = Math.max(params.page ?? 1, 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (params.orderStatus) filter.orderStatus = params.orderStatus;
  if (params.paymentStatus) filter["payment.status"] = params.paymentStatus;
  if (params.paymentMethod) filter["payment.method"] = params.paymentMethod;

  if (params.dateFrom || params.dateTo) {
    filter.createdAt = {};
    if (params.dateFrom) filter.createdAt.$gte = new Date(params.dateFrom);
    if (params.dateTo) {
      const end = new Date(params.dateTo);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const search = params.search?.trim();
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");
    filter.$or = [{ orderNumber: pattern }, { "customer.name": pattern }, { "customer.phone": pattern }];
  }

  const [records, total] = await Promise.all([
    OrderModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<OrderRecord[]>(),
    OrderModel.countDocuments(filter),
  ]);

  return {
    orders: records.map(toAdminOrderListItem),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Appends a `statusHistory` entry and updates `orderStatus` atomically.
 * Caller (`adminUpdateOrderStatus`) is responsible for validating the
 * transition against `ORDER_STATUS_TRANSITIONS` first — this only persists
 * whatever it's given. Returns `null` if the order doesn't exist.
 */
export async function updateOrderStatusForAdmin(orderNumber: string, newStatus: OrderStatus, adminUserId: string): Promise<OrderRecord | null> {
  await connectToDatabase();
  const doc = await OrderModel.findOneAndUpdate(
    { orderNumber },
    {
      $set: { orderStatus: newStatus },
      $push: { statusHistory: { status: newStatus, changedAt: new Date(), changedBy: adminUserId } },
    },
    { returnDocument: "after" },
  ).lean<OrderRecord>();
  return doc;
}

/** Sets `payment.status` only — used by the /admin/payments verification queue (Mark Paid / Mark Failed). Returns `null` if the order doesn't exist. */
export async function updatePaymentStatusForAdmin(orderNumber: string, newPaymentStatus: PaymentStatus): Promise<OrderRecord | null> {
  await connectToDatabase();
  const doc = await OrderModel.findOneAndUpdate({ orderNumber }, { $set: { "payment.status": newPaymentStatus } }, { returnDocument: "after" }).lean<OrderRecord>();
  return doc;
}

/** Row projection for /admin/payments — `AdminOrderListItem` plus the manual-payment `transactionId` an admin actually needs to verify against their bKash/Nagad/Rocket dashboard. */
export type AdminPaymentQueueItem = AdminOrderListItem & { transactionId: string | null };

/** Manual-method orders still awaiting verification — `/admin/payments`'s queue. COD is never included (it has its own `cod_pending` status, verified at delivery, not here). */
export async function getPendingVerificationOrders(): Promise<AdminPaymentQueueItem[]> {
  await connectToDatabase();
  const records = await OrderModel.find({ "payment.status": "pending_verification" }).sort({ createdAt: 1 }).lean<OrderRecord[]>();
  return records.map((record) => ({ ...toAdminOrderListItem(record), transactionId: record.payment.transactionId }));
}

export interface OrderDashboardStats {
  ordersToday: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  returned: number;
  pendingVerification: number;
  /**
   * Sum of `pricing.total` for orders that are either manually verified
   * paid (`payment.status: "paid"` — bKash/Nagad/Rocket) or `delivered`
   * (the current system has no separate "COD cash collected" signal, so
   * `delivered` is used as the conservative proxy for a completed COD
   * sale — this excludes every `pending`/`confirmed`/`processing`/
   * `shipped`/`cancelled`/`returned` order and every unverified manual
   * payment, deliberately erring toward undercounting rather than
   * counting revenue that hasn't actually landed). Revisit once a real
   * "COD collected at delivery" confirmation step exists.
   */
  revenueToday: number;
  revenueThisMonth: number;
}

/** Powers `/admin`'s dashboard cards — one aggregation pass rather than N separate `countDocuments` calls. */
export async function getOrderDashboardStats(): Promise<OrderDashboardStats> {
  await connectToDatabase();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [statusCounts, pendingVerification, revenueTodayAgg, revenueMonthAgg, ordersTodayCount] = await Promise.all([
    OrderModel.aggregate<{ _id: OrderStatus; count: number }>([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
    OrderModel.countDocuments({ "payment.status": "pending_verification" }),
    OrderModel.aggregate<{ _id: null; total: number }>([
      { $match: { $or: [{ "payment.status": "paid" }, { orderStatus: "delivered" }], createdAt: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: "$pricing.total" } } },
    ]),
    OrderModel.aggregate<{ _id: null; total: number }>([
      { $match: { $or: [{ "payment.status": "paid" }, { orderStatus: "delivered" }], createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$pricing.total" } } },
    ]),
    OrderModel.countDocuments({ createdAt: { $gte: startOfToday } }),
  ]);

  const countByStatus = Object.fromEntries(statusCounts.map((entry) => [entry._id, entry.count])) as Partial<Record<OrderStatus, number>>;

  return {
    ordersToday: ordersTodayCount,
    pending: countByStatus.pending ?? 0,
    confirmed: countByStatus.confirmed ?? 0,
    processing: (countByStatus.processing ?? 0) + (countByStatus.supplier_submitted ?? 0),
    shipped: countByStatus.shipped ?? 0,
    delivered: countByStatus.delivered ?? 0,
    cancelled: countByStatus.cancelled ?? 0,
    returned: countByStatus.returned ?? 0,
    pendingVerification,
    revenueToday: revenueTodayAgg[0]?.total ?? 0,
    revenueThisMonth: revenueMonthAgg[0]?.total ?? 0,
  };
}

/** Newest N orders for the dashboard's "Recent Orders" panel. */
export async function getRecentOrdersForAdmin(limit = 8): Promise<AdminOrderListItem[]> {
  await connectToDatabase();
  const records = await OrderModel.find().sort({ createdAt: -1 }).limit(limit).lean<OrderRecord[]>();
  return records.map(toAdminOrderListItem);
}

export interface TopSellingProduct {
  productId: string;
  slug: string;
  title: string;
  unitsSold: number;
  revenue: number;
}

/**
 * Ranks products by units sold across every order item, read directly from
 * each order's `titleSnapshot`/`slug` (no join back to the live `Product`
 * collection needed — and a good thing, since a product could since have
 * been renamed or deleted). Excludes `cancelled` orders only — a `pending`/
 * `processing` order still represents real demand, but a cancelled one
 * never became a sale. Powers the dashboard's "Top Products" panel and
 * /admin/analytics.
 */
export async function getTopSellingProducts(limit = 5): Promise<TopSellingProduct[]> {
  await connectToDatabase();
  const rows = await OrderModel.aggregate<{ _id: string; slug: string; title: string; unitsSold: number; revenue: number }>([
    { $match: { orderStatus: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        slug: { $first: "$items.slug" },
        title: { $first: "$items.titleSnapshot" },
        unitsSold: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.lineTotal" },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: limit },
  ]);

  return rows.map((row) => ({ productId: row._id, slug: row.slug, title: row.title, unitsSold: row.unitsSold, revenue: row.revenue }));
}

export interface DailySales {
  /** `YYYY-MM-DD`, local server date. */
  date: string;
  orderCount: number;
  revenue: number;
}

/**
 * One bucket per day for the last `days` days (including days with zero
 * orders, so a chart never has to guess about a gap). `revenue` here uses
 * the same conservative "paid or delivered" definition as
 * `getOrderDashboardStats` — see that function's doc comment.
 */
export async function getSalesByDay(days = 14): Promise<DailySales[]> {
  await connectToDatabase();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rangeStart = new Date(startOfToday);
  rangeStart.setDate(rangeStart.getDate() - (days - 1));

  const rows = await OrderModel.aggregate<{ _id: string; orderCount: number; revenue: number }>([
    { $match: { $or: [{ "payment.status": "paid" }, { orderStatus: "delivered" }], createdAt: { $gte: rangeStart } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        orderCount: { $sum: 1 },
        revenue: { $sum: "$pricing.total" },
      },
    },
  ]);
  const byDate = new Map(rows.map((row) => [row._id, row]));

  const buckets: DailySales[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(rangeStart);
    day.setDate(day.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    const row = byDate.get(key);
    buckets.push({ date: key, orderCount: row?.orderCount ?? 0, revenue: row?.revenue ?? 0 });
  }
  return buckets;
}

export interface AverageOrderValueResult {
  averageOrderValue: number;
  orderCount: number;
}

/** Average `pricing.total` across the same "paid or delivered" order population used everywhere else revenue is computed — never averages in an order whose payment was never actually confirmed. */
export async function getAverageOrderValue(): Promise<AverageOrderValueResult> {
  await connectToDatabase();
  const rows = await OrderModel.aggregate<{ _id: null; orderCount: number; total: number }>([
    { $match: { $or: [{ "payment.status": "paid" }, { orderStatus: "delivered" }] } },
    { $group: { _id: null, orderCount: { $sum: 1 }, total: { $sum: "$pricing.total" } } },
  ]);
  const row = rows[0];
  if (!row || row.orderCount === 0) return { averageOrderValue: 0, orderCount: 0 };
  return { averageOrderValue: row.total / row.orderCount, orderCount: row.orderCount };
}

/** Count of distinct signed-in customers (`customerUserId` not null) with more than one order — guest orders never count, since there's no stable identity to dedupe them by. */
export async function getRepeatCustomerCount(): Promise<number> {
  await connectToDatabase();
  const rows = await OrderModel.aggregate<{ repeatCustomers: number }>([
    { $match: { customerUserId: { $ne: null } } },
    { $group: { _id: "$customerUserId", count: { $sum: 1 } } },
    { $match: { count: { $gte: 2 } } },
    { $count: "repeatCustomers" },
  ]);
  return rows[0]?.repeatCustomers ?? 0;
}
