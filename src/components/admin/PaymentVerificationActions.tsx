"use client";

import { markPaymentFailed, markPaymentPaid } from "@/actions/admin/payments";
import { ConfirmActionButton } from "./ConfirmActionButton";

/**
 * A Server Component can't pass an inline closure (`() => markPaymentPaid(x)`) as a prop to a
 * Client Component — only an actual Server Action reference serializes across that boundary, not
 * an arbitrary function wrapping one (see https://nextjs.org/docs/messages/react-client-hook-in-server-component
 * / "Event handlers cannot be passed to Client Component props"). This tiny Client Component
 * builds the closure client-side instead, mirroring `OrderStatusForm.tsx`'s existing pattern.
 */
export function PaymentVerificationActions({ orderNumber, transactionId }: { orderNumber: string; transactionId: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <ConfirmActionButton
        label="Mark Paid"
        confirmTitle="Mark this payment as paid?"
        confirmDescription={`Confirms ${transactionId ?? "this transaction"} was received for ${orderNumber}. This is recorded in the audit log.`}
        confirmLabel="Mark Paid"
        variant="primary"
        size="sm"
        onConfirm={() => markPaymentPaid(orderNumber)}
      />
      <ConfirmActionButton
        label="Mark Failed"
        confirmTitle="Mark this payment as failed?"
        confirmDescription={`This means ${orderNumber}'s payment could not be verified. This is recorded in the audit log.`}
        confirmLabel="Mark Failed"
        variant="danger"
        size="sm"
        onConfirm={() => markPaymentFailed(orderNumber)}
      />
    </div>
  );
}
