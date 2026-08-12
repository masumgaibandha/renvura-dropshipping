"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-session";
import { validateProduct } from "@/lib/validate-product";
import { recordAuditLog } from "@/services/audit-log";
import {
  adjustProductStockForAdmin,
  createProductForAdmin,
  getProductBySlug,
  setProductFeaturedForAdmin,
  updateProductForAdmin,
  type AdminProductInput,
} from "@/services/products";
import type { InventoryStatus, Product, ProductStatus } from "@/types/product";
import { calculateDiscountPercentage } from "@/utils/pricing";
import { isValidSlug } from "@/utils/slug";

/**
 * Admin product/inventory/homepage-featured mutation Server Actions. Every
 * one independently calls `requireAdmin()` first (never assume the
 * `/admin` layout already checked — see `src/actions/admin/orders.ts`'s
 * doc comment for why) and hand-validates its raw payload before touching
 * the database — a Server Action is a real HTTP endpoint, reachable
 * directly with any payload regardless of what `ProductForm.tsx`'s
 * TypeScript types would normally prevent client-side.
 */

export type AdminActionResult = { ok: true } | { ok: false; error: string };

const PRODUCT_STATUS_VALUES: ProductStatus[] = ["draft", "active", "inactive"];
const INVENTORY_STATUS_VALUES: InventoryStatus[] = ["in_stock", "out_of_stock", "unknown"];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNonNegativeNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSpecificationArray(value: unknown): value is { label: string; value: string }[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const record = item as Record<string, unknown>;
    return typeof record.label === "string" && typeof record.value === "string";
  });
}

/** Hand-rolled runtime validation of the admin product form's raw payload. */
function parseAdminProductInput(raw: unknown): { ok: true; value: AdminProductInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Invalid product data." };
  }
  const r = raw as Record<string, unknown>;

  if (!isNonEmptyString(r.title)) return { ok: false, error: "Title is required." };
  if (!isNonEmptyString(r.category)) return { ok: false, error: "Category is required." };
  if (!isNullableString(r.subcategory)) return { ok: false, error: "Invalid subcategory." };
  if (!isNullableString(r.shortDescription)) return { ok: false, error: "Invalid short description." };
  if (!isNullableString(r.description)) return { ok: false, error: "Invalid description." };
  if (!isNullableString(r.brand)) return { ok: false, error: "Invalid brand." };
  if (!isNullableString(r.model)) return { ok: false, error: "Invalid model." };
  if (!isNullableString(r.sku)) return { ok: false, error: "Invalid SKU." };
  if (!isNullableNonNegativeNumber(r.regularPrice)) return { ok: false, error: "Regular price must be a non-negative number or empty." };
  if (!isNullableNonNegativeNumber(r.sellingPrice)) return { ok: false, error: "Selling price must be a non-negative number or empty." };
  if (r.stock !== null && !(typeof r.stock === "number" && Number.isInteger(r.stock) && r.stock >= 0)) {
    return { ok: false, error: "Stock must be a non-negative whole number or empty." };
  }
  if (typeof r.inventoryStatus !== "string" || !INVENTORY_STATUS_VALUES.includes(r.inventoryStatus as InventoryStatus)) {
    return { ok: false, error: "Invalid stock status." };
  }
  if (typeof r.status !== "string" || !PRODUCT_STATUS_VALUES.includes(r.status as ProductStatus)) {
    return { ok: false, error: "Invalid product status." };
  }
  if (typeof r.featured !== "boolean") return { ok: false, error: "Invalid featured value." };
  if (!isNullableString(r.thumbnail)) return { ok: false, error: "Invalid thumbnail path." };
  if (!isStringArray(r.images)) return { ok: false, error: "Invalid image list." };
  if (!isStringArray(r.features)) return { ok: false, error: "Invalid feature list." };
  if (!isSpecificationArray(r.specifications)) return { ok: false, error: "Invalid specification list." };
  if (r.images.some((path) => !path.startsWith("/products/"))) {
    return { ok: false, error: "Image paths must live under /products/ — never a supplier screenshot or external URL." };
  }
  if (r.thumbnail && !r.thumbnail.startsWith("/products/")) {
    return { ok: false, error: "Thumbnail path must live under /products/." };
  }

  return {
    ok: true,
    value: {
      title: r.title.trim(),
      shortDescription: r.shortDescription,
      description: r.description,
      category: r.category,
      subcategory: r.subcategory,
      brand: r.brand,
      model: r.model,
      sku: r.sku,
      regularPrice: r.regularPrice,
      sellingPrice: r.sellingPrice,
      stock: r.stock as number | null,
      inventoryStatus: r.inventoryStatus as InventoryStatus,
      status: r.status as ProductStatus,
      featured: r.featured,
      thumbnail: r.thumbnail,
      images: r.images,
      features: r.features,
      specifications: r.specifications,
    },
  };
}

