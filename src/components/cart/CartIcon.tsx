"use client";

import { useCart } from "@/contexts/CartContext";
import { IconBag } from "@/components/ui/icons";
import { CartCountBadge } from "./CartCountBadge";

interface CartIconProps {
  className?: string;
}

/**
 * Header's desktop cart trigger — opens the mini-cart drawer rather than
 * navigating, per the brief. Styled to match IconLinkButton (the generic
 * primitive this replaces here) even though it's a real <button>, not a
 * link — /cart is still reachable via the drawer's "View Cart" button or
 * directly by URL.
 */
export function CartIcon({ className }: CartIconProps) {
  const { itemCount, openDrawer } = useCart();

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={`Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
      className={`relative inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-foreground/80 transition-colors hover:bg-background-secondary hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${className ?? ""}`}
    >
      <IconBag className="size-5" />
      <CartCountBadge />
      <span className="hidden text-small font-medium md:inline">Cart</span>
    </button>
  );
}
