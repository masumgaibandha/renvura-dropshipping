"use client";

import { useWishlist } from "@/contexts/WishlistContext";

/** Small numeric badge — hidden entirely when the wishlist is empty. */
export function WishlistCountBadge() {
  const { count } = useWishlist();

  if (count === 0) return null;

  return (
    <span
      aria-hidden="true"
      className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
