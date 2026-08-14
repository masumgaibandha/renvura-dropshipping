"use server";

import { requireAdmin } from "@/lib/auth-session";
import { recordAuditLog } from "@/services/audit-log";
import { findOrderByOrderNumber, updatePaymentStatusForAdmin } from "@/services/orders";

/**
 * Manual-payment verification actions for `/admin/payments`. Only ever
 * moves `payment.status` between `pending_verification` and `paid`/
 * `failed` — COD orders (`cod_pending`) never reach this queue in the
 * first place (see `getPendingVerificationOrders`), so these actions
 * refuse to touch anything not currently `pending_verification`.
 */

export type MarkPaymentResult = { ok: true } | { ok: false; error: string };

async function markPayment(orderNumber: string, action: "mark_paid" | "mark_failed", nextStatus: "paid" | "failed"): Promise<MarkPaymentResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return { ok: false, error: "Not authorized." };
  }

  const existing = await findOrderByOrderNumber(orderNumber);
  if (!existing) {
    return { ok: false, error: "Order not found." };
  }

  if (existing.payment.status !== "pending_verification") {
    return { ok: false, error: `This order's payment is "${existing.payment.status}", not awaiting verification.` };
  }

  const updated = await updatePaymentStatusForAdmin(orderNumber, nextStatus);
  if (!updated) {
    return { ok: false, error: "Order not found." };
  }

  await recordAuditLog({
    adminUserId: admin.id,
    action: `payment.${action}`,
    entityType: "payment",
    entityId: orderNumber,
    before: { paymentStatus: "pending_verification" },
    after: { paymentStatus: nextStatus },
  });

  return { ok: true };
}

export async function markPaymentPaid(orderNumber: string): Promise<MarkPaymentResult> {
  return markPayment(orderNumber, "mark_paid", "paid");
}

export async function markPaymentFailed(orderNumber: string): Promise<MarkPaymentResult> {
  return markPayment(orderNumber, "mark_failed", "failed");
}

/**
 * Phase 12 — a manual-payment order (bKash/Nagad/Rocket) that was already `paid` and then got
 * cancelled or returned may need a real-world refund handled outside this app (the actual money
 * movement happens in bKash/Nagad/Rocket's own app, same as the original payment) — this action
 * only records that the refund happened, it never sends money anywhere. Deliberately a separate,
 * explicit admin action rather than something `adminUpdateOrderStatus` triggers automatically on
 * cancellation — the same "never automatically assume a payment outcome" principle already applied
 * to `markPaymentPaid`/`markPaymentFailed` above. Only ever moves `paid` -> `refunded`; COD orders
 * (which never reach `paid` through this queue) and manual orders that were never verified paid in
 * the first place have nothing to refund.
 */
export async function markPaymentRefunded(orderNumber: string): Promise<MarkPaymentResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return { ok: false, error: "Not authorized." };
  }

  const existing = await findOrderByOrderNumber(orderNumber);
  if (!existing) {
    return { ok: false, error: "Order not found." };
  }

  if (existing.payment.status !== "paid") {
    return { ok: false, error: `This order's payment is "${existing.payment.status}", not "paid" — nothing to refund.` };
  }

  const updated = await updatePaymentStatusForAdmin(orderNumber, "refunded");
  if (!updated) {
    return { ok: false, error: "Order not found." };
  }

  await recordAuditLog({
    adminUserId: admin.id,
    action: "payment.mark_refunded",
    entityType: "payment",
    entityId: orderNumber,
    before: { paymentStatus: "paid" },
    after: { paymentStatus: "refunded" },
  });

  return { ok: true };
}
