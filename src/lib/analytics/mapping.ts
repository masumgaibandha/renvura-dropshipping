import type { CartItem } from "@/types/cart";
import type { OrderItem } from "@/types/order";
import type { PublicProduct } from "@/types/product";
import type { AnalyticsItem } from "./event-types";

/**
 * The one place a Product/CartItem/OrderItem becomes an `AnalyticsItem` — every event-firing
 * component/action goes through one of these instead of building the shape inline, so there is
 * exactly one mapping to fix if the identity/field choice ever changes (see CLAUDE.md's Phase 11
 * "Product identifiers" note).
 *
 * Product identity is the catalog **slug** — stable, human-readable, already the public URL
 * (`/products/{slug}`), and already `=== Product.id` in this codebase (see `src/types/product.ts`).
 * Never the wholesale-price-bearing full `Product`, and never a Mongo `_id`.
 */

/** `null` when the product has no real selling price yet — callers must not fire an event for an unpriced product (see `docs/DESIGN-SYSTEM.md`'s existing "gracefully omit, never fabricate" rule, extended here to analytics). */
export function productToAnalyticsItem(product: PublicProduct, quantity = 1): AnalyticsItem | null {
  if (product.pricing.sellingPrice === null) return null;
  return {
    id: product.slug,
    name: product.title,
    category: product.subcategory ?? product.category,
    price: product.pricing.sellingPrice,
    quantity,
  };
}

export function cartItemToAnalyticsItem(item: CartItem): AnalyticsItem {
  return {
    id: item.slug,
    name: item.title,
    price: item.sellingPrice,
    quantity: item.quantity,
  };
}

/** `OrderItem.unitPrice` is always the real, server-recalculated `sellingPrice` at order time — never a client-submitted value, never `wholesalePrice`. */
export function orderItemToAnalyticsItem(item: OrderItem): AnalyticsItem {
  return {
    id: item.slug,
    name: item.titleSnapshot,
    price: item.unitPrice,
    quantity: item.quantity,
  };
}

export function toMetaContentIds(items: AnalyticsItem[]): string[] {
  return items.map((item) => item.id);
}

export function toMetaContents(items: AnalyticsItem[]): { id: string; quantity: number; item_price: number }[] {
  return items.map((item) => ({ id: item.id, quantity: item.quantity, item_price: item.price }));
}

export interface Ga4Item {
  item_id: string;
  item_name: string;
  item_category?: string;
  price: number;
  quantity: number;
}

export function toGa4Items(items: AnalyticsItem[]): Ga4Item[] {
  return items.map((item) => ({
    item_id: item.id,
    item_name: item.name,
    ...(item.category ? { item_category: item.category } : {}),
    price: item.price,
    quantity: item.quantity,
  }));
}

export function itemsValue(items: AnalyticsItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
