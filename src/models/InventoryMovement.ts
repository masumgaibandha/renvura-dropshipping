import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Phase 12: append-only audit trail of every automatic (order-driven) stock adjustment — never
 * mutated/deleted. Distinct from `AdminAuditLog` (which already records the *admin action* that
 * triggered a change, e.g. `order.status_changed`) — this is the inventory-specific ledger a
 * future stock-reconciliation report would read, capturing the exact quantity delta per product
 * per movement, not just a before/after snapshot of the order. See `src/services/inventory.ts`,
 * the only writer.
 */
const inventoryMovementSchema = new Schema(
  {
    // Product slug — same identity convention as everywhere else in this codebase (see Product.ts).
    productId: { type: String, required: true, index: true },
    // Negative for a decrement (order confirmed), positive for a restore (cancelled/returned order).
    quantityDelta: { type: Number, required: true },
    reason: {
      type: String,
      enum: ["order_confirmed", "order_cancelled_restore", "order_returned_restore", "admin_adjustment"],
      required: true,
    },
    // Null for a manual admin adjustment (which already has its own AdminAuditLog entry via
    // adminAdjustStock) — only order-driven movements carry an orderNumber.
    orderNumber: { type: String, default: null, index: true },
    // Admin user id, or "system" for a movement with no human actor.
    actorUserId: { type: String, required: true },
  },
  { timestamps: true },
);

inventoryMovementSchema.index({ createdAt: -1 });

export type InventoryMovementDocument = InferSchemaType<typeof inventoryMovementSchema>;

export const InventoryMovementModel: Model<InventoryMovementDocument> =
  models.InventoryMovement ?? model<InventoryMovementDocument>("InventoryMovement", inventoryMovementSchema);
