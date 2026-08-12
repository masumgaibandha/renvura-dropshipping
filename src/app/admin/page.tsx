import Link from "next/link";

import { OrderStatusBadge } from "@/components/admin/StatusBadge";
import { StatCard } from "@/components/admin/StatCard";
import { countCustomers } from "@/services/customers";
import { getOrderDashboardStats, getRecentOrdersForAdmin, getTopSellingProducts } from "@/services/orders";
import { getLowStockProducts } from "@/services/products";
import { getStoreSettings } from "@/services/settings";
import { formatBDT } from "@/utils/currency";

export default async function AdminDashboardPage() {
  const settings = await getStoreSettings();
  const [stats, recentOrders, topProducts, lowStockProducts, customerCount] = await Promise.all([
    getOrderDashboardStats(),
    getRecentOrdersForAdmin(8),
    getTopSellingProducts(5),
    getLowStockProducts(settings.lowStockThreshold, 8),
    countCustomers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-small text-foreground/70">Operational snapshot as of right now.</p>
      </div>

      <section aria-label="Order and revenue metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Orders Today" value={String(stats.ordersToday)} />
        <StatCard label="Pending" value={String(stats.pending)} />
        <StatCard label="Confirmed" value={String(stats.confirmed)} />
        <StatCard label="Processing" value={String(stats.processing)} />
        <StatCard label="Shipped" value={String(stats.shipped)} />
        <StatCard label="Delivered" value={String(stats.delivered)} />
        <StatCard label="Cancelled" value={String(stats.cancelled)} />
        <StatCard label="Returned" value={String(stats.returned)} />
        <StatCard label="Pending Verification" value={String(stats.pendingVerification)} hint={stats.pendingVerification > 0 ? "Needs review" : undefined} />
        <StatCard label="Revenue Today" value={formatBDT(stats.revenueToday)} hint="Paid or delivered orders only" />
        <StatCard label="Revenue This Month" value={formatBDT(stats.revenueThisMonth)} hint="Paid or delivered orders only" />
        <StatCard label="Total Customers" value={String(customerCount)} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-body font-semibold text-foreground">Recent Orders</h2>
            <Link href="/admin/orders" className="text-small font-medium text-accent hover:underline">
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="mt-4 text-small text-foreground/70">No orders yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-small">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-foreground/70">
                    <th className="pb-2 pr-3 font-medium">Order</th>
                    <th className="pb-2 pr-3 font-medium">Customer</th>
                    <th className="pb-2 pr-3 font-medium">Total</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.orderNumber} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3">
                        <Link href={`/admin/orders/${order.orderNumber}`} className="font-medium text-accent hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-foreground">{order.customerName}</td>
                      <td className="py-2 pr-3 text-foreground">{formatBDT(order.total)}</td>
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

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-body font-semibold text-foreground">Top Products</h2>
          {topProducts.length === 0 ? (
            <p className="mt-4 text-small text-foreground/70">No sales yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {topProducts.map((product) => (
                <li key={product.productId} className="flex items-center justify-between gap-3 text-small">
                  <Link href={`/admin/products/${product.slug}/edit`} className="min-w-0 truncate text-foreground hover:text-accent">
                    {product.title}
                  </Link>
                  <span className="shrink-0 text-foreground/70">{product.unitsSold} sold</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-body font-semibold text-foreground">Low Stock Products</h2>
          <Link href="/admin/inventory" className="text-small font-medium text-accent hover:underline">
            Manage inventory
          </Link>
        </div>
        {lowStockProducts.length === 0 ? (
          <p className="mt-4 text-small text-foreground/70">Nothing at or below the {settings.lowStockThreshold}-unit threshold.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {lowStockProducts.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 text-small">
                <Link href={`/admin/products/${product.slug}/edit`} className="min-w-0 truncate text-foreground hover:text-accent">
                  {product.title}
                </Link>
                <span className="shrink-0 font-medium text-amber-600">{product.inventory.stock} left</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
