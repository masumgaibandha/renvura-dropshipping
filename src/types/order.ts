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
  createdAt: string;
  updatedAt: string;
}

/** Sanitized projection returned to the client after order creation and shown on `/order-success/[orderNumber]` — no Mongo `_id`, no `idempotencyKey`, no `customerUserId` (an internal linkage field, not useful to expose even for the order's own owner). */
export type OrderSummary = Omit<Order, "idempotencyKey" | "customerUserId">;

/** Lightweight projection for `/account/orders` — one row per order, newest first. */
export interface OrderListItem {
  orderNumber: string;
  createdAt: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  itemCount: number;
}

/** Even more restricted projection for `/track-order` — no transactionId, no full address (division/district/upazila only). */
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
  createdAt: string;
}
