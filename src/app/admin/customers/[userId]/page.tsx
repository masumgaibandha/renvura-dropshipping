import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/StatusBadge";
import { IconArrowLeft } from "@/components/ui/icons";
import { getCustomerDetailForAdmin } from "@/services/customers";
import { formatBDT } from "@/utils/currency";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const result = await getCustomerDetailForAdmin(userId);
  if (!result) notFound();

  const { customer, addresses, orders } = result;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-small font-medium text-foreground/70 hover:text-foreground">
          <IconArrowLeft className="size-4" />
          Back to customers
        </Link>
        <h1 className="mt-2 text-h2 font-semibold text-foreground">{customer.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-body font-semibold text-foreground">Profile</h2>
          <dl className="mt-3 flex flex-col gap-1.5 text-small">
            <Row label="Email" value={customer.email} />
            <Row label="Phone" value={customer.phone ?? "—"} />
            <Row label="Account Created" value={new Date(customer.createdAt).toLocaleDateString("en-GB")} />
            <Row label="Orders" value={String(customer.orderCount)} />
            <Row label="Delivered Value" value={formatBDT(customer.totalDeliveredValue)} />
          </dl>
        </section>

        <section className="lg:col-span-2 rounded-xl border border-border bg-surface p-4">
          <h2 className="text-body font-semibold text-foreground">Saved Addresses</h2>
          {addresses.length === 0 ? (
            <p className="mt-3 text-small text-foreground/70">No saved addresses.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {addresses.map((address) => (
                <li key={address.id} className="rounded-lg border border-border p-3 text-small">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{address.label}</span>
                    {address.isDefault && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Default</span>}
                  </div>
                  <p className="mt-1 text-foreground/70">
                    {address.recipientName} · {address.phone}
                  </p>
                  <p className="text-foreground/70">
                    {address.addressLine}, {address.upazila}, {address.district}, {address.division}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-body font-semibold text-foreground">Order History</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-small text-foreground/70">No orders yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-small">
              <thead>
                <tr className="border-b border-border text-left text-xs text-foreground/70">
                  <th className="pb-2 pr-3 font-medium">Order</th>
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Total</th>
                  <th className="pb-2 pr-3 font-medium">Payment</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.orderNumber} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <Link href={`/admin/orders/${order.orderNumber}`} className="font-medium text-accent hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-foreground/70">{new Date(order.createdAt).toLocaleDateString("en-GB")}</td>
                    <td className="py-2 pr-3 text-foreground">{formatBDT(order.total)}</td>
                    <td className="py-2 pr-3">
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="py-2">
                      <OrderStatusBadge status={order.orderStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-foreground/70">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}
