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
    // Phase 12: optional internal note attached to this specific transition (e.g. "customer
    // confirmed via WhatsApp", "unreachable after 3 attempts") — admin-only, never shown to the
    // customer (see `toOrderSummary`/`toTrackingSummary`, which omit `statusHistory` entirely).
    note: { type: String, default: null },
  },
  { _id: false },
);

/**
 * Phase 12: set when an order transitions `pending` -> `confirmed`. Phone OTP verification
 * remains deferred (see CLAUDE.md's Phase 10.5 section) — this instead records how staff
 * confirmed the order was genuine (phone call or WhatsApp), matching the existing manual
 * confirmation workflow. `confirmedBy` (admin user id) and `note` are admin-only; `method`/
 * `confirmedAt` are customer-safe (surfaced on the tracking timeline).
 */
const orderConfirmationSchema = new Schema(
  {
    method: { type: String, enum: ["phone", "whatsapp", "none"], default: "none" },
    confirmedAt: { type: Date, default: null },
    confirmedBy: { type: String, default: null },
    note: { type: String, default: null },
  },
  { _id: false },
);

/**
 * Phase 12: set when an order transitions to `cancelled`. `reason` is a fixed internal code (never
 * a free-text customer-facing claim) and, together with `note`, is admin-only — the customer only
 * ever sees the neutral "Cancelled" status label (see CLAUDE.md's "Cancellation flow" section for
 * why no reason is ever exposed).
 */
const orderCancellationSchema = new Schema(
  {
    reason: {
      type: String,
      enum: ["customer_request", "unreachable", "out_of_stock", "invalid_order", "payment_failed", "duplicate", "other"],
      default: null,
    },
    note: { type: String, default: null },
  },
  { _id: false },
);

/**
 * Phase 12: set when an order transitions to `returned`. `resellable` decides whether
 * `src/services/inventory.ts` restores stock — a damaged/lost return must never silently re-enter
 * sellable inventory. Admin-only, same reasoning as `orderCancellationSchema`.
 */
const orderReturnSchema = new Schema(
  {
    reason: { type: String, enum: ["damaged", "wrong_item", "customer_return", "delivery_failure", "other"], default: null },
    resellable: { type: Boolean, default: null },
    note: { type: String, default: null },
  },
  { _id: false },
);

/**
 * Phase 12: courier/shipment readiness — fields only, no courier API integration yet (see
 * CLAUDE.md's "Courier readiness" section). `provider` is a free-text label deliberately, not an
 * enum, so no single Bangladesh courier (Pathao/Steadfast/RedX/Paperfly) is hardcoded as mandatory.
 * Fully customer-safe — surfaced on the tracking timeline when present.
 */
const orderCourierSchema = new Schema(
  {
    provider: { type: String, default: null },
    trackingId: { type: String, default: null },
    trackingUrl: { type: String, default: null },
    consignmentId: { type: String, default: null },
    shippedAt: { type: Date, default: null },
  },
  { _id: false },
);

/**
 * Phase 10.5: tracks the one order-confirmation email attempt for this
 * order — never a queue, never retried automatically (see
 * `src/lib/email-provider.ts`/`src/actions/orders.ts`). `"not_applicable"`
 * (the default) means the customer never supplied an email at checkout, so
 * no send was ever attempted; `"pending"` is set synchronously right after
 * order insert (before the actual send is attempted, via Next's `after()`)
 * so a crash between insert and send still leaves a visible, honest trail
 * for admin troubleshooting rather than silence. `providerMessageId` is
 * Resend's own email id — logged for support/troubleshooting, never
 * returned to the customer (see `toOrderSummary`, which omits this whole
 * subdocument).
 */
const emailAttemptSchema = {
  status: { type: String, enum: ["not_applicable", "pending", "sent", "failed"], default: "not_applicable" },
  sentAt: { type: Date, default: null },
  providerMessageId: { type: String, default: null },
  lastError: { type: String, default: null },
};

const orderNotificationsSchema = new Schema(
  {
    orderConfirmationEmail: emailAttemptSchema,
    // Phase 12: one attempt-tracking record per status-change email, same shape/semantics as
    // `orderConfirmationEmail` above — `"not_applicable"` until that specific status is actually
    // reached (a `returned` order was never `shipped` a second time, etc.), never a queue, never
    // auto-retried. Keyed by the exact `OrderStatus` string that triggers the send (see
    // `src/actions/admin/orders.ts`'s `STATUS_EMAIL_TEMPLATES` map) — only `confirmed`/`shipped`/
    // `delivered`/`cancelled`/`returned` ever populate; `pending`/`processing`/`supplier_submitted`
    // deliberately send no email (see CLAUDE.md's "Customer emails" note — not every minor internal
    // status update is worth an email).
    statusEmails: {
      confirmed: emailAttemptSchema,
      shipped: emailAttemptSchema,
      delivered: emailAttemptSchema,
      cancelled: emailAttemptSchema,
      returned: emailAttemptSchema,
    },
  },
  { _id: false },
);

/**
 * Phase 11: tracks the one Meta Conversions API Purchase send attempt for this order — mirrors
 * `orderNotificationsSchema` exactly (`"not_applicable"` means Meta CAPI wasn't configured at
 * order-creation time, so no send was ever attempted; distinct from `"failed"`, a real attempt
 * that didn't reach Meta). `eventId` is always the deterministic `purchase:{orderNumber}` value
 * (see `src/lib/analytics/event-id.ts`) — stored so an admin can cross-reference this order against
 * Meta Events Manager, not because it's ever unpredictable. Never stores request/response bodies,
 * access tokens, or hashed customer data — this is a status record, not an event log.
 */
const orderAnalyticsSchema = new Schema(
  {
    metaPurchase: {
      status: { type: String, enum: ["not_applicable", "pending", "sent", "failed"], default: "not_applicable" },
      eventId: { type: String, default: null },
      sentAt: { type: Date, default: null },
    },
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
    notifications: { type: orderNotificationsSchema, default: () => ({}) },
    analytics: { type: orderAnalyticsSchema, default: () => ({}) },

    confirmation: { type: orderConfirmationSchema, default: () => ({}) },
    cancellation: { type: orderCancellationSchema, default: () => ({}) },
    return: { type: orderReturnSchema, default: () => ({}) },
    courier: { type: orderCourierSchema, default: () => ({}) },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });

export type OrderDocument = InferSchemaType<typeof orderSchema>;

export const OrderModel: Model<OrderDocument> = models.Order ?? model<OrderDocument>("Order", orderSchema);
