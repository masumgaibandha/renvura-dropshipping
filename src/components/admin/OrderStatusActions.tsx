"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { adminUpdateOrderStatus, type AdminUpdateOrderStatusDetails } from "@/actions/admin/orders";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  type CancellationReason,
  type ConfirmationMethod,
  type CourierProviderId,
  type OrderStatus,
  type ReturnReason,
} from "@/types/order";

const inputClass = "h-9 rounded-lg border border-border bg-background px-2 text-small text-foreground";

/** Distinct, task-oriented labels for each transition button — clearer for staff scanning quickly than a generic "Move to X." */
const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm Order",
  processing: "Start Processing",
  supplier_submitted: "Mark Submitted to Supplier",
  shipped: "Mark Shipped",
  delivered: "Mark Delivered",
  cancelled: "Cancel Order",
  returned: "Mark Returned",
};

/** "Test Courier"/similar free-text values only ever exist on legacy pre-Phase-13 orders (see CLAUDE.md's "Historical data compatibility" note) — this dropdown is the only way to set `courier.providerId` going forward. */
const COURIER_PROVIDER_OPTIONS: { value: CourierProviderId; label: string }[] = [
  { value: "pathao", label: "Pathao" },
  { value: "steadfast", label: "Steadfast" },
  { value: "redx", label: "RedX" },
  { value: "paperfly", label: "Paperfly" },
  { value: "other", label: "Other / Manual" },
];

const CANCELLATION_REASON_OPTIONS: { value: CancellationReason; label: string }[] = [
  { value: "customer_request", label: "Customer requested cancellation" },
  { value: "unreachable", label: "Customer unreachable" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "invalid_order", label: "Invalid / suspicious order" },
  { value: "payment_failed", label: "Payment failed" },
  { value: "duplicate", label: "Duplicate order" },
  { value: "other", label: "Other" },
];

const RETURN_REASON_OPTIONS: { value: ReturnReason; label: string }[] = [
  { value: "damaged", label: "Damaged" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "customer_return", label: "Customer return" },
  { value: "delivery_failure", label: "Delivery failure (never reached customer)" },
  { value: "other", label: "Other" },
];

/**
 * Replaces the old dropdown-based `OrderStatusForm` — one prominent button per valid next
 * transition (`ORDER_STATUS_TRANSITIONS`, server-validated again independently by
 * `adminUpdateOrderStatus`), each expanding into exactly the fields that transition needs:
 * confirmation method for `confirmed`, a reason code for `cancelled`, a reason + resellable flag
 * for `returned`, optional courier details for `shipped`. Every other transition just needs an
 * optional internal note. Reason codes and notes are always internal — never shown to the
 * customer (see `OrderStatusTimeline.tsx`, which only ever receives the customer-safe projection).
 */
export function OrderStatusActions({
  orderNumber,
  currentStatus,
  courierAlreadyCreated,
}: {
  orderNumber: string;
  currentStatus: OrderStatus;
  /** Phase 13 — `true` when a courier shipment already exists via the `CourierPanel` API flow (`courier.creationStatus === "created"`). When true, the `shipped` transition below skips its own manual courier fields entirely so this quick-entry path can never overwrite the API-created `provider`/`consignmentId`/`mode`. */
  courierAlreadyCreated?: boolean;
}) {
  const nextOptions = ORDER_STATUS_TRANSITIONS[currentStatus];
  const [activeAction, setActiveAction] = useState<OrderStatus | null>(null);

  if (nextOptions.length === 0) {
    return <p className="text-small text-foreground/70">This order is in a final status — no further changes available.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {nextOptions.map((status) => (
          <Button
            key={status}
            variant={status === "cancelled" ? "danger" : activeAction === status ? "primary" : "secondary"}
            size="sm"
            onPress={() => setActiveAction((current) => (current === status ? null : status))}
          >
            {ACTION_LABELS[status] ?? `Move to "${ORDER_STATUS_LABELS[status]}"`}
          </Button>
        ))}
      </div>

      {activeAction && (
        <TransitionForm orderNumber={orderNumber} targetStatus={activeAction} courierAlreadyCreated={Boolean(courierAlreadyCreated)} onDone={() => setActiveAction(null)} />
      )}
    </div>
  );
}

