import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusTimeline } from "@/components/checkout/OrderStatusTimeline";
import { paymentMethodLabels } from "@/config/payment";
import { getCurrentUser } from "@/lib/auth-session";
import { getOrderForCustomerDetail, toOrderSummary } from "@/services/orders";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/types/order";
import { formatBDT } from "@/utils/currency";

interface AccountOrderDetailPageProps {
  params: Promise<{ orderNumber: string }>;
}

export const metadata: Metadata = { title: "Order Detail" };

/**
 * `getOrderForCustomerDetail` scopes the query to `{ orderNumber, customerUserId: user.id }` —
 * an order that exists but belongs to someone else returns `null` here exactly like one that
 * doesn't exist at all, so this 404s rather than ever revealing "that order belongs to someone
 * else" (same posture as `/track-order`).
 */
export default async function AccountOrderDetailPage({ params }: AccountOrderDetailPageProps) {
  const { orderNumber } = await params;
  const user = (await getCurrentUser())!;
  const record = await getOrderForCustomerDetail(orderNumber.toUpperCase(), user.id);

  if (!record) {
    notFound();
  }

  const order = toOrderSummary(record);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/account/orders" className="text-small font-medium text-accent hover:underline">
          ← Back to Orders
        </Link>
        <h2 className="text-h3 mt-2 text-foreground">{order.orderNumber}</h2>
        <p className="text-small text-foreground/70">Placed {new Date(order.createdAt).toLocaleDateString("en-GB")}</p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <OrderStatusTimeline order={order} className="mb-4 border-b border-border pb-4" />

        <dl className="grid grid-cols-2 gap-y-3 text-small">
          <dt className="text-foreground/70">Order Status</dt>
          <dd className="text-right font-medium text-foreground">{ORDER_STATUS_LABELS[order.orderStatus]}</dd>

          <dt className="text-foreground/70">Payment Method</dt>
          <dd className="text-right font-medium text-foreground">{paymentMethodLabels[order.payment.method]}</dd>

          <dt className="text-foreground/70">Payment Status</dt>
          <dd className="text-right font-medium text-foreground">{PAYMENT_STATUS_LABELS[order.payment.status]}</dd>

          <dt className="text-foreground/70">Delivery Address</dt>
          <dd className="text-right font-medium text-foreground">
            {order.shippingAddress.addressLine}, {order.shippingAddress.upazila}, {order.shippingAddress.district}, {order.shippingAddress.division}
          </dd>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-h3 text-foreground">Items</h3>
        <ul className="mt-4 divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.productId} className="flex items-center justify-between py-3 text-small">
              <div>
                <p className="font-medium text-foreground">{item.titleSnapshot}</p>
                <p className="text-foreground/70">
                  {formatBDT(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              <span className="font-semibold tabular-nums text-foreground">{formatBDT(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-small">
          <div className="flex justify-between text-foreground/70">
            <dt>Subtotal</dt>
            <dd className="tabular-nums text-foreground">{formatBDT(order.pricing.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-foreground/70">
            <dt>Delivery</dt>
            <dd className="tabular-nums text-foreground">{formatBDT(order.pricing.deliveryFee)}</dd>
          </div>
        </dl>
        <div className="mt-3 flex justify-between border-t border-border pt-3 text-body font-semibold text-foreground">
          <span>Total</span>
          <span className="tabular-nums">{formatBDT(order.pricing.total)}</span>
        </div>
      </section>
    </div>
  );
}
