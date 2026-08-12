"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-session";
import { recordAuditLog } from "@/services/audit-log";
import { getStoreSettings, updateStoreSettings, type StoreSettingsInput } from "@/services/settings";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parseStoreSettingsInput(raw: unknown): { ok: true; value: StoreSettingsInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Invalid settings data." };
  }
  const r = raw as Record<string, unknown>;

  if (!isNonEmptyString(r.storeName)) return { ok: false, error: "Store name is required." };
  if (!isNullableString(r.supportEmail)) return { ok: false, error: "Invalid support email." };
  if (r.supportEmail && !/^\S+@\S+\.\S+$/.test(r.supportEmail)) return { ok: false, error: "Enter a valid support email." };
  if (!isNullableString(r.supportPhone)) return { ok: false, error: "Invalid support phone." };
  if (!isNonNegativeNumber(r.insideDhakaDeliveryFee)) return { ok: false, error: "Inside-Dhaka delivery fee must be a non-negative number." };
  if (!isNonNegativeNumber(r.outsideDhakaDeliveryFee)) return { ok: false, error: "Outside-Dhaka delivery fee must be a non-negative number." };
  if (!isNonNegativeNumber(r.lowStockThreshold) || !Number.isInteger(r.lowStockThreshold)) {
    return { ok: false, error: "Low-stock threshold must be a non-negative whole number." };
  }

  return {
    ok: true,
    value: {
      storeName: r.storeName.trim(),
      supportEmail: r.supportEmail,
      supportPhone: r.supportPhone,
      insideDhakaDeliveryFee: r.insideDhakaDeliveryFee,
      outsideDhakaDeliveryFee: r.outsideDhakaDeliveryFee,
      lowStockThreshold: r.lowStockThreshold,
    },
  };
}

/**
 * The one write path for `StoreSettings` (Phase 10). Delivery fees are
 * business-approved values (see CLAUDE.md) — this action doesn't second-
 * guess that, it just makes a live edit auditable and immediately
 * reflected at checkout via `revalidatePath`, since `getDeliveryFees()` is
 * the authoritative source `recalculateOrder` reads at order time
 * regardless of any client-side cache.
 */
export async function adminUpdateStoreSettings(raw: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return { ok: false, error: "Not authorized." };

  const parsed = parseStoreSettingsInput(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const existing = await getStoreSettings();
  const updated = await updateStoreSettings(parsed.value);

  await recordAuditLog({
    adminUserId: admin.id,
    action: "settings.updated",
    entityType: "settings",
    entityId: "store",
    before: { insideDhakaDeliveryFee: existing.insideDhakaDeliveryFee, outsideDhakaDeliveryFee: existing.outsideDhakaDeliveryFee, lowStockThreshold: existing.lowStockThreshold },
    after: { insideDhakaDeliveryFee: updated.insideDhakaDeliveryFee, outsideDhakaDeliveryFee: updated.outsideDhakaDeliveryFee, lowStockThreshold: updated.lowStockThreshold },
  });

  revalidatePath("/checkout");
  revalidatePath("/admin/settings/delivery");
  return { ok: true };
}
