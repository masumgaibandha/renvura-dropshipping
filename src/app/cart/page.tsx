"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { QuantitySelector } from "@/components/product/QuantitySelector";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/layout/Container";
import { IconBag, IconTrash, IconTruck } from "@/components/ui/icons";
import { useCart } from "@/contexts/CartContext";
import { cartItemToAnalyticsItem } from "@/lib/analytics/mapping";
import { trackGaViewCart } from "@/lib/analytics/ga4-client";
import { formatBDT } from "@/utils/currency";

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "Cart" }];

/**
 * 100% client-side cart state, so this is a Client Component throughout —
 * there's no server data to fetch. Total = Subtotal for now; delivery is
 * "Calculated at checkout," never an invented number. IMPORTANT: this page
 * only ever displays the cart's own stored snapshot — it is not a trusted
 * source for a real order. `/checkout`'s `createOrder` Server Action
 * re-fetches and validates price/availability from the real product
 * catalog before creating an order — nothing shown here is trusted for that.
 */
export default function CartPage() {
  const { items, itemCount, subtotal, isHydrated, removeItem, updateQuantity } = useCart();
  const hasFiredViewCart = useRef(false);

  useEffect(() => {
    if (!isHydrated || items.length === 0 || hasFiredViewCart.current) return;
    hasFiredViewCart.current = true;
    trackGaViewCart({ items: items.map(cartItemToAnalyticsItem), value: subtotal });
  }, [isHydrated, items, subtotal]);

  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <h1 className="text-h1 text-foreground">Cart</h1>

      {!isHydrated ? null : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-surface-soft text-foreground/40">
            <IconBag className="size-7" />
          </span>
          <p className="text-body text-foreground/70">Your cart is empty.</p>
          <Link
            href="/shop"
            className="inline-flex h-12 items-center rounded-full bg-accent px-7 text-small font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover hover:shadow-md"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        // min-w-0 on both grid children — see CheckoutForm.tsx's identical grid for why this is required, not decorative.
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-10">
          <ul className="min-w-0 space-y-4">
            {items.map((item) => (
              <li key={item.productId} className="flex gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card sm:gap-5 sm:p-5">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-soft sm:size-28">
                  {item.image ? <Image src={item.image} alt={item.title} fill sizes="112px" className="object-contain" /> : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <Link href={`/products/${item.slug}`} className="font-medium text-foreground hover:text-accent sm:text-body">
                      {item.title}
                    </Link>
                    <p className="mt-1 text-small text-foreground/70">{formatBDT(item.sellingPrice)} each</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <QuantitySelector value={item.quantity} onChange={(quantity) => updateQuantity(item.productId, quantity)} max={item.maxQuantity} />
                    <div className="flex items-center gap-3">
                      <span className="text-body font-semibold tabular-nums text-foreground">{formatBDT(item.sellingPrice * item.quantity)}</span>
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
                </div>
              </li>
            ))}
          </ul>

          <div className="h-fit min-w-0 rounded-2xl border border-border bg-surface-soft p-6 lg:sticky lg:top-24">
            <h2 className="text-h3 text-foreground">Order Summary</h2>
            <dl className="mt-4 space-y-2.5 text-small">
              <div className="flex justify-between text-foreground/70">
                <dt>
                  Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                </dt>
                <dd className="tabular-nums text-foreground">{formatBDT(subtotal)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3 text-foreground/70">
                <dt className="flex items-center gap-1.5">
                  <IconTruck className="size-4 shrink-0 text-accent" />
                  Delivery
                </dt>
                <dd className="text-right">Calculated at checkout</dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-between border-t border-border pt-4 text-h3 font-semibold text-foreground">
              <span>Total</span>
              <span className="tabular-nums">{formatBDT(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-foreground/70">Excludes delivery, calculated at checkout.</p>

            <Link
              href="/checkout"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-accent text-small font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover hover:shadow-md"
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/shop"
              className="mt-3 flex h-11 w-full items-center justify-center rounded-full border border-border text-small font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </Container>
  );
}
