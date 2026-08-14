"use server";

import { after } from "next/server";

import { requireAdmin } from "@/lib/auth-session";
import { sendOrderStatusEmail } from "@/lib/email-provider";
import { recordAuditLog } from "@/services/audit-log";
import { applyInventoryMovements } from "@/services/inventory";
import {
  findOrderByOrderNumber,
  recordStatusEmailResult,
  toOrderSummary,
  updateOrderStatusForAdmin,
  updatePaymentStatusForAdmin,
} from "@/services/orders";
import {
  canTransitionOrderStatus,
  INVENTORY_DECREMENTED_STATUSES,
  type CancellationReason,
  type ConfirmationMethod,
  type OrderStatus,
  type OrderSummary,
  type ReturnReason,
  type StatusEmailStatus,
} from "@/types/order";

/**
 * Admin order-mutation Server Actions. Every one independently calls
 * `requireAdmin()` first — never assume `/admin/layout.tsx` already
 * checked, since a Server Action is directly reachable by anyone who can
 * send the same POST (Next.js's own documented threat model), layout or
 * no layout.
 */

const ORDER_STATUS_VALUES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "supplier_submitted",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

const CONFIRMATION_METHOD_VALUES: ConfirmationMethod[] = ["phone", "whatsapp"];
const CANCELLATION_REASON_VALUES: CancellationReason[] = [
  "customer_request",
  "unreachable",
  "out_of_stock",
  "invalid_order",
  "payment_failed",
  "duplicate",
  "other",
];
const RETURN_REASON_VALUES: ReturnReason[] = ["damaged", "wrong_item", "customer_return", "delivery_failure", "other"];
const STATUS_EMAIL_STATUSES: StatusEmailStatus[] = ["confirmed", "shipped", "delivered", "cancelled", "returned"];

const MAX_NOTE_LENGTH = 1000;
const MAX_STORED_EMAIL_ERROR_LENGTH = 500;

export interface AdminUpdateOrderStatusDetails {
  note?: string;
  confirmationMethod?: ConfirmationMethod;
  cancellationReason?: CancellationReason;
  returnReason?: ReturnReason;
  returnResellable?: boolean;
  courier?: { provider?: string; trackingId?: string; trackingUrl?: string; consignmentId?: string };
}

interface ParsedDetails {
  note: string | null;
  confirmationMethod: ConfirmationMethod | null;
  cancellationReason: CancellationReason | null;
  returnReason: ReturnReason | null;
  returnResellable: boolean | null;
  courier: { provider?: string; trackingId?: string; trackingUrl?: string; consignmentId?: string } | null;
}

