import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const orderCustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, default: null },
  },
  { _id: false },
);

const orderShippingAddressSchema = new Schema(
  {
    division: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    upazila: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    landmark: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { _id: false },
);

const orderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    slug: { type: String, required: true },
    titleSnapshot: { type: String, required: true },
    imageSnapshot: { type: String, default: null },
    // Real sellingPrice at order time — wholesalePrice never appears in this schema.
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderPricingSchema = new Schema(
  {
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderPaymentSchema = new Schema(
  {
    method: { type: String, enum: ["cash_on_delivery", "bkash", "nagad", "rocket"], required: true },
    transactionId: { type: String, default: null },
    status: {
      type: String,
      enum: ["unpaid", "cod_pending", "pending_verification", "paid", "failed", "refunded"],
      required: true,
      index: true,
    },
  },
  { _id: false },
);

/**
 * Phase 10: lightweight audit trail of order-status changes, appended to
 * (never mutated/removed) by `adminUpdateOrderStatus`
 * (`src/actions/admin/orders.ts`). `changedBy` is the admin's Better Auth
 * user id — never the raw session, never a name/email snapshot that could
 * go stale; resolve it against `/admin/customers` if a display name is
 * ever needed. `null` marks the initial `"pending"` status set by
 * `createOrder` itself (no admin involved yet).
 */
const orderStatusHistoryEntrySchema = new Schema(
  {
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "supplier_submitted", "shipped", "delivered", "cancelled", "returned"],
      required: true,
    },
    changedAt: { type: Date, required: true, default: Date.now },
    changedBy: { type: String, default: null },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    // Client-generated, server-enforced-unique — the primary duplicate-submission guard.
    idempotencyKey: { type: String, required: true, unique: true },
    // Better Auth user id, server-derived from the session at creation time — null for guest orders.
    customerUserId: { type: String, default: null, index: true },

    customer: { type: orderCustomerSchema, required: true },
    shippingAddress: { type: orderShippingAddressSchema, required: true },
    items: { type: [orderItemSchema], required: true },
    pricing: { type: orderPricingSchema, required: true },
    payment: { type: orderPaymentSchema, required: true },

    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "processing", "supplier_submitted", "shipped", "delivered", "cancelled", "returned"],
      default: "pending",
      required: true,
      index: true,
    },
    statusHistory: { type: [orderStatusHistoryEntrySchema], default: [] },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });

export type OrderDocument = InferSchemaType<typeof orderSchema>;

export const OrderModel: Model<OrderDocument> = models.Order ?? model<OrderDocument>("Order", orderSchema);
