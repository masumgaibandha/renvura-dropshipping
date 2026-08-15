/**
 * Order domain model.
 *
 * Every price field here is a server-recalculated snapshot taken at order
 * creation, never a value trusted from the client cart — see
 * `src/actions/order-schema.ts` for the validate-and-recalculate logic.
 * `wholesalePrice` never appears anywhere in this shape; `unitPrice` is
 * always the real `sellingPrice` at order time, and stays a snapshot
 * (`titleSnapshot`/`imageSnapshot`) so a historical order stays readable
 * even if the product catalog changes later.
 */

export type PaymentMethod = "cash_on_delivery" | "bkash" | "nagad" | "rocket";

export type PaymentStatus = "unpaid" | "cod_pending" | "pending_verification" | "paid" | "failed" | "refunded";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "supplier_submitted"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

/** Customer-facing wording for each `OrderStatus` — `supplier_submitted` is an internal fulfillment
 * detail, never shown verbatim to a customer. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Order Received",
  confirmed: "Confirmed",
  processing: "Processing",
  supplier_submitted: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  cod_pending: "Cash on Delivery",
  pending_verification: "Awaiting Verification",
  paid: "Paid",
  failed: "Payment Failed",
  refunded: "Refunded",
};

/**
 * Phase 10 admin order-status workflow, extended in Phase 12. Deliberately not a free-for-all
 * graph: `cancelled` is reachable from any non-terminal status (orders get cancelled at any stage
 * before delivery), `returned` is reachable from `shipped` (a courier return-to-sender — the
 * package never actually reached the customer) as well as `delivered` (a genuine post-delivery
 * return), and `cancelled`/`returned` are terminal (no further transitions). `processing` can move
 * straight to `shipped`, skipping the internal-only `supplier_submitted` step — not every order
 * needs a recorded "submitted to supplier" milestone. This is a strict DAG: no status is ever
 * revisited once left, which is also what makes the Phase 12 inventory decrement/restore logic
 * (`src/services/inventory.ts`) safe without its own separate idempotency flag — a given real
 * transition can happen at most once per order. `adminUpdateOrderStatus`
 * (`src/actions/admin/orders.ts`) is the only place this is enforced — never trust a
 * client-submitted status string without checking it against this table first.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["supplier_submitted", "shipped", "cancelled"],
  supplier_submitted: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

/** Statuses at/after which inventory has already been decremented for this order (i.e. everything from `confirmed` onward) — used by `src/actions/admin/orders.ts` to decide whether a cancellation needs to restore stock. `pending -> cancelled` never decremented anything, so it's deliberately excluded. */
export const INVENTORY_DECREMENTED_STATUSES: OrderStatus[] = ["confirmed", "processing", "supplier_submitted", "shipped", "delivered"];

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  changedAt: string;
  /** Better Auth admin user id, or `null` for the initial `"pending"` entry `createOrder` sets. */
  changedBy: string | null;
  /** Optional internal note attached to this transition — admin-only, never customer-facing. */
  note: string | null;
}

export interface OrderCustomer {
  name: string;
  /** Normalized to local `01XXXXXXXXX` form — see `src/utils/phone.ts`. */
  phone: string;
  email?: string | null;
}

export interface OrderShippingAddress {
  division: string;
  district: string;
  upazila: string;
  addressLine: string;
  landmark?: string | null;
  notes?: string | null;
}

