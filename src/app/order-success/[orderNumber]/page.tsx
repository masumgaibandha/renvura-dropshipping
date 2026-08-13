import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { paymentMethodLabels } from "@/config/payment";
import { Container } from "@/components/layout/Container";
import { PurchaseTracker } from "@/components/analytics/PurchaseTracker";
import { purchaseEventId } from "@/lib/analytics/event-id";
import { orderItemToAnalyticsItem } from "@/lib/analytics/mapping";
import { findOrderByOrderNumber, toOrderSummary } from "@/services/orders";
import { PAYMENT_STATUS_LABELS } from "@/types/order";
import { formatBDT } from "@/utils/currency";

interface OrderSuccessPageProps {
  params: Promise<{ orderNumber: string }>;
}

export const metadata: Metadata = {
  title: "Order Placed",
  robots: { index: false, follow: false },
};

/**
 * Server Component — looks up the order by its customer-facing
 * `orderNumber` (never the Mongo `_id`). Shows a summarized delivery
 * address (division/district/upazila only, not the full house/road/
 * landmark) and no `idempotencyKey`/transactionId — this URL's only
 * protection is the order number's random suffix, so it stays
 * deliberately restrained about what it reveals, same as `/track-order`.
 */
export default async function OrderSuccessPage({ params }: OrderSuccessPageProps) {
  const { orderNumber } = await params;
  const record = await findOrderByOrderNumber(orderNumber.toUpperCase());

  if (!record) {
    notFound();
  }

  const order = toOrderSummary(record);
  const nextStepMessage =
    order.payment.method === "cash_on_delivery" ? "Payment will be collected on delivery." : "Payment is awaiting verification.";

  return (
    <Container>
      <PurchaseTracker
        eventId={purchaseEventId(order.orderNumber)}
        orderNumber={order.orderNumber}
        items={order.items.map(orderItemToAnalyticsItem)}
        value={order.pricing.total}
        deliveryFee={order.pricing.deliveryFee}
      />

      <div className="mx-auto max-w-xl py-10 text-center">
        <h1 className="text-h1 text-foreground">Order placed successfully</h1>
        <p className="mt-2 text-body text-foreground/70">
          Order number <span className="font-semibold text-foreground">{order.orderNumber}</span>
        </p>
      </div>

      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-6">
        <dl className="grid grid-cols-2 gap-y-3 text-small">
          <dt className="text-foreground/70">Customer</dt>
          <dd className="text-right font-medium text-foreground">{order.customer.name}</dd>

          <dt className="text-foreground/70">Payment Method</dt>
          <dd className="text-right font-medium text-foreground">{paymentMethodLabels[order.payment.method]}</dd>

          <dt className="text-foreground/70">Payment Status</dt>
          <dd className="text-right font-medium text-foreground">{PAYMENT_STATUS_LABELS[order.payment.status]}</dd>

          <dt className="text-foreground/70">Order Total</dt>
          <dd className="text-right font-semibold tabular-nums text-foreground">{formatBDT(order.pricing.total)}</dd>

          <dt className="text-foreground/70">Delivery Address</dt>
          <dd className="text-right font-medium text-foreground">
            {order.shippingAddress.upazila}, {order.shippingAddress.district}, {order.shippingAddress.division}
          </dd>
        </dl>

        <ul className="mt-4 divide-y divide-border border-t border-border">
          {order.items.map((item) => (
            <li key={item.productId} className="flex justify-between py-2 text-small">
              <span className="text-foreground/70">
                {item.titleSnapshot} × {item.quantity}
              </span>
              <span className="tabular-nums text-foreground">{formatBDT(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-lg bg-surface-soft p-3 text-small text-foreground">{nextStepMessage}</p>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/shop"
          className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-small font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Continue Shopping
        </Link>
      </div>
    </Container>
  );
}
