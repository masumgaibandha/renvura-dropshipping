import Link from "next/link";

import { getCurrentUser } from "@/lib/auth-session";
import { getOrdersForCustomer, toOrderListItem } from "@/services/orders";
import { ORDER_STATUS_LABELS } from "@/types/order";
import { formatBDT } from "@/utils/currency";

/** Layout already redirects if unauthenticated, so `user` is always non-null here. */
export default async function AccountPage() {
  const user = (await getCurrentUser())!;
  const recentOrders = (await getOrdersForCustomer(user.id)).slice(0, 5).map(toOrderListItem);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-h3 text-foreground">Welcome, {user.name}</h2>
        <dl className="mt-4 grid gap-2 text-small sm:grid-cols-2">
          <div>
            <dt className="text-foreground/70">Email</dt>
            <dd className="text-foreground">{user.email}</dd>
          </div>
          {user.phone && (
            <div>
              <dt className="text-foreground/70">Phone</dt>
              <dd className="text-foreground">{user.phone}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/account/orders" className="rounded-2xl border border-border bg-surface p-4 text-center text-small font-medium text-foreground transition-colors hover:border-accent hover:text-accent">
          Orders
        </Link>
        <Link href="/account/addresses" className="rounded-2xl border border-border bg-surface p-4 text-center text-small font-medium text-foreground transition-colors hover:border-accent hover:text-accent">
          Addresses
        </Link>
        <Link href="/account/profile" className="rounded-2xl border border-border bg-surface p-4 text-center text-small font-medium text-foreground transition-colors hover:border-accent hover:text-accent">
          Profile
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-foreground">Recent Orders</h2>
          {recentOrders.length > 0 && (
            <Link href="/account/orders" className="text-small font-medium text-accent hover:underline">
              View all
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <p className="mt-4 text-small text-foreground/70">You haven&apos;t placed any orders yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {recentOrders.map((order) => (
              <li key={order.orderNumber} className="flex items-center justify-between py-3 text-small">
                <div>
                  <Link href={`/account/orders/${order.orderNumber}`} className="font-medium text-foreground hover:text-accent">
                    {order.orderNumber}
                  </Link>
                  <p className="text-foreground/70">{ORDER_STATUS_LABELS[order.orderStatus]}</p>
                </div>
                <span className="font-semibold tabular-nums text-foreground">{formatBDT(order.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