export interface OrderItem {
  productId: string;
  slug: string;
  titleSnapshot: string;
  imageSnapshot: string | null;
  /** The real `sellingPrice` at order time — never the client's submitted price. */
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderPricing {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export interface OrderPayment {
  method: PaymentMethod;
  /** Required for bkash/nagad/rocket, always null for cash_on_delivery. */
  transactionId: string | null;
  status: PaymentStatus;
}

export type ConfirmationMethod = "phone" | "whatsapp" | "none";

/**
 * Phase 12 — set when an order transitions `pending` -> `confirmed`. Phone OTP verification
 * remains deferred (CLAUDE.md's Phase 10.5 section); this instead records *how* staff confirmed
 * the order was genuine, matching the existing manual phone/WhatsApp confirmation workflow.
 * `confirmedBy`/`note` are admin-only; `method`/`confirmedAt` are customer-safe — see
 * `CustomerOrderConfirmation` below.
 */
export interface OrderConfirmation {
  method: ConfirmationMethod;
  confirmedAt: string | null;
  confirmedBy: string | null;
  note: string | null;
}

/** Customer-safe subset of `OrderConfirmation` — surfaced on the tracking timeline. */
export type CustomerOrderConfirmation = Pick<OrderConfirmation, "method" | "confirmedAt">;

export type CancellationReason = "customer_request" | "unreachable" | "out_of_stock" | "invalid_order" | "payment_failed" | "duplicate" | "other";

/**
 * Phase 12 — set when an order transitions to `cancelled`. Entirely admin-only: the customer only
 * ever sees the neutral "Cancelled" status label, never the internal reason code or note (see
 * CLAUDE.md's "Cancellation flow" section).
 */
export interface OrderCancellation {
  reason: CancellationReason | null;
  note: string | null;
}

export type ReturnReason = "damaged" | "wrong_item" | "customer_return" | "delivery_failure" | "other";

/**
 * Phase 12 — set when an order transitions to `returned`. `resellable` decides whether
 * `src/services/inventory.ts` restores stock. Entirely admin-only, same reasoning as
 * `OrderCancellation`.
 */
export interface OrderReturn {
  reason: ReturnReason | null;
  resellable: boolean | null;
  note: string | null;
}

/** Phase 13 — see `src/lib/courier/types.ts` for the full provider-neutral shape docs. `pathao`/`steadfast` have real (credential-gated) adapters; `redx`/`paperfly`/`other` are recognized labels only; `manual` covers everything else; `null` marks a legacy pre-Phase-13 order. */
export type CourierProviderId = "pathao" | "steadfast" | "redx" | "paperfly" | "other";
export type CourierMode = "api" | "manual";
export type CourierCreationStatus = "not_created" | "creating" | "created" | "failed";
export type NormalizedCourierStatus =
  | "unknown"
  | "pending"
  | "pickup_requested"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "returned"
  | "cancelled";

/**
 * Phase 13 — extended from Phase 12's readiness-only shape now that a real (credential-gated)
 * courier provider integration exists (`src/lib/courier/`). `providerId` is the new controlled
 * identifier; `provider` stays a free-text *display* label for backward compatibility with every
 * Phase 12 order that already has an arbitrary string there (e.g. `"Test Courier"`) — see
 * CLAUDE.md's "Historical data compatibility" note. `mode`/`creationStatus`/`creationError`/
 * `externalOrderId`/`rawStatusCode`/`shipmentCreatedAt`/`lastSyncedAt` are admin-only diagnostic
 * fields, never customer-facing — see `CustomerOrderCourier` below.
 */
export interface OrderCourier {
  providerId: CourierProviderId | null;
  provider: string | null;
  mode: CourierMode | null;
  trackingId: string | null;
  trackingUrl: string | null;
  consignmentId: string | null;
  externalOrderId: string | null;
  creationStatus: CourierCreationStatus;
  creationError: string | null;
  normalizedStatus: NormalizedCourierStatus;
  rawStatusCode: string | null;
  shipmentCreatedAt: string | null;
  shippedAt: string | null;
  lastSyncedAt: string | null;
}

/** Customer-safe subset of `OrderCourier` — surfaced on the tracking timeline/shipped email. Omits every internal diagnostic field (mode, creationStatus/creationError, externalOrderId, rawStatusCode, shipmentCreatedAt, lastSyncedAt) per CLAUDE.md's "Customer tracking page"/"Account order page" rules — no internal API IDs, no provider errors. */
export type CustomerOrderCourier = Pick<OrderCourier, "providerId" | "provider" | "trackingId" | "trackingUrl" | "consignmentId" | "normalizedStatus" | "shippedAt">;

export type OrderConfirmationEmailStatus = "not_applicable" | "pending" | "sent" | "failed";

/**
 * Phase 10.5 — tracks the single order-confirmation-email attempt for this
 * order (`src/lib/email-provider.ts`'s `sendOrderConfirmationEmail`, fired
 * from `createOrder` via `after()`). Admin-only: `providerMessageId` is
 * Resend's internal email id, never customer-facing — see
 * `AdminOrderDetail` vs. `OrderSummary` below.
 */
interface EmailAttemptStatus {
  status: OrderConfirmationEmailStatus;
  sentAt: string | null;
  providerMessageId: string | null;
  lastError: string | null;
}

/** Order statuses that trigger a customer email — deliberately a small subset (see CLAUDE.md's "Customer emails" note: not every minor internal status update is worth an email). */
export type StatusEmailStatus = "confirmed" | "shipped" | "delivered" | "cancelled" | "returned";

export interface OrderNotifications {
  orderConfirmationEmail: EmailAttemptStatus;
  /** Phase 12 — one attempt-tracking record per status-change email, same shape/semantics as `orderConfirmationEmail`. */
  statusEmails: Record<StatusEmailStatus, EmailAttemptStatus>;
}

export type MetaPurchaseStatus = "not_applicable" | "pending" | "sent" | "failed";

/**
 * Phase 11 — tracks the single Meta CAPI Purchase send attempt for this order (see
 * `src/lib/analytics/meta-server.ts`, fired from `createOrder` via `after()`, same structural
 * pattern as `OrderNotifications.orderConfirmationEmail`). Admin-only, like that field — never
 * part of `OrderSummary`.
 */
export interface OrderAnalytics {
  metaPurchase: {
    status: MetaPurchaseStatus;
    eventId: string | null;
    sentAt: string | null;
  };
}

export interface Order {
  orderNumber: string;
  /** Client-generated, server-enforced-unique — prevents duplicate orders from a double submit. */
  idempotencyKey: string;
  /**
   * Better Auth user id, set server-side from the session at order-creation
   * time (`createOrder` in `src/actions/orders.ts`) — `null` for a guest
   * order. Never accepted from the client; there is no field for it in
   * `order-schema.ts`'s input shape.
   */
  customerUserId: string | null;
  customer: OrderCustomer;
  shippingAddress: OrderShippingAddress;
  items: OrderItem[];
  pricing: OrderPricing;
  payment: OrderPayment;
  orderStatus: OrderStatus;
  statusHistory: OrderStatusHistoryEntry[];
  notifications: OrderNotifications;
  analytics: OrderAnalytics;
  confirmation: OrderConfirmation;
  cancellation: OrderCancellation;
  return: OrderReturn;
  courier: OrderCourier;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sanitized projection returned to the client after order creation and shown on
 * `/order-success/[orderNumber]`, `/account/orders/[orderNumber]`, and `/track-order` — no Mongo
 * `_id`, no `idempotencyKey`, no `customerUserId` (an internal linkage field, not useful to expose
 * even for the order's own owner), no `statusHistory` (`changedBy` is an admin user id, never
 * customer-facing, and entries may carry an internal `note`), no `notifications` (Resend's internal
 * message id is admin-only), no `analytics` (Meta's internal send status is admin-only), no
 * `cancellation`/full `return` (internal reason codes/notes — the customer only ever sees the
 * neutral status label, see CLAUDE.md's "Cancellation flow"/"Return flow" sections). `confirmation`
 * is narrowed to its customer-safe subset (`CustomerOrderConfirmation` — method + timestamp only,
 * never the admin id/note); `courier` is narrowed to `CustomerOrderCourier` (Phase 13 — no
 * creation-status/error/raw provider status code/internal IDs, see that type's doc comment).
 */
export type OrderSummary = Omit<
  Order,
  "idempotencyKey" | "customerUserId" | "statusHistory" | "notifications" | "analytics" | "confirmation" | "cancellation" | "return" | "courier"
> & {
  confirmation: CustomerOrderConfirmation;
  courier: CustomerOrderCourier;
};

/** Full admin projection — the only place `statusHistory`/`customerUserId`/`idempotencyKey` are ever returned. See `src/services/orders.ts`'s `toAdminOrderDetail`. */
export type AdminOrderDetail = Order;

/** Row projection for `/admin/orders` — see `src/services/orders.ts`'s `toAdminOrderListItem`. */
export interface AdminOrderListItem {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  itemCount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
}

/** Lightweight projection for `/account/orders` — one row per order, newest first. */
export interface OrderListItem {
  orderNumber: string;
  createdAt: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  itemCount: number;
}

/** Even more restricted projection for `/track-order` — no transactionId, no full address (division/district/upazila only). `confirmation`/`courier` are the same customer-safe shapes `OrderSummary` uses, so both surfaces can share one timeline component. */
export interface OrderTrackingSummary {
  orderNumber: string;
  customerName: string;
  orderStatus: OrderStatus;
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
  };
  pricing: OrderPricing;
  items: Pick<OrderItem, "titleSnapshot" | "quantity" | "lineTotal">[];
  shippingAreaSummary: {
    division: string;
    district: string;
    upazila: string;
  };
  confirmation: CustomerOrderConfirmation;
  courier: CustomerOrderCourier;
  createdAt: string;
}

/**
 * Phase 12 — Bangladesh COD quality metrics for `/admin/analytics` (`src/services/orders.ts`'s
 * `getCodQualityMetrics`). Deliberately excludes `pending` orders from the denominator of every
 * rate below except `receivedCount` itself — a still-pending order hasn't failed anything yet, it
 * just hasn't been acted on; counting it as a cancellation or a non-confirmation would mislabel a
 * normal in-flight state as a failure (see CLAUDE.md's "COD quality metrics" section).
 */
export interface CodQualityMetrics {
  receivedCount: number;
  confirmedCount: number;
  deliveredCount: number;
  cancelledCount: number;
  /** confirmedCount / receivedCount — 0 when receivedCount is 0. */
  confirmationRate: number;
  /** deliveredCount / confirmedCount — 0 when confirmedCount is 0. */
  deliveryRate: number;
  /** cancelledCount / receivedCount — 0 when receivedCount is 0. */
  cancellationRate: number;
}
