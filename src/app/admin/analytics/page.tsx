import { BarChart, type BarChartRow } from "@/components/admin/BarChart";
import { StatCard } from "@/components/admin/StatCard";
import { countCustomers } from "@/services/customers";
import { getAverageOrderValue, getCodQualityMetrics, getOrderDashboardStats, getRepeatCustomerCount, getSalesByDay, getTopSellingProducts } from "@/services/orders";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/order";
import { formatBDT } from "@/utils/currency";

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

const STATUS_COLOR_CLASS: Record<OrderStatus, string> = {
  pending: "bg-foreground/30",
  confirmed: "bg-accent",
  processing: "bg-accent",
  supplier_submitted: "bg-accent",
  shipped: "bg-amber-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
  returned: "bg-red-500",
};

export default async function AdminAnalyticsPage() {
  const [stats, salesByDay, topProducts, aov, repeatCustomers, customerCount, codQuality] = await Promise.all([
    getOrderDashboardStats(),
    getSalesByDay(14),
    getTopSellingProducts(8),
    getAverageOrderValue(),
    getRepeatCustomerCount(),
    countCustomers(),
    getCodQualityMetrics(),
  ]);

  const statusRows: BarChartRow[] = (
    [
      ["pending", stats.pending],
      ["confirmed", stats.confirmed],
      ["processing", stats.processing],
      ["shipped", stats.shipped],
      ["delivered", stats.delivered],
      ["cancelled", stats.cancelled],
      ["returned", stats.returned],
    ] as [OrderStatus, number][]
  ).map(([status, value]) => ({ label: ORDER_STATUS_LABELS[status], value, displayValue: String(value), colorClass: STATUS_COLOR_CLASS[status] }));

  const salesRows: BarChartRow[] = salesByDay.map((day) => ({
    label: new Date(day.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    value: day.revenue,
    displayValue: formatBDT(day.revenue, { showSymbol: false }),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Analytics</h1>
        <p className="mt-1 text-small text-foreground/70">Internal order and customer data only — no ad-platform data yet.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Average Order Value" value={formatBDT(aov.averageOrderValue)} hint={`${aov.orderCount} paid/delivered orders`} />
        <StatCard label="Total Customers" value={String(customerCount)} />
        <StatCard label="Repeat Customers" value={String(repeatCustomers)} hint="2+ orders, signed-in only" />
        <StatCard label="Pending Verification" value={String(stats.pendingVerification)} />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-body font-semibold text-foreground">COD Quality</h2>
        <p className="text-xs text-foreground/70">
          Confirmation/delivery/cancellation rates across all {codQuality.receivedCount} orders received — pending orders aren&apos;t counted as
          failures, only as not-yet-decided.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Confirmation Rate" value={formatPercent(codQuality.confirmationRate)} hint={`${codQuality.confirmedCount} confirmed`} />
          <StatCard label="Delivery Rate" value={formatPercent(codQuality.deliveryRate)} hint={`${codQuality.deliveredCount} delivered`} />
          <StatCard label="Cancellation Rate" value={formatPercent(codQuality.cancellationRate)} hint={`${codQuality.cancelledCount} cancelled`} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-body font-semibold text-foreground">Orders by Status</h2>
          <div className="mt-4">
            <BarChart rows={statusRows} caption="Order count by status" />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-body font-semibold text-foreground">Sales — Last 14 Days</h2>
          <p className="text-xs text-foreground/70">Paid or delivered orders only (৳)</p>
          <div className="mt-4">
            <BarChart rows={salesRows} caption="Daily revenue, last 14 days" />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-body font-semibold text-foreground">Top-Selling Products</h2>
        {topProducts.length === 0 ? (
          <p className="mt-3 text-small text-foreground/70">No sales yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-small">
              <thead>
                <tr className="border-b border-border text-left text-xs text-foreground/70">
                  <th className="pb-2 pr-3 font-medium">Product</th>
                  <th className="pb-2 pr-3 font-medium">Units Sold</th>
                  <th className="pb-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product) => (
                  <tr key={product.productId} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 text-foreground">{product.title}</td>
                    <td className="py-2 pr-3 text-foreground/70">{product.unitsSold}</td>
                    <td className="py-2 text-foreground">{formatBDT(product.revenue)}</td>
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
