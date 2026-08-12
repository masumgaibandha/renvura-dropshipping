import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { IconArrowLeft } from "@/components/ui/icons";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/StatusBadge";
import { paymentMethodLabels } from "@/config/payment";
import { findOrderByOrderNumber, toAdminOrderDetail } from "@/services/orders";
import { formatBDT } from "@/utils/currency";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const record = await findOrderByOrderNumber(orderNumber);
  if (!record) notFound();

  const order = toAdminOrderDetail(record);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-small font-medium text-foreground/70 hover:text-foreground">
          <IconArrowLeft className="size-4" />
          Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-h2 font-semibold text-foreground">{order.orderNumber}</h1>
          <OrderStatusBadge status={order.orderStatus} />
          <PaymentStatusBadge status={order.payment.status} />
        </div>
        <p className="mt-1 text-small text-foreground/70">
          Placed {new Date(order.createdAt).toLocaleString("en-GB")} · Last updated {new Date(order.updatedAt).toLocaleString("en-GB")}
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-body font-semibold text-foreground">Order Status</h2>
        <div className="mt-3">
          <OrderStatusForm orderNumber={order.orderNumber} currentStatus={order.orderStatus} />
        </div>
        {order.statusHistory.length > 0 && (
          <ol className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3 text-xs text-foreground/70">
            {order.statusHistory.map((entry, index) => (
              <li key={index}>
                {new Date(entry.changedAt).toLocaleString("en-GB")} — {entry.status} {entry.changedBy ? `(by admin ${entry.changedBy})` : "(automatic)"}
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-body font-semibold text-foreground">Customer</h2>
          <dl className="mt-3 flex flex-col gap-1.5 text-small">
            <Row label="Name" value={order.customer.name} />
            <Row label="Phone" value={order.customer.phone} />
            <Row label="Email" value={order.customer.email ?? "—"} />
            <Row label="Account" value={order.customerUserId ? "Signed in" : "Guest checkout"} />
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-body font-semibold text-foreground">Delivery Address</h2>
          <dl className="mt-3 flex flex-col gap-1.5 text-small">
            <Row label="Division" value={order.shippingAddress.division} />
            <Row label="District" value={order.shippingAddress.district} />
            <Row label="Upazila/Thana" value={order.shippingAddress.upazila} />
            <Row label="Address" value={order.shippingAddress.addressLine} />
            <Row label="Landmark" value={order.shippingAddress.landmark ?? "—"} />
            <Row label="Notes" value={order.shippingAddress.notes ?? "—"} />
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-body font-semibold text-foreground">Payment</h2>
          <dl className="mt-3 flex flex-col gap-1.5 text-small">
            <Row label="Method" value={paymentMethodLabels[order.payment.method]} />
            <Row label="Transaction ID" value={order.payment.transactionId ?? "—"} />
            <Row label="Status" value={<PaymentStatusBadge status={order.payment.status} />} />
          </dl>
          {order.payment.status === "pending_verification" && (
            <p className="mt-3 text-xs text-foreground/70">
              Verify this payment from the{" "}
              <Link href="/admin/payments" className="font-medium text-accent hover:underline">
                Payments queue
              </Link>
              .
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-body font-semibold text-foreground">Pricing</h2>
          <dl className="mt-3 flex flex-col gap-1.5 text-small">
            <Row label="Subtotal" value={formatBDT(order.pricing.subtotal)} />
            <Row label="Delivery Fee" value={formatBDT(order.pricing.deliveryFee)} />
            <Row label="Total" value={<span className="font-semibold text-foreground">{formatBDT(order.pricing.total)}</span>} />
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-body font-semibold text-foreground">Items</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-small">
            <thead>
              <tr className="border-b border-border text-left text-xs text-foreground/70">
                <th className="pb-2 pr-3 font-medium">Product</th>
                <th className="pb-2 pr-3 font-medium">Quantity</th>
                <th className="pb-2 pr-3 font-medium">Unit Price</th>
                <th className="pb-2 font-medium">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.productId} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 text-foreground">
                    <Link href={`/admin/products/${item.slug}/edit`} className="hover:text-accent hover:underline">
                      {item.titleSnapshot}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-foreground/70">{item.quantity}</td>
                  <td className="py-2 pr-3 text-foreground/70">{formatBDT(item.unitPrice)}</td>
                  <td className="py-2 text-foreground">{formatBDT(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-foreground/70">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}
