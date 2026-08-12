"use server";

import { recordAuditLog } from "@/services/audit-log";
import { findOrderByOrderNumber, updateOrderStatusForAdmin } from "@/services/orders";
import { requireAdmin } from "@/lib/auth-session";
import { canTransitionOrderStatus, type OrderStatus } from "@/types/order";

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

export type AdminUpdateOrderStatusResult = { ok: true } | { ok: false; error: string };

export async function adminUpdateOrderStatus(orderNumber: string, rawNewStatus: unknown): Promise<AdminUpdateOrderStatusResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return { ok: false, error: "Not authorized." };
  }

  if (typeof rawNewStatus !== "string" || !ORDER_STATUS_VALUES.includes(rawNewStatus as OrderStatus)) {
    return { ok: false, error: "Invalid order status." };
  }
  const newStatus = rawNewStatus as OrderStatus;

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

  const updated = await updateOrderStatusForAdmin(orderNumber, newStatus, admin.id);
  if (!updated) {
    return { ok: false, error: "Order not found." };
  }

  await recordAuditLog({
    adminUserId: admin.id,
    action: "order.status_changed",
    entityType: "order",
    entityId: orderNumber,
    before: { orderStatus: existing.orderStatus },
    after: { orderStatus: newStatus },
  });

  return { ok: true };
}
