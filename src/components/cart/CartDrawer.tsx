"use client";

import { Drawer, useOverlayState } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";

import { QuantitySelector } from "@/components/product/QuantitySelector";
import { useCart } from "@/contexts/CartContext";
import { formatBDT } from "@/utils/currency";

/**
 * Mini-cart — opens from CartIcon (header) or after adding an item. Same
 * HeroUI Drawer composed-API pattern as MobileNav.tsx/MobileFilterDrawer.tsx
 * (focus trap, Escape-to-close, focus return all come from react-aria).
 * Fully controlled by CartContext's isDrawerOpen — closing here (Escape,
 * backdrop, the close button) round-trips through onOpenChange so the
 * context always reflects the real state, not just this component's.
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
        <Drawer.Content placement="right" className="w-[90vw] max-w-sm">
          <Drawer.Dialog className="flex h-full flex-col">
            <Drawer.Header className="flex items-center justify-between border-b border-border px-4 py-4">
              <p className="text-h3">Cart {itemCount > 0 && `(${itemCount})`}</p>
              <Drawer.CloseTrigger aria-label="Close cart" />
            </Drawer.Header>

            <Drawer.Body className="flex-1 overflow-y-auto px-4 py-4">
              {items.length === 0 ? (
                <p className="py-8 text-center text-small text-foreground/70">Your cart is empty.</p>
              ) : (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li key={item.productId} className="flex gap-3">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-soft">
                        {item.image ? (
                          <Image src={item.image} alt={item.title} fill sizes="64px" className="object-contain" />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link href={`/products/${item.slug}`} onClick={closeDrawer} className="line-clamp-2 text-small font-medium hover:text-accent">
                          {item.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-foreground/70">
                          {formatBDT(item.sellingPrice)} × {item.quantity} = {formatBDT(item.sellingPrice * item.quantity)}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <QuantitySelector
                            value={item.quantity}
                            onChange={(quantity) => updateQuantity(item.productId, quantity)}
                            max={item.maxQuantity}
                            className="h-9"
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            aria-label={`Remove ${item.title} from cart`}
                            className="text-xs text-foreground/70 underline-offset-2 hover:text-accent hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Drawer.Body>

            {items.length > 0 && (
              <Drawer.Footer className="border-t border-border px-4 py-4">
                <div className="mb-3 flex items-center justify-between text-small font-medium">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatBDT(subtotal)}</span>
                </div>
                <Link
                  href="/cart"
                  onClick={closeDrawer}
                  className="flex h-11 items-center justify-center rounded-full bg-accent text-small font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  View Cart
                </Link>
              </Drawer.Footer>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}
