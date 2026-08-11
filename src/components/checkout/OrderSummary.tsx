import Image from "next/image";

import { calculateDeliveryFee } from "@/utils/delivery";
import { formatBDT } from "@/utils/currency";
import type { CartItem } from "@/types/cart";

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  district: string;
}

/**
 * Client cart data (`items`/`subtotal`) is display-only — a live estimate,
 * not the authoritative total. `createOrder` recalculates everything
 * server-side from the real catalog; if the server's numbers differ, the
 * server wins (see `/order-success/[orderNumber]`, which only ever shows
 * the server-returned total).
 */
export function OrderSummary({ items, subtotal, district }: OrderSummaryProps) {
  const hasDistrict = district.trim().length > 0;
  const deliveryFee = hasDistrict ? calculateDeliveryFee(district) : null;
  const total = deliveryFee !== null ? subtotal + deliveryFee : null;

  return (
    <div className="h-fit rounded-2xl border border-border bg-surface-soft p-5">
      <h2 className="text-h3 text-foreground">Order Summary</h2>

      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
              {item.image ? <Image src={item.image} alt={item.title} fill sizes="56px" className="object-contain" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-small font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-foreground/70">Qty {item.quantity}</p>
            </div>
            <span className="shrink-0 text-small font-semibold tabular-nums text-foreground">{formatBDT(item.sellingPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 border-t border-border pt-4 text-small">
        <div className="flex justify-between text-foreground/70">
          <dt>Subtotal</dt>
          <dd className="tabular-nums text-foreground">{formatBDT(subtotal)}</dd>
        </div>
        <div className="flex justify-between text-foreground/70">
          <dt>Delivery</dt>
          <dd className="tabular-nums text-foreground">{deliveryFee !== null ? formatBDT(deliveryFee) : "Enter district to estimate"}</dd>
        </div>
      </dl>

      <div className="mt-3 flex justify-between border-t border-border pt-3 text-body font-semibold text-foreground">
        <span>Total</span>
        <span className="tabular-nums">{total !== null ? formatBDT(total) : "—"}</span>
      </div>
      <p className="mt-1 text-xs text-foreground/70">Estimated — final total confirmed when your order is placed.</p>
    </div>
  );
}
