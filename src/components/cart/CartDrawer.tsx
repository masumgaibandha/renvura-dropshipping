"use client";

import { Drawer, useOverlayState } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";

import { QuantitySelector } from "@/components/product/QuantitySelector";
import { IconBag, IconTrash, IconTruck } from "@/components/ui/icons";
import { useCart } from "@/contexts/CartContext";
import { formatBDT } from "@/utils/currency";

/**
 * Mini-cart — opens from CartIcon (header) or after adding an item. Same
 * HeroUI Drawer composed-API pattern as MobileNav.tsx/MobileFilterDrawer.tsx
 * (focus trap, Escape-to-close, focus return all come from react-aria).
 * Fully controlled by CartContext's isDrawerOpen — closing here (Escape,
 * backdrop, the close button) round-trips through onOpenChange so the
 * context always reflects the real state, not just this component's.
 *
 * Phase 24 redesign: a fixed premium panel width on larger viewports
 * (rather than an odd 90vw), full-width on mobile so it reads as a
 * near-full-height sheet with large touch targets, and three distinct
 * footer actions — "Checkout Now" (primary, goes straight to `/checkout`),
 * "View Cart" (secondary, the full `/cart` page), and "Continue Shopping"
 * (closes the drawer, stays on the current page). All purely navigational —
 * no cart/order logic changes here.
 */
export function CartDrawer() {
  const { items, itemCount, subtotal, isDrawerOpen, openDrawer, closeDrawer, removeItem, updateQuantity } = useCart();
  const state = useOverlayState({
    isOpen: isDrawerOpen,
    onOpenChange: (open) => (open ? openDrawer() : closeDrawer()),
  });

  return (
    <Drawer.Root state={state}>
      <Drawer.Trigger className="hidden" />
      <Drawer.Backdrop>
        {/*
          IMPORTANT: width/sizing classes belong on <Drawer.Dialog> (the actual panel), never on
          <Drawer.Content> (the full-viewport `fixed inset-0` positioning wrapper that uses
          `justify-content` to push the dialog to the correct edge). Setting an explicit width on
          Drawer.Content shrinks that positioning box itself — since `inset-0` anchors it from the
          left, the box (and everything inside it) ends up pinned to the LEFT of the screen
          regardless of `placement="right"`, with the dialog merely right-aligned *within that
          shrunken box* rather than at the real right edge of the viewport. Caught by visual QA:
          the drawer was rendering flush-left instead of flush-right.
        */}
        <Drawer.Content placement="right">
          <Drawer.Dialog className="flex h-full w-full max-w-full flex-col bg-surface sm:w-[440px] sm:max-w-[92vw]">
            <Drawer.Header className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="text-h3 text-foreground">
                Your Cart {itemCount > 0 && <span className="text-foreground/60">({itemCount})</span>}
              </p>
              <Drawer.CloseTrigger aria-label="Close cart" />
            </Drawer.Header>

            <Drawer.Body className="flex-1 overflow-y-auto px-5 py-5">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <span className="inline-flex size-14 items-center justify-center rounded-full bg-surface-soft text-foreground/40">
                    <IconBag className="size-6" />
                  </span>
                  <p className="text-body text-foreground/70">Your cart is empty.</p>
                </div>
              ) : (
                <ul className="space-y-5">
                  {items.map((item) => (
                    <li key={item.productId} className="flex gap-4">
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-soft">
                        {item.image ? <Image src={item.image} alt={item.title} fill sizes="80px" className="object-contain" /> : null}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={closeDrawer}
                            className="line-clamp-2 text-small font-medium text-foreground hover:text-accent"
                          >
                            {item.title}
                          </Link>
                          <p className="mt-1 text-small font-semibold tabular-nums text-foreground">{formatBDT(item.sellingPrice)}</p>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <QuantitySelector
                            value={item.quantity}
                            onChange={(quantity) => updateQuantity(item.productId, quantity)}
                            max={item.maxQuantity}
                            className="h-10"
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            aria-label={`Remove ${item.title} from cart`}
                            className="inline-flex size-9 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <IconTrash className="size-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Drawer.Body>

            {items.length > 0 && (
              // IMPORTANT: `items-stretch` is required, not decorative. HeroUI's `.drawer__footer`
              // base style bakes in `flex-row items-center justify-end` (a right-aligned button-row
              // footer). `flex-col` here correctly overrides the direction (Tailwind utilities win
              // via cascade layer ordering), but `align-items: center` has no competing utility in
              // this className, so it applies unopposed — center-aligning (shrink-wrapping) every
              // child to its own content width instead of stretching full-width. Caught by DOM
              // measurement: the CTA buttons below were rendering at ~112px instead of the
              // available ~304px. Never remove `items-stretch` from this element.
              <Drawer.Footer className="flex flex-col items-stretch gap-3 border-t border-border bg-surface px-5 py-4">
                <div className="flex items-center gap-2 text-xs text-foreground/70">
                  <IconTruck className="size-4 shrink-0 text-accent" />
                  Delivery fee is calculated at checkout, based on your location.
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-small font-medium text-foreground/70">Subtotal</span>
                  <span className="text-h3 font-bold tabular-nums text-foreground">{formatBDT(subtotal)}</span>
                </div>

                {/*
                  Explicit two-tier button hierarchy per the cart-drawer CTA fix: Checkout Now
                  (primary, tallest, solid navy, strongest shadow) and View Cart (secondary,
                  slightly shorter, navy-bordered outline — not the neutral border-border/plain-
                  text treatment this used before, which read as a disabled/inert link rather than
                  a real button) are grouped in their own tight stack (gap-2.5 ≈ 10px) so they read
                  as one action unit; Continue Shopping stays outside that group (the outer footer
                  gap-3 ≈ 12px separates it) as a distinctly lower-weight tertiary link.
                */}
                <div className="flex flex-col gap-2.5">
                  <Link
                    href="/checkout"
                    onClick={closeDrawer}
                    className="flex h-13 w-full items-center justify-center rounded-xl bg-accent text-body font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover hover:shadow-md"
                  >
                    Checkout Now
                  </Link>
                  <Link
                    href="/cart"
                    onClick={closeDrawer}
                    className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-accent bg-white text-small font-semibold text-accent transition-colors hover:bg-accent-soft"
                  >
                    View Cart
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={closeDrawer}
                  className="py-1.5 text-center text-xs font-medium text-foreground/60 underline-offset-2 hover:text-accent hover:underline"
                >
                  Continue Shopping
                </button>
              </Drawer.Footer>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}