function TransitionForm({
  orderNumber,
  targetStatus,
  courierAlreadyCreated,
  onDone,
}: {
  orderNumber: string;
  targetStatus: OrderStatus;
  courierAlreadyCreated: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [confirmationMethod, setConfirmationMethod] = useState<ConfirmationMethod | "">("");
  const [cancellationReason, setCancellationReason] = useState<CancellationReason | "">("");
  const [returnReason, setReturnReason] = useState<ReturnReason | "">("");
  const [returnResellable, setReturnResellable] = useState<"yes" | "no" | "">("");
  const [courierProviderId, setCourierProviderId] = useState<CourierProviderId | "">("");
  const [trackingId, setTrackingId] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (targetStatus === "confirmed" && !confirmationMethod) {
      setError("Select how this order was confirmed.");
      return;
    }
    if (targetStatus === "cancelled" && !cancellationReason) {
      setError("Select a cancellation reason.");
      return;
    }
    if (targetStatus === "returned" && (!returnReason || !returnResellable)) {
      setError("Select a return reason and whether the item is resellable.");
      return;
    }

    const details: AdminUpdateOrderStatusDetails = {
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(confirmationMethod ? { confirmationMethod } : {}),
      ...(cancellationReason ? { cancellationReason } : {}),
      ...(returnReason ? { returnReason } : {}),
      ...(returnResellable ? { returnResellable: returnResellable === "yes" } : {}),
      ...(targetStatus === "shipped" && !courierAlreadyCreated
        ? {
            courier: {
              ...(courierProviderId ? { providerId: courierProviderId } : {}),
              ...(trackingId.trim() ? { trackingId: trackingId.trim() } : {}),
              ...(trackingUrl.trim() ? { trackingUrl: trackingUrl.trim() } : {}),
            },
          }
        : {}),
    };

    startTransition(async () => {
      const result = await adminUpdateOrderStatus(orderNumber, targetStatus, details);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
      <p className="text-small font-medium text-foreground">Move to &quot;{ORDER_STATUS_LABELS[targetStatus]}&quot;</p>

      {targetStatus === "confirmed" && (
        <fieldset className="flex flex-wrap gap-4 text-small text-foreground">
          <legend className="mb-1 text-xs font-medium text-foreground/70">Confirmed via</legend>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="confirmationMethod" checked={confirmationMethod === "phone"} onChange={() => setConfirmationMethod("phone")} />
            Phone
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="confirmationMethod" checked={confirmationMethod === "whatsapp"} onChange={() => setConfirmationMethod("whatsapp")} />
            WhatsApp
          </label>
        </fieldset>
      )}

      {targetStatus === "cancelled" && (
        <label className="flex flex-col gap-1 text-small text-foreground">
          <span className="text-xs font-medium text-foreground/70">Cancellation reason</span>
          <select value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value as CancellationReason)} className={inputClass}>
            <option value="">Select reason…</option>
            {CANCELLATION_REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {targetStatus === "returned" && (
        <>
          <label className="flex flex-col gap-1 text-small text-foreground">
            <span className="text-xs font-medium text-foreground/70">Return reason</span>
            <select value={returnReason} onChange={(event) => setReturnReason(event.target.value as ReturnReason)} className={inputClass}>
              <option value="">Select reason…</option>
              {RETURN_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="flex flex-wrap gap-4 text-small text-foreground">
            <legend className="mb-1 text-xs font-medium text-foreground/70">Is the returned item resellable?</legend>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="returnResellable" checked={returnResellable === "yes"} onChange={() => setReturnResellable("yes")} />
              Yes — restore stock
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="returnResellable" checked={returnResellable === "no"} onChange={() => setReturnResellable("no")} />
              No — do not restore stock
            </label>
          </fieldset>
        </>
      )}

      {targetStatus === "shipped" && courierAlreadyCreated && (
        <p className="text-xs text-foreground/70">A courier shipment was already created for this order — see the Courier section below. Tracking info is left as-is.</p>
      )}
      {targetStatus === "shipped" && !courierAlreadyCreated && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select value={courierProviderId} onChange={(event) => setCourierProviderId(event.target.value as CourierProviderId | "")} className={inputClass}>
            <option value="">Select courier…</option>
            {COURIER_PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input placeholder="Tracking ID" value={trackingId} onChange={(event) => setTrackingId(event.target.value)} className={inputClass} />
          <input placeholder="Tracking URL" value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} className={inputClass} />
        </div>
      )}

      <label className="flex flex-col gap-1 text-small text-foreground">
        <span className="text-xs font-medium text-foreground/70">Internal note (optional — never shown to the customer)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-small text-foreground"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-small text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" isDisabled={isPending}>
          {isPending ? "Working…" : "Confirm"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onPress={onDone} isDisabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
