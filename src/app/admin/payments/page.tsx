import Link from "next/link";

import { PaymentVerificationActions } from "@/components/admin/PaymentVerificationActions";
import { paymentMethodLabels } from "@/config/payment";
import { getPendingVerificationOrders } from "@/services/orders";
import { formatBDT } from "@/utils/currency";

export default async function AdminPaymentsPage() {
  const orders = await getPendingVerificationOrders();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Payment Verification</h1>
        <p className="mt-1 text-small text-foreground/70">
          Manual bKash/Nagad/Rocket payments awaiting confirmation. Cash on Delivery never appears here.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[840px] text-small">
          <thead>
            <tr className="border-b border-border text-left text-xs text-foreground/70">
              <th className="p-3 font-medium">Order Number</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Method</th>
              <th className="p-3 font-medium">Transaction ID</th>
              <th className="p-3 font-medium">Total</th>
              <th className="p-3 font-medium">Submitted</th>
              <th className="p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-foreground/70">
                  Nothing awaiting verification.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.orderNumber} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium text-foreground">
                    <Link href={`/admin/orders/${order.orderNumber}`} className="hover:text-accent hover:underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="p-3 text-foreground">{order.customerName}</td>
                  <td className="p-3 text-foreground/70">{order.customerPhone}</td>
                  <td className="p-3 text-foreground/70">{paymentMethodLabels[order.paymentMethod]}</td>
                  <td className="p-3 font-mono text-foreground">{order.transactionId ?? "—"}</td>
                  <td className="p-3 text-foreground">{formatBDT(order.total)}</td>
                  <td className="p-3 text-foreground/70">{new Date(order.createdAt).toLocaleString("en-GB")}</td>
                  <td className="p-3">
                    <PaymentVerificationActions orderNumber={order.orderNumber} transactionId={order.transactionId} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
