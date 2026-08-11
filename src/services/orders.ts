import { connectToDatabase } from "@/lib/db";
import { OrderModel } from "@/models/Order";
import type { Order, OrderSummary, OrderTrackingSummary } from "@/types/order";

/**
 * Order data-access layer — mirrors `src/services/products.ts`'s role.
 * Every exported function calls `connectToDatabase()` itself so a caller
 * can never accidentally skip it.
 */

/** What comes back from Mongo — same shape as `Order` minus `idempotencyKey`'s absence-in-summaries concern; dates are real `Date`s here, ISO strings only at the summary boundary. */
interface OrderRecord extends Omit<Order, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

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

export interface InsertOrderInput {
  orderNumber: string;
  idempotencyKey: string;
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
  await OrderModel.create({ ...input, orderStatus: "pending" });
  return { ...input, orderStatus: "pending", createdAt: now, updatedAt: now };
}

/** Sanitized projection for the success page / post-creation response — no Mongo `_id`, no `idempotencyKey`. */
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
