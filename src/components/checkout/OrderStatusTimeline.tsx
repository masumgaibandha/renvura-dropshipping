import type { OrderStatus, OrderSummary, OrderTrackingSummary } from "@/types/order";

const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order Received" },
  { status: "confirmed", label: "Confirmed" },
  { status: "processing", label: "Processing" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
];

/** `processing`'s position also covers the internal-only `supplier_submitted` status — see `ORDER_STATUS_LABELS`'s doc comment. */
const STEP_INDEX: Partial<Record<OrderStatus, number>> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  supplier_submitted: 2,
  shipped: 3,
  delivered: 4,
};

interface OrderStatusTimelineProps {
  order: Pick<OrderSummary | OrderTrackingSummary, "orderStatus" | "confirmation" | "courier">;
  className?: string;
}

/**
 * Customer-safe progress timeline shared by `/track-order` and `/account/orders/[orderNumber]` —
 * both already receive the same sanitized `confirmation`/`courier` shapes (`CustomerOrderConfirmation`/
 * `OrderCourier`, see `src/types/order.ts`), so one component covers both surfaces. `cancelled`
 * and `returned` are rendered as distinct terminal states, never folded into the 5-step progress
 * bar — an order that was cancelled at "processing" didn't actually reach "shipped," so showing it
 * as a filled step would be misleading. Never renders admin notes, cancellation reasons, or return
 * reasons — those fields don't even exist on these customer-safe types.
 */
export function OrderStatusTimeline({ order, className }: OrderStatusTimelineProps) {
  if (order.orderStatus === "cancelled") {
    return (
      <div className={className}>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-small font-medium text-red-700">This order was cancelled.</div>
      </div>
    );
  }

  if (order.orderStatus === "returned") {
    return (
      <div className={className}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-small font-medium text-amber-800">This order was returned.</div>
      </div>
    );
  }

  const currentIndex = STEP_INDEX[order.orderStatus] ?? 0;

  return (
    <div className={className}>
      <ol className="flex flex-wrap items-start gap-x-2 gap-y-4">
        {TIMELINE_STEPS.map((step, index) => {
          const isComplete = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <li key={step.status} className="flex min-w-[64px] flex-1 flex-col items-center gap-1.5 text-center">
              <span
                aria-hidden="true"
                className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isComplete ? "bg-accent text-white" : "bg-surface-soft text-foreground/50"
                }`}
              >
                {index + 1}
              </span>
              <span className={`text-xs ${isCurrent ? "font-semibold text-foreground" : isComplete ? "text-foreground/70" : "text-foreground/50"}`}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {order.confirmation.method !== "none" && order.confirmation.confirmedAt && (
        <p className="mt-3 text-xs text-foreground/70">
          Confirmed via {order.confirmation.method === "whatsapp" ? "WhatsApp" : "phone"} on{" "}
          {new Date(order.confirmation.confirmedAt).toLocaleDateString("en-GB")}.
        </p>
      )}

      {(order.courier.provider || order.courier.trackingId) && (
        <div className="mt-3 rounded-lg border border-border bg-surface-soft p-3 text-xs text-foreground/70">
          {order.courier.provider && (
            <p>
              <span className="font-medium text-foreground">Courier:</span> {order.courier.provider}
            </p>
          )}
          {order.courier.trackingId && (
            <p>
              <span className="font-medium text-foreground">Tracking ID:</span> {order.courier.trackingId}
            </p>
          )}
          {order.courier.trackingUrl && (
            <a href={order.courier.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
              Track shipment →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