/** Hand-rolled runtime validation of the raw details payload — a Server Action is a real HTTP endpoint, reachable directly with any payload regardless of what the TypeScript types would normally prevent client-side. */
function parseDetails(raw: unknown): { ok: true; value: ParsedDetails } | { ok: false; error: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, value: { note: null, confirmationMethod: null, cancellationReason: null, returnReason: null, returnResellable: null, courier: null } };
  }
  if (typeof raw !== "object") {
    return { ok: false, error: "Invalid request." };
  }
  const r = raw as Record<string, unknown>;

  let note: string | null = null;
  if (r.note !== undefined) {
    if (typeof r.note !== "string") return { ok: false, error: "Invalid note." };
    const trimmed = r.note.trim();
    if (trimmed.length > MAX_NOTE_LENGTH) return { ok: false, error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer.` };
    note = trimmed.length > 0 ? trimmed : null;
  }

  let confirmationMethod: ConfirmationMethod | null = null;
  if (r.confirmationMethod !== undefined) {
    if (typeof r.confirmationMethod !== "string" || !CONFIRMATION_METHOD_VALUES.includes(r.confirmationMethod as ConfirmationMethod)) {
      return { ok: false, error: "Invalid confirmation method." };
    }
    confirmationMethod = r.confirmationMethod as ConfirmationMethod;
  }

  let cancellationReason: CancellationReason | null = null;
  if (r.cancellationReason !== undefined) {
    if (typeof r.cancellationReason !== "string" || !CANCELLATION_REASON_VALUES.includes(r.cancellationReason as CancellationReason)) {
      return { ok: false, error: "Invalid cancellation reason." };
    }
    cancellationReason = r.cancellationReason as CancellationReason;
  }

  let returnReason: ReturnReason | null = null;
  if (r.returnReason !== undefined) {
    if (typeof r.returnReason !== "string" || !RETURN_REASON_VALUES.includes(r.returnReason as ReturnReason)) {
      return { ok: false, error: "Invalid return reason." };
    }
    returnReason = r.returnReason as ReturnReason;
  }

  let returnResellable: boolean | null = null;
  if (r.returnResellable !== undefined) {
    if (typeof r.returnResellable !== "boolean") return { ok: false, error: "Invalid resellable value." };
    returnResellable = r.returnResellable;
  }

  let courier: ParsedDetails["courier"] = null;
  if (r.courier !== undefined) {
    if (typeof r.courier !== "object" || r.courier === null) return { ok: false, error: "Invalid courier details." };
    const c = r.courier as Record<string, unknown>;
    const fields: (keyof NonNullable<ParsedDetails["courier"]>)[] = ["provider", "trackingId", "trackingUrl", "consignmentId"];
    const parsedCourier: NonNullable<ParsedDetails["courier"]> = {};
    for (const field of fields) {
      if (c[field] === undefined) continue;
      if (typeof c[field] !== "string") return { ok: false, error: "Invalid courier details." };
      const trimmed = (c[field] as string).trim();
      if (trimmed.length > 0) parsedCourier[field] = trimmed;
    }
    courier = parsedCourier;
  }

  return { ok: true, value: { note, confirmationMethod, cancellationReason, returnReason, returnResellable, courier } };
}

/**
 * Fires the status-change email (Phase 12) via `after()`, same deferred/non-blocking pattern as
 * `scheduleOrderConfirmationEmail`/`scheduleMetaPurchaseCapi` (`src/actions/orders.ts`) — a slow or
 * failed Resend call can never affect the already-completed admin action.
 */
function scheduleStatusEmail(order: OrderSummary, status: StatusEmailStatus): void {
  const email = order.customer.email;
  if (!email) return;

  after(async () => {
    const result = await sendOrderStatusEmail({ to: email, order, status });
    if (result.status === "sent") {
      await recordStatusEmailResult(order.orderNumber, status, { status: "sent", providerMessageId: result.providerMessageId });
      return;
    }
    console.error(`adminUpdateOrderStatus: ${status} email failed for ${order.orderNumber}`, result.lastError);
    await recordStatusEmailResult(order.orderNumber, status, { status: "failed", lastError: result.lastError.slice(0, MAX_STORED_EMAIL_ERROR_LENGTH) });
  });
}

export type AdminUpdateOrderStatusResult = { ok: true } | { ok: false; error: string };

export async function adminUpdateOrderStatus(orderNumber: string, rawNewStatus: unknown, rawDetails?: unknown): Promise<AdminUpdateOrderStatusResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return { ok: false, error: "Not authorized." };
  }

  if (typeof rawNewStatus !== "string" || !ORDER_STATUS_VALUES.includes(rawNewStatus as OrderStatus)) {
    return { ok: false, error: "Invalid order status." };
  }
  const newStatus = rawNewStatus as OrderStatus;

  const parsedDetails = parseDetails(rawDetails);
  if (!parsedDetails.ok) {
    return { ok: false, error: parsedDetails.error };
  }
  const details = parsedDetails.value;

  const existing = await findOrderByOrderNumber(orderNumber);
  if (!existing) {
    return { ok: false, error: "Order not found." };
  }

  if (existing.orderStatus === newStatus) {
    return { ok: true };
  }

  if (!canTransitionOrderStatus(existing.orderStatus, newStatus)) {
    return { ok: false, error: `Cannot move an order from "${existing.orderStatus}" to "${newStatus}".` };
  }

  if (newStatus === "confirmed" && !details.confirmationMethod) {
    return { ok: false, error: "Select how this order was confirmed (phone or WhatsApp)." };
  }
  if (newStatus === "cancelled" && !details.cancellationReason) {
    return { ok: false, error: "Select a cancellation reason." };
  }
  if (newStatus === "returned" && (!details.returnReason || details.returnResellable === null)) {
    return { ok: false, error: "Select a return reason and whether the item is resellable." };
  }

  const updated = await updateOrderStatusForAdmin({
    orderNumber,
    expectedCurrentStatus: existing.orderStatus,
    newStatus,
    adminUserId: admin.id,
    note: details.note,
    confirmation: newStatus === "confirmed" ? { method: details.confirmationMethod!, note: details.note } : undefined,
    cancellation: newStatus === "cancelled" ? { reason: details.cancellationReason!, note: details.note } : undefined,
    returnInfo: newStatus === "returned" ? { reason: details.returnReason!, resellable: details.returnResellable!, note: details.note } : undefined,
    courier: newStatus === "shipped" ? (details.courier ?? {}) : undefined,
  });

  if (!updated) {
    return { ok: false, error: "This order was already updated by someone else. Please refresh and try again." };
  }

  await recordAuditLog({
    adminUserId: admin.id,
    action: "order.status_changed",
    entityType: "order",
    entityId: orderNumber,
    before: { orderStatus: existing.orderStatus },
    after: { orderStatus: newStatus, ...(details.note ? { note: details.note } : {}) },
  });

  // Inventory coordination — see src/services/inventory.ts's doc comment for why this is safe
  // exactly-once given `updateOrderStatusForAdmin`'s compare-and-swap already succeeded above.
  const movementItems = existing.items.map((item) => ({ productId: item.slug, quantity: item.quantity }));

  if (newStatus === "confirmed") {
    await applyInventoryMovements(movementItems, "order_confirmed", { orderNumber, actorUserId: admin.id, direction: "decrement" });
    await recordAuditLog({
      adminUserId: admin.id,
      action: "inventory.order_confirmed_decrement",
      entityType: "inventory",
      entityId: orderNumber,
      before: null,
      after: { items: movementItems.length },
    });
  } else if (newStatus === "cancelled" && INVENTORY_DECREMENTED_STATUSES.includes(existing.orderStatus)) {
    await applyInventoryMovements(movementItems, "order_cancelled_restore", { orderNumber, actorUserId: admin.id, direction: "restore" });
    await recordAuditLog({
      adminUserId: admin.id,
      action: "inventory.order_cancelled_restore",
      entityType: "inventory",
      entityId: orderNumber,
      before: null,
      after: { items: movementItems.length },
    });
  } else if (newStatus === "returned" && details.returnResellable === true) {
    await applyInventoryMovements(movementItems, "order_returned_restore", { orderNumber, actorUserId: admin.id, direction: "restore" });
    await recordAuditLog({
      adminUserId: admin.id,
      action: "inventory.order_returned_restore",
      entityType: "inventory",
      entityId: orderNumber,
      before: null,
      after: { items: movementItems.length },
    });
  }

  // Payment coordination: a COD order that reaches the customer's door and is marked delivered
  // means cash was collected — see CLAUDE.md's "Payment + order status coordination" section for
  // why this is the one automatic payment-status change in the whole system (every manual-payment
  // transition stays a deliberate, separate admin action).
  if (newStatus === "delivered" && existing.payment.method === "cash_on_delivery" && existing.payment.status === "cod_pending") {
    const paymentUpdated = await updatePaymentStatusForAdmin(orderNumber, "paid");
    if (paymentUpdated) {
      await recordAuditLog({
        adminUserId: admin.id,
        action: "payment.cod_marked_paid_on_delivery",
        entityType: "payment",
        entityId: orderNumber,
        before: { paymentStatus: "cod_pending" },
        after: { paymentStatus: "paid" },
      });
    }
  }

  if (STATUS_EMAIL_STATUSES.includes(newStatus as StatusEmailStatus) && updated.customer.email) {
    scheduleStatusEmail(toOrderSummary(updated), newStatus as StatusEmailStatus);
  }

  return { ok: true };
}
