"use client";

import { useCart } from "@/contexts/CartContext";

/** Small numeric badge — hidden entirely at 0 rather than showing an empty/zero badge. */
export function CartCountBadge() {
  const { itemCount } = useCart();

  if (itemCount === 0) return null;

  return (
    <span
      aria-hidden="true"
      className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-white"
    >
      {itemCount > 99 ? "99+" : itemCount}
    </span>
  );
}
