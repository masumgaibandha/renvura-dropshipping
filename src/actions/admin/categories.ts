"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-session";
import { recordAuditLog } from "@/services/audit-log";
import {
  getAllCategories,
  insertCategoryForAdmin,
  setCategoryActiveForAdmin,
  updateCategoryForAdmin,
  type AdminCategoryInput,
} from "@/services/products";
import { isValidSlug } from "@/utils/slug";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

async function parseAdminCategoryInput(raw: unknown): Promise<{ ok: true; value: AdminCategoryInput } | { ok: false; error: string }> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Invalid category data." };
  }
  const r = raw as Record<string, unknown>;

  if (!isNonEmptyString(r.name)) return { ok: false, error: "Name is required." };
  if (!isNullableString(r.description)) return { ok: false, error: "Invalid description." };
  if (!isNullableString(r.parentSlug)) return { ok: false, error: "Invalid parent category." };
  if (typeof r.displayOrder !== "number" || !Number.isInteger(r.displayOrder)) {
    return { ok: false, error: "Display order must be a whole number." };
  }

  if (r.parentSlug) {
    const categories = await getAllCategories();
    if (!categories.some((category) => category.slug === r.parentSlug)) {
      return { ok: false, error: `"${r.parentSlug}" is not a known category.` };
    }
  }

  return {
    ok: true,
    value: { name: r.name.trim(), description: r.description, parentSlug: r.parentSlug, displayOrder: r.displayOrder },
  };
}

function revalidateStorefrontForCategories() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/electronics-gadgets");
  revalidatePath("/health-beauty");
}

export async function adminCreateCategory(rawSlug: unknown, raw: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return { ok: false, error: "Not authorized." };

  if (typeof rawSlug !== "string" || !isValidSlug(rawSlug)) {
    return { ok: false, error: "Slug must be lowercase-kebab-case (e.g. my-new-category)." };
  }

  const categories = await getAllCategories();
  if (categories.some((category) => category.slug === rawSlug)) {
    return { ok: false, error: `A category with slug "${rawSlug}" already exists.` };
  }

  const parsed = await parseAdminCategoryInput(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const created = await insertCategoryForAdmin(rawSlug, parsed.value);

  await recordAuditLog({
    adminUserId: admin.id,
    action: "category.created",
    entityType: "category",
    entityId: rawSlug,
    before: null,
    after: { name: created.name, parentSlug: created.parentSlug, displayOrder: created.displayOrder },
  });

  revalidateStorefrontForCategories();
  return { ok: true };
}

export async function adminUpdateCategory(slug: string, raw: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return { ok: false, error: "Not authorized." };

  const parsed = await parseAdminCategoryInput(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  if (parsed.value.parentSlug === slug) {
    return { ok: false, error: "A category cannot be its own parent." };
  }

  const categories = await getAllCategories();
  const existing = categories.find((category) => category.slug === slug);
  if (!existing) return { ok: false, error: "Category not found." };

  const updated = await updateCategoryForAdmin(slug, parsed.value);
  if (!updated) return { ok: false, error: "Category not found." };

  await recordAuditLog({
    adminUserId: admin.id,
    action: "category.updated",
    entityType: "category",
    entityId: slug,
    before: { name: existing.name, parentSlug: existing.parentSlug, displayOrder: existing.displayOrder },
    after: { name: updated.name, parentSlug: updated.parentSlug, displayOrder: updated.displayOrder },
  });

  revalidateStorefrontForCategories();
  return { ok: true };
}

export async function adminSetCategoryActive(slug: string, rawIsActive: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return { ok: false, error: "Not authorized." };
  if (typeof rawIsActive !== "boolean") return { ok: false, error: "Invalid active value." };

  const updated = await setCategoryActiveForAdmin(slug, rawIsActive);
  if (!updated) return { ok: false, error: "Category not found." };

  await recordAuditLog({
    adminUserId: admin.id,
    action: "category.active_changed",
    entityType: "category",
    entityId: slug,
    before: { isActive: !rawIsActive },
    after: { isActive: rawIsActive },
  });

  revalidateStorefrontForCategories();
  return { ok: true };
}
