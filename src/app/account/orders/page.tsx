import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth-session";
import { getOrdersForCustomer, toOrderListItem } from "@/services/orders";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/types/order";
import { formatBDT } from "@/utils/currency";

export const metadata: Metadata = { title: "My Orders" };

/** Only ever queries orders where `customerUserId` matches the current session's user — never all orders. */
export default async function AccountOrdersPage() {
  const user = (await getCurrentUser())!;
  const orders = (await getOrdersForCustomer(user.id)).map(toOrderListItem);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-h3 text-foreground">Orders</h2>

      {orders.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-body text-foreground/70">You haven&apos;t placed any orders yet.</p>
          <Link href="/shop" className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-small font-medium text-white transition-colors hover:bg-accent-hover">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-small">
            <thead>
              <tr className="border-b border-border text-left text-foreground/70">
                <th className="py-2 font-medium">Order Number</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Payment</th>
                <th className="py-2 text-right font-medium">Total</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.orderNumber}>
                  <td className="py-3 font-medium text-foreground">{order.orderNumber}</td>
                  <td className="py-3 text-foreground/70">{new Date(order.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="py-3 text-foreground/70">{ORDER_STATUS_LABELS[order.orderStatus]}</td>
                  <td className="py-3 text-foreground/70">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</td>
                  <td className="py-3 text-right font-semibold tabular-nums text-foreground">{formatBDT(order.total)}</td>
                  <td className="py-3 text-right">
                    <Link href={`/account/orders/${order.orderNumber}`} className="font-medium text-accent hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
