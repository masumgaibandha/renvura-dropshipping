"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-session";
import { checkPathaoProductionConnection, type PathaoProductionConnectionCheck } from "@/lib/courier/providers/pathao";
import { recordAuditLog } from "@/services/audit-log";
import { createShipmentForOrder, refreshShipmentStatus, setManualCourierTracking } from "@/services/courier";
import { findOrderByOrderNumber } from "@/services/orders";
import type { CourierProviderId } from "@/types/order";

/**
 * Admin courier Server Actions (Phase 13) — mirror the existing `src/actions/admin/orders.ts`
 * pattern exactly: every export independently calls `requireAdmin()` first, never assumes
 * `/admin/layout.tsx` already checked. None of these ever touch `orderStatus`, inventory, or
 * payment — those stay entirely inside `adminUpdateOrderStatus` (see CLAUDE.md's "COD payment
 * safety"/"Inventory safety" notes for this phase).
 */

export type CourierActionResult = { ok: true } | { ok: false; error: string };

const COURIER_PROVIDER_ID_VALUES: CourierProviderId[] = ["pathao", "steadfast", "redx", "paperfly", "other"];

function isValidProviderId(value: unknown): value is CourierProviderId {
  return typeof value === "string" && COURIER_PROVIDER_ID_VALUES.includes(value as CourierProviderId);
}

export async function adminCreateShipment(orderNumber: string, rawProviderId: unknown): Promise<CourierActionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return { ok: false, error: "Not authorized." };
  if (!isValidProviderId(rawProviderId)) return { ok: false, error: "Invalid courier provider." };

  const before = (await findOrderByOrderNumber(orderNumber))?.courier ?? null;
  const result = await createShipmentForOrder(orderNumber, rawProviderId);

  if (!result.ok) {
    await recordAuditLog({
      adminUserId: admin.id,
      action: "courier.shipment_failed",
      entityType: "order",
      entityId: orderNumber,
      before: { creationStatus: before?.creationStatus ?? "not_created" },
      after: { creationStatus: "failed", providerId: rawProviderId },
    });
    return { ok: false, error: result.error };
  }

  await recordAuditLog({
    adminUserId: admin.id,
    action: "courier.shipment_created",
    entityType: "order",
    entityId: orderNumber,
    before: { creationStatus: before?.creationStatus ?? "not_created" },
    after: { creationStatus: "created", providerId: rawProviderId, consignmentId: result.consignmentId },
  });

  revalidatePath(`/admin/orders/${orderNumber}`);
  return { ok: true };
}

export async function adminRefreshCourierStatus(orderNumber: string): Promise<CourierActionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return { ok: false, error: "Not authorized." };

  const result = await refreshShipmentStatus(orderNumber);
  if (!result.ok) return { ok: false, error: result.error };

  await recordAuditLog({
    adminUserId: admin.id,
    action: "courier.status_refreshed",
    entityType: "order",
    entityId: orderNumber,
    before: null,
    after: { normalizedStatus: result.normalizedStatus },
  });

  revalidatePath(`/admin/orders/${orderNumber}`);
  return { ok: true };
}

export interface AdminManualCourierTrackingInput {
  providerId: unknown;
  trackingId?: unknown;
  trackingUrl?: unknown;
  consignmentId?: unknown;
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

export async function adminSetManualCourierTracking(orderNumber: string, raw: AdminManualCourierTrackingInput): Promise<CourierActionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return { ok: false, error: "Not authorized." };
  if (!isValidProviderId(raw.providerId)) return { ok: false, error: "Invalid courier provider." };
  if (!isNullableString(raw.trackingId) || !isNullableString(raw.trackingUrl) || !isNullableString(raw.consignmentId)) {
    return { ok: false, error: "Invalid tracking details." };
  }

  const result = await setManualCourierTracking(orderNumber, {
    providerId: raw.providerId,
    trackingId: raw.trackingId?.trim() || null,
    trackingUrl: raw.trackingUrl?.trim() || null,
    consignmentId: raw.consignmentId?.trim() || null,
  });
  if (!result.ok) return { ok: false, error: result.error };

  await recordAuditLog({
    adminUserId: admin.id,
    action: "courier.manual_tracking_updated",
    entityType: "order",
    entityId: orderNumber,
    before: null,
    after: { providerId: raw.providerId },
  });

  revalidatePath(`/admin/orders/${orderNumber}`);
  return { ok: true };
}

export type AdminPathaoProductionConnectionResult = PathaoProductionConnectionCheck | { outcome: "unauthorized" };

/**
 * Read-only admin diagnostic (Phase 17) — verifies the currently configured Pathao credentials
 * authenticate against the live API and that Renvura's known production store is present/active.
 * Deliberately does NOT call `recordAuditLog()` (unlike every other action in this file) — an
 * audit-log write is itself a MongoDB write, and this diagnostic must never touch MongoDB in any
 * way, only Pathao's own API. `checkPathaoProductionConnection()` itself never requires
 * `COURIER_PATHAO_ENABLED` — that flag gates real shipment creation, not this safe check.
 */
export async function adminCheckPathaoProductionConnection(): Promise<AdminPathaoProductionConnectionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return { outcome: "unauthorized" };
  return checkPathaoProductionConnection();
}
