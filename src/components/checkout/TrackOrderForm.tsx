"use client";

import { useState, useTransition, type FormEvent } from "react";

import { trackOrder } from "@/actions/orders";
import { paymentMethodLabels } from "@/config/payment";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type OrderTrackingSummary } from "@/types/order";
import { formatBDT } from "@/utils/currency";
import { OrderStatusTimeline } from "./OrderStatusTimeline";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Order number + phone lookup via the `trackOrder` Server Action. The
 * server returns the exact same generic error whether the order doesn't
 * exist or the phone doesn't match, so this UI never has enough
 * information to distinguish the two — that's intentional (see
 * `src/actions/orders.ts`), not a missing feature here.
 */
export function TrackOrderForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderTrackingSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    startTransition(async () => {
      const response = await trackOrder({ orderNumber, phone });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult(response.order);
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="track-order-number" className="text-small font-medium text-foreground">
            Order Number
          </label>
          <input
            id="track-order-number"
            type="text"
            required
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder="RV-20260811-XXXXXX"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="track-order-phone" className="text-small font-medium text-foreground">
            Mobile Number
          </label>
          <input
            id="track-order-phone"
            type="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="01XXXXXXXXX"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex h-11 w-full items-center justify-center rounded-full bg-accent text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Checking…" : "Track Order"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-small text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-h3 text-foreground">{result.orderNumber}</h2>

          <OrderStatusTimeline order={result} className="mt-4 border-b border-border pb-4" />

          <dl className="mt-4 grid grid-cols-2 gap-y-3 text-small">
            <dt className="text-foreground/70">Status</dt>
            <dd className="text-right font-medium text-foreground">{ORDER_STATUS_LABELS[result.orderStatus]}</dd>

            <dt className="text-foreground/70">Payment Method</dt>
            <dd className="text-right font-medium text-foreground">{paymentMethodLabels[result.payment.method]}</dd>

            <dt className="text-foreground/70">Payment Status</dt>
            <dd className="text-right font-medium text-foreground">{PAYMENT_STATUS_LABELS[result.payment.status]}</dd>

            <dt className="text-foreground/70">Total</dt>
            <dd className="text-right font-semibold tabular-nums text-foreground">{formatBDT(result.pricing.total)}</dd>

            <dt className="text-foreground/70">Delivery Area</dt>
            <dd className="text-right font-medium text-foreground">
              {result.shippingAreaSummary.upazila}, {result.shippingAreaSummary.district}
            </dd>
          </dl>
        </div>
      )}
    </div>
  );
}
