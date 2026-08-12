import Link from "next/link";

import { AdminPagination } from "@/components/admin/AdminPagination";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/StatusBadge";
import { paymentMethodLabels } from "@/config/payment";
import { listOrdersForAdmin } from "@/services/orders";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type OrderStatus, type PaymentMethod, type PaymentStatus } from "@/types/order";
import { formatBDT } from "@/utils/currency";

const ORDER_STATUS_VALUES: OrderStatus[] = ["pending", "confirmed", "processing", "supplier_submitted", "shipped", "delivered", "cancelled", "returned"];
const PAYMENT_STATUS_VALUES: PaymentStatus[] = ["unpaid", "cod_pending", "pending_verification", "paid", "failed", "refunded"];
const PAYMENT_METHOD_VALUES: PaymentMethod[] = ["cash_on_delivery", "bkash", "nagad", "rocket"];

type RawSearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const search = firstParam(params.q);
  const orderStatus = firstParam(params.orderStatus) as OrderStatus | undefined;
  const paymentStatus = firstParam(params.paymentStatus) as PaymentStatus | undefined;
  const paymentMethod = firstParam(params.paymentMethod) as PaymentMethod | undefined;
  const dateFrom = firstParam(params.dateFrom);
  const dateTo = firstParam(params.dateTo);
  const page = Number.parseInt(firstParam(params.page) ?? "1", 10) || 1;

  const result = await listOrdersForAdmin({
    page,
    search,
    orderStatus: orderStatus && ORDER_STATUS_VALUES.includes(orderStatus) ? orderStatus : undefined,
    paymentStatus: paymentStatus && PAYMENT_STATUS_VALUES.includes(paymentStatus) ? paymentStatus : undefined,
    paymentMethod: paymentMethod && PAYMENT_METHOD_VALUES.includes(paymentMethod) ? paymentMethod : undefined,
    dateFrom,
    dateTo,
  });

  function pageHref(pageNumber: number): string {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (orderStatus) query.set("orderStatus", orderStatus);
    if (paymentStatus) query.set("paymentStatus", paymentStatus);
    if (paymentMethod) query.set("paymentMethod", paymentMethod);
    if (dateFrom) query.set("dateFrom", dateFrom);
    if (dateTo) query.set("dateTo", dateTo);
    if (pageNumber > 1) query.set("page", String(pageNumber));
    const qs = query.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Orders</h1>
        <p className="mt-1 text-small text-foreground/70">{result.total} order{result.total === 1 ? "" : "s"}</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs font-medium text-foreground/70">Search</label>
          <input id="q" name="q" defaultValue={search} placeholder="Order #, name, or phone" className="h-9 w-56 rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="orderStatus" className="text-xs font-medium text-foreground/70">Order status</label>
          <select id="orderStatus" name="orderStatus" defaultValue={orderStatus ?? ""} className="h-9 rounded-lg border border-border bg-background px-2 text-small text-foreground">
            <option value="">Any</option>
            {ORDER_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="paymentStatus" className="text-xs font-medium text-foreground/70">Payment status</label>
          <select id="paymentStatus" name="paymentStatus" defaultValue={paymentStatus ?? ""} className="h-9 rounded-lg border border-border bg-background px-2 text-small text-foreground">
            <option value="">Any</option>
            {PAYMENT_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>{PAYMENT_STATUS_LABELS[status]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="paymentMethod" className="text-xs font-medium text-foreground/70">Payment method</label>
          <select id="paymentMethod" name="paymentMethod" defaultValue={paymentMethod ?? ""} className="h-9 rounded-lg border border-border bg-background px-2 text-small text-foreground">
            <option value="">Any</option>
            {PAYMENT_METHOD_VALUES.map((method) => (
              <option key={method} value={method}>{paymentMethodLabels[method]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dateFrom" className="text-xs font-medium text-foreground/70">From</label>
          <input type="date" id="dateFrom" name="dateFrom" defaultValue={dateFrom} className="h-9 rounded-lg border border-border bg-background px-2 text-small text-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dateTo" className="text-xs font-medium text-foreground/70">To</label>
          <input type="date" id="dateTo" name="dateTo" defaultValue={dateTo} className="h-9 rounded-lg border border-border bg-background px-2 text-small text-foreground" />
        </div>
        <button type="submit" className="h-9 rounded-lg bg-accent px-4 text-small font-medium text-white transition-colors hover:bg-accent-hover">
          Filter
        </button>
        {(search || orderStatus || paymentStatus || paymentMethod || dateFrom || dateTo) && (
          <Link href="/admin/orders" className="h-9 inline-flex items-center text-small font-medium text-foreground/70 hover:text-foreground">
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[900px] text-small">
          <thead>
            <tr className="border-b border-border text-left text-xs text-foreground/70">
              <th className="p-3 font-medium">Order Number</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Items</th>
              <th className="p-3 font-medium">Total</th>
              <th className="p-3 font-medium">Payment</th>
              <th className="p-3 font-medium">Payment Status</th>
              <th className="p-3 font-medium">Order Status</th>
              <th className="p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {result.orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-foreground/70">
                  No orders match these filters.
                </td>
              </tr>
            ) : (
              result.orders.map((order) => (
                <tr key={order.orderNumber} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium text-foreground">{order.orderNumber}</td>
                  <td className="p-3 text-foreground/70">{new Date(order.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="p-3 text-foreground">{order.customerName}</td>
                  <td className="p-3 text-foreground/70">{order.customerPhone}</td>
                  <td className="p-3 text-foreground/70">{order.itemCount}</td>
                  <td className="p-3 text-foreground">{formatBDT(order.total)}</td>
                  <td className="p-3 text-foreground/70">{paymentMethodLabels[order.paymentMethod]}</td>
                  <td className="p-3">
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </td>
                  <td className="p-3">
                    <OrderStatusBadge status={order.orderStatus} />
                  </td>
                  <td className="p-3">
                    <Link href={`/admin/orders/${order.orderNumber}`} className="font-medium text-accent hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={result.page} totalPages={result.totalPages} pageHref={pageHref} />
    </div>
  );
}
