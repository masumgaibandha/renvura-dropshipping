"use client";

import { useState } from "react";

import { adminUpdateOrderStatus } from "@/actions/admin/orders";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@/types/order";
import { ConfirmActionButton } from "./ConfirmActionButton";

/** Only ever offers transitions `ORDER_STATUS_TRANSITIONS` allows from the current status — the server independently re-checks the same table, but there's no reason to let an admin pick an option that would just bounce back with an error. */
export function OrderStatusForm({ orderNumber, currentStatus }: { orderNumber: string; currentStatus: OrderStatus }) {
  const nextOptions = ORDER_STATUS_TRANSITIONS[currentStatus];
  const [selected, setSelected] = useState<OrderStatus | "">("");

  if (nextOptions.length === 0) {
    return <p className="text-small text-foreground/70">This order is in a final status — no further changes available.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        aria-label="Change order status to"
        value={selected}
        onChange={(event) => setSelected(event.target.value as OrderStatus)}
        className="h-9 rounded-lg border border-border bg-background px-2 text-small text-foreground"
      >
        <option value="">Change status to…</option>
        {nextOptions.map((status) => (
          <option key={status} value={status}>
            {ORDER_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      {selected && (
        <ConfirmActionButton
          key={selected}
          label={`Update to "${ORDER_STATUS_LABELS[selected]}"`}
          confirmTitle="Update order status?"
          confirmDescription={`This moves the order from "${ORDER_STATUS_LABELS[currentStatus]}" to "${ORDER_STATUS_LABELS[selected]}" and is recorded in the audit log.`}
          confirmLabel="Update status"
          variant="primary"
          onConfirm={() => adminUpdateOrderStatus(orderNumber, selected)}
        />
      )}
    </div>
  );
}
