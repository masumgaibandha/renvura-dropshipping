import { connectToDatabase } from "@/lib/db";
import { InventoryMovementModel } from "@/models/InventoryMovement";
import { ProductModel } from "@/models/Product";

/**
 * Phase 12 order-driven inventory adjustments — decrement on order confirmation, restore on
 * cancellation/resellable return. See CLAUDE.md's "Inventory reservation strategy" section for the
 * full reasoning (decrement at `confirmed`, not at order creation, since most `pending` COD orders
 * are unconfirmed and some are never genuine).
 *
 * Exactly-once guarantee: this module has no idempotency bookkeeping of its own — it relies
 * entirely on `updateOrderStatusForAdmin`'s compare-and-swap (`src/services/orders.ts`, matches on
 * both `orderNumber` AND the expected current `orderStatus`) succeeding first. Because the order
 * status transition graph (`ORDER_STATUS_TRANSITIONS`, `src/types/order.ts`) is a strict DAG — no
 * status is ever revisited once left — a real transition like `pending -> confirmed` can happen at
 * most once in an order's lifetime. `src/actions/admin/orders.ts` only calls into this module after
 * that CAS has already confirmed *this* request was the one that actually performed the
 * transition, so a concurrent duplicate submit (double-click, retry) can never trigger a second
 * decrement/restore for the same order.
 */

export type InventoryMovementReason = "order_confirmed" | "order_cancelled_restore" | "order_returned_restore" | "admin_adjustment";

export interface InventoryMovementItem {
  /** Product slug (`OrderItem.slug`/`productId` — both equal the same value, see `Order.ts`). */
  productId: string;
  quantity: number;
}

/**
 * Applies `quantityDelta` (negative to decrement, positive to restore) to each item's
 * `inventory.stock` via an atomic `$inc` — safe under concurrent order processing without needing
 * a read-modify-write. Products with `inventory.stock: null` (stock not tracked for this product)
 * are skipped entirely — there is nothing to decrement/restore, and forcing a numeric value onto
 * an intentionally-untracked product would fabricate precision the source data never had. Mirrors
 * `adminAdjustStock`'s existing precedent of never touching `inventory.status` — that field stays
 * independently admin-controlled, exactly as it already is everywhere else in this codebase.
 *
 * Never throws — an inventory-adjustment failure must not be allowed to block the order-status
 * transition it's attached to (same non-blocking principle as the order-confirmation email and
 * Meta CAPI Purchase send). Logs and continues on a per-item basis so one bad product doesn't stop
 * the rest of the order's items from being adjusted.
 */
export async function applyInventoryMovements(
  items: InventoryMovementItem[],
  reason: InventoryMovementReason,
  opts: { orderNumber: string | null; actorUserId: string; direction: "decrement" | "restore" },
): Promise<void> {
  await connectToDatabase();
  const sign = opts.direction === "decrement" ? -1 : 1;

  for (const item of items) {
    try {
      const product = await ProductModel.findOne({ slug: item.productId }, { "inventory.stock": 1 }).lean<{ inventory: { stock: number | null } } | null>();
      if (!product || product.inventory.stock === null) {
        continue; // stock not tracked for this product — nothing to adjust.
      }

      const quantityDelta = sign * item.quantity;
      await ProductModel.updateOne({ slug: item.productId }, { $inc: { "inventory.stock": quantityDelta } });
      // Defensive floor — a stock count should never go negative. Low-stakes/best-effort: this is
      // an internal count, not a billing-critical balance, so a brief transient negative value
      // between the $inc above and this cleanup is an accepted tradeoff rather than a reason to
      // introduce a full transactional read-modify-write here.
      await ProductModel.updateOne({ slug: item.productId, "inventory.stock": { $lt: 0 } }, { $set: { "inventory.stock": 0 } });

      await InventoryMovementModel.create({
        productId: item.productId,
        quantityDelta,
        reason,
        orderNumber: opts.orderNumber,
        actorUserId: opts.actorUserId,
      });
    } catch (error) {
      console.error(`applyInventoryMovements: failed to adjust stock for "${item.productId}" (order ${opts.orderNumber ?? "n/a"})`, error);
    }
  }
}

export interface InventoryMovementRecord {
  productId: string;
  quantityDelta: number;
  reason: InventoryMovementReason;
  orderNumber: string | null;
  actorUserId: string;
  createdAt: string;
}

/** Recent movements for a single product — powers a future stock-reconciliation view; not yet surfaced in the admin UI beyond being queryable. */
export async function getRecentInventoryMovements(productId: string, limit = 20): Promise<InventoryMovementRecord[]> {
  await connectToDatabase();
  const docs = await InventoryMovementModel.find({ productId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<{ productId: string; quantityDelta: number; reason: InventoryMovementReason; orderNumber: string | null; actorUserId: string; createdAt: Date }[]>();
  return docs.map((doc) => ({ ...doc, createdAt: doc.createdAt.toISOString() }));
}
