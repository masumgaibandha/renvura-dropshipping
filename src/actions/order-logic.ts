import { getProductById } from "@/services/products";
import { calculateDeliveryFee } from "@/utils/delivery";
import type { OrderItem, OrderPricing } from "@/types/order";

/**
 * The security-critical part of order creation, deliberately kept free of
 * any DB/`"use server"` dependency: it only reads the static, server-only
 * product catalog (`src/services/products.ts` — never client-bundled) and
 * pure math. This is what lets it be exercised by an isolated script
 * without a live MongoDB connection. `src/actions/orders.ts` wraps this
 * with the DB-touching steps (idempotency check, insert).
 *
 * Client-submitted price/subtotal/total values are never read here — only
 * `productId` and `quantity` come from the client; every price is looked
 * up fresh from the server-side catalog.
 */

export const MAX_QUANTITY_PER_ITEM = 20;
export const MAX_UNIQUE_ITEMS = 30;

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export type RecalculateOrderResult = { ok: true; items: OrderItem[]; pricing: OrderPricing } | { ok: false; error: string };

export function recalculateOrder(items: OrderItemInput[], district: string): RecalculateOrderResult {
  if (items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }
  if (items.length > MAX_UNIQUE_ITEMS) {
    return { ok: false, error: `A single order can contain at most ${MAX_UNIQUE_ITEMS} different products.` };
  }

  const resolvedItems: OrderItem[] = [];

  for (const line of items) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY_PER_ITEM) {
      return { ok: false, error: `Quantity must be between 1 and ${MAX_QUANTITY_PER_ITEM}.` };
    }

    const product = getProductById(line.productId);
    if (!product) {
      return { ok: false, error: "One of the items in your cart is no longer available." };
    }

    const isPurchasable = product.pricing.sellingPrice !== null && product.inventory.status !== "out_of_stock";
    if (!isPurchasable || product.pricing.sellingPrice === null) {
      return { ok: false, error: `"${product.title}" is not currently available for purchase.` };
    }

    if (product.inventory.stock !== null && line.quantity > product.inventory.stock) {
      return { ok: false, error: `Only ${product.inventory.stock} of "${product.title}" ${product.inventory.stock === 1 ? "is" : "are"} available.` };
    }

    const unitPrice = product.pricing.sellingPrice;
    const lineTotal = unitPrice * line.quantity;

    resolvedItems.push({
      productId: product.id,
      slug: product.slug,
      titleSnapshot: product.title,
      imageSnapshot: product.media.thumbnail ?? product.media.images[0] ?? null,
      unitPrice,
      quantity: line.quantity,
      lineTotal,
    });
  }

  const subtotal = resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = calculateDeliveryFee(district);
  const total = subtotal + deliveryFee;

  return { ok: true, items: resolvedItems, pricing: { subtotal, deliveryFee, total } };
}