function revalidateStorefrontForProduct(product: Pick<Product, "slug" | "category" | "subcategory">) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/products/${product.slug}`);
  revalidatePath(`/${product.category}`);
  if (product.subcategory) revalidatePath(`/${product.subcategory}`);
}

export async function adminUpdateProduct(slug: string, raw: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return { ok: false, error: "Not authorized." };

  const parsed = parseAdminProductInput(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const existing = await getProductBySlug(slug);
  if (!existing) return { ok: false, error: "Product not found." };

  const candidate: Product = {
    id: slug,
    slug,
    title: parsed.value.title,
    shortDescription: parsed.value.shortDescription,
    description: parsed.value.description,
    category: parsed.value.category,
    subcategory: parsed.value.subcategory,
    brand: parsed.value.brand,
    model: parsed.value.model,
    sku: parsed.value.sku,
    pricing: {
      currency: "BDT",
      wholesalePrice: existing.pricing.wholesalePrice,
      regularPrice: parsed.value.regularPrice,
      sellingPrice: parsed.value.sellingPrice,
      discountPercentage: calculateDiscountPercentage(parsed.value.regularPrice, parsed.value.sellingPrice),
    },
    media: { thumbnail: parsed.value.thumbnail, images: parsed.value.images, videos: existing.media.videos },
    inventory: { stock: parsed.value.stock, unit: existing.inventory.unit, status: parsed.value.inventoryStatus },
    variants: existing.variants,
    features: parsed.value.features,
    specifications: parsed.value.specifications,
    seo: existing.seo,
    status: parsed.value.status,
    tags: existing.tags,
    featured: parsed.value.featured,
  };
  const issues = validateProduct(candidate);
  if (issues.length > 0) {
    return { ok: false, error: issues.map((issue) => issue.message).join(" ") };
  }

  const updated = await updateProductForAdmin(slug, parsed.value);
  if (!updated) return { ok: false, error: "Product not found." };

  await recordAuditLog({
    adminUserId: admin.id,
    action: "product.updated",
    entityType: "product",
    entityId: slug,
    before: { sellingPrice: existing.pricing.sellingPrice, stock: existing.inventory.stock, status: existing.status },
    after: { sellingPrice: updated.pricing.sellingPrice, stock: updated.inventory.stock, status: updated.status },
  });

  revalidateStorefrontForProduct(updated);
  return { ok: true };
}

export async function adminCreateProduct(rawSlug: unknown, raw: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return { ok: false, error: "Not authorized." };

  if (typeof rawSlug !== "string" || !isValidSlug(rawSlug)) {
    return { ok: false, error: "Slug must be lowercase-kebab-case (e.g. my-new-product)." };
  }
  const parsed = parseAdminProductInput(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const existing = await getProductBySlug(rawSlug);
  if (existing) return { ok: false, error: `A product with slug "${rawSlug}" already exists.` };

  const candidate: Product = {
    id: rawSlug,
    slug: rawSlug,
    title: parsed.value.title,
    shortDescription: parsed.value.shortDescription,
    description: parsed.value.description,
    category: parsed.value.category,
    subcategory: parsed.value.subcategory,
    brand: parsed.value.brand,
    model: parsed.value.model,
    sku: parsed.value.sku,
    pricing: {
      currency: "BDT",
      wholesalePrice: null,
      regularPrice: parsed.value.regularPrice,
      sellingPrice: parsed.value.sellingPrice,
      discountPercentage: calculateDiscountPercentage(parsed.value.regularPrice, parsed.value.sellingPrice),
    },
    media: { thumbnail: parsed.value.thumbnail, images: parsed.value.images, videos: [] },
    inventory: { stock: parsed.value.stock, unit: null, status: parsed.value.inventoryStatus },
    features: parsed.value.features,
    specifications: parsed.value.specifications,
    status: parsed.value.status,
    featured: parsed.value.featured,
  };
  const issues = validateProduct(candidate);
  if (issues.length > 0) {
    return { ok: false, error: issues.map((issue) => issue.message).join(" ") };
  }

  const created = await createProductForAdmin(rawSlug, parsed.value);

  await recordAuditLog({
    adminUserId: admin.id,
    action: "product.created",
    entityType: "product",
    entityId: rawSlug,
    before: null,
    after: { sellingPrice: created.pricing.sellingPrice, stock: created.inventory.stock, status: created.status },
  });

  revalidateStorefrontForProduct(created);
  return { ok: true };
}

export async function adminSetFeatured(slug: string, rawFeatured: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return { ok: false, error: "Not authorized." };
  if (typeof rawFeatured !== "boolean") return { ok: false, error: "Invalid featured value." };

  const updated = await setProductFeaturedForAdmin(slug, rawFeatured);
  if (!updated) return { ok: false, error: "Product not found." };

  await recordAuditLog({
    adminUserId: admin.id,
    action: "product.featured_changed",
    entityType: "homepage",
    entityId: slug,
    before: { featured: !rawFeatured },
    after: { featured: rawFeatured },
  });

  revalidateStorefrontForProduct(updated);
  return { ok: true };
}

export async function adminAdjustStock(slug: string, rawNewStock: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return { ok: false, error: "Not authorized." };
  if (typeof rawNewStock !== "number" || !Number.isInteger(rawNewStock) || rawNewStock < 0) {
    return { ok: false, error: "Stock must be a non-negative whole number." };
  }

  const existing = await getProductBySlug(slug);
  if (!existing) return { ok: false, error: "Product not found." };

  const updated = await adjustProductStockForAdmin(slug, rawNewStock);
  if (!updated) return { ok: false, error: "Product not found." };

  await recordAuditLog({
    adminUserId: admin.id,
    action: "inventory.stock_adjusted",
    entityType: "inventory",
    entityId: slug,
    before: { stock: existing.inventory.stock },
    after: { stock: rawNewStock },
  });

  revalidateStorefrontForProduct(updated);
  return { ok: true };
}
