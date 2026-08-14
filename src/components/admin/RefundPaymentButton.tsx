"use client";

import { markPaymentRefunded } from "@/actions/admin/payments";
import { ConfirmActionButton } from "./ConfirmActionButton";

/** Client Component wrapper so the Server Component order-detail page can pass a real closure — see `PaymentVerificationActions.tsx`'s doc comment for why this can't be inlined directly. Only ever rendered when `payment.status === "paid"` on a `cancelled`/`returned` order (see `src/actions/admin/payments.ts`'s `markPaymentRefunded`). */
export function RefundPaymentButton({ orderNumber }: { orderNumber: string }) {
  return (
    <ConfirmActionButton
      label="Mark Refunded"
      confirmTitle="Mark this payment as refunded?"
      confirmDescription={`Records that ${orderNumber}'s payment was refunded outside this app (in bKash/Nagad/Rocket) — this action does not move any money itself. This is recorded in the audit log.`}
      confirmLabel="Mark Refunded"
      variant="secondary"
      size="sm"
      onConfirm={() => markPaymentRefunded(orderNumber)}
    />
  );
}
