"use client";

import Image from "next/image";
import Link from "next/link";

import { QuantitySelector } from "@/components/product/QuantitySelector";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/layout/Container";
import { useCart } from "@/contexts/CartContext";
import { formatBDT } from "@/utils/currency";

const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: "Cart" }];

/**
 * 100% client-side cart state, so this is a Client Component throughout —
 * there's no server data to fetch. Total = Subtotal for now; delivery is
 * "Calculated at checkout," never an invented number. IMPORTANT: this page
 * only ever displays the cart's own stored snapshot — it is not a trusted
 * source for a real order. Phase 8 order creation must re-fetch/validate
 * price and availability from real product data before creating an order.
 */
export default function CartPage() {
  const { items, itemCount, subtotal, isHydrated, removeItem, updateQuantity } = useCart();

  return (
    <Container>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <h1 className="text-h1 text-foreground">Cart</h1>

      {!isHydrated ? null : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-body text-foreground/70">Your cart is empty.</p>
          <Link
            href="/shop"
            className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-small font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.productId} className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-soft sm:size-24">
                  {item.image ? <Image src={item.image} alt={item.title} fill sizes="96px" className="object-contain" /> : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <Link href={`/products/${item.slug}`} className="text-small font-medium hover:text-accent sm:text-body">
                      {item.title}
                    </Link>
                    <p className="mt-1 text-small text-foreground/70">{formatBDT(item.sellingPrice)} each</p>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <QuantitySelector value={item.quantity} onChange={(quantity) => updateQuantity(item.productId, quantity)} max={item.maxQuantity} />
                    <div className="flex items-center gap-4">
                      <span className="text-small font-semibold tabular-nums text-foreground">{formatBDT(item.sellingPrice * item.quantity)}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        aria-label={`Remove ${item.title} from cart`}
                        className="text-small text-foreground/70 underline-offset-2 hover:text-accent hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="h-fit rounded-2xl border border-border bg-surface-soft p-5">
            <h2 className="text-h3 text-foreground">Order Summary</h2>
            <dl className="mt-4 space-y-2 text-small">
              <div className="flex justify-between text-foreground/70">
                <dt>
                  Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                </dt>
                <dd className="tabular-nums text-foreground">{formatBDT(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-foreground/70">
                <dt>Delivery</dt>
                <dd>Calculated at checkout</dd>
              </div>
            </dl>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-body font-semibold text-foreground">
              <span>Total</span>
              <span className="tabular-nums">{formatBDT(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-foreground/70">Excludes delivery, calculated at checkout.</p>

            <button
              type="button"
              disabled
              className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-accent text-small font-medium text-white opacity-50"
            >
              Proceed to Checkout
            </button>
            <Link
              href="/shop"
              className="mt-3 flex h-11 w-full items-center justify-center rounded-full border border-border text-small font-medium text-foreground transition-colors hover:border-accent"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </Container>
  );
}
