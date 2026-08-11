/**
 * Cart domain model. Deliberately denormalized/minimal — a display
 * snapshot taken at add-time, not a reference to the full `Product`
 * record. `sellingPrice` here is always a real, non-null price (the
 * cart's `addItem` gate enforces this); `wholesalePrice` never appears
 * anywhere in this shape. See docs/ARCHITECTURE.md for the untrusted-
 * client-state rule this implies for a future checkout phase.
 */
export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  image: string | null;
  /** Real selling price at the time this line was added — display only, not a trusted total. */
  sellingPrice: number;
  quantity: number;
  /** Captured once from the real product's verified stock at add-time, if known. */
  maxQuantity?: number | null;
  /** Unused today — no product has real variants yet; reserved for when one does. */
  variantId?: string | null;
}

/** What a caller passes to `addItem` — quantity is supplied separately. */
export type CartItemInput = Omit<CartItem, "quantity">;
