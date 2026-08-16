import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { ProductModel } from "@/models/Product";
import { calculateDiscountPercentage } from "@/utils/pricing";
import { isValidSlug } from "@/utils/slug";

import type { SelfShopImportManifestEntry, SelfShopImportOutcome } from "./types";

/**
 * SelfShop import core (Phase 17) — the reusable logic behind `scripts/import-selfshop-products.ts`.
 * Framework-agnostic (no CLI/argv handling here) so it can be called from a script today and from
 * an admin action later without duplicating logic. Never touches SelfShop itself (no login, no
 * order, no account change) — every function here only reads a manifest entry and reads/writes
 * MongoDB, matching the "browser only navigates/reads, persistence goes through the validated
 * importer" separation this phase was designed around.
 */

export function computeContentHash(data: { title: string; description: string; images: string[] }): string {
  const canonical = JSON.stringify({ title: data.title.trim(), description: data.description.trim(), images: [...data.images].sort() });
  return createHash("sha256").update(canonical).digest("hex");
}

export function validateManifestEntry(entry: SelfShopImportManifestEntry): string[] {
  const errors: string[] = [];
  const { supplier, supplierData, renvura } = entry;

  if (supplier.provider !== "selfshop") errors.push("supplier.provider must be \"selfshop\".");
  if (!supplier.productId?.trim()) errors.push("supplier.productId is required.");
  if (!supplier.sourceUrl?.trim() || !/^https:\/\//.test(supplier.sourceUrl)) errors.push("supplier.sourceUrl must be a valid https URL.");
  if (!supplier.lastCheckedAt || Number.isNaN(Date.parse(supplier.lastCheckedAt))) errors.push("supplier.lastCheckedAt must be a valid ISO timestamp.");

  if (!supplierData.title?.trim()) errors.push("supplierData.title is required.");
  if (!(typeof supplierData.wholesalePrice === "number" && supplierData.wholesalePrice > 0)) errors.push("supplierData.wholesalePrice must be a positive number.");
  if (!(typeof supplierData.stock === "number" && Number.isInteger(supplierData.stock) && supplierData.stock >= 0)) {
    errors.push("supplierData.stock must be a non-negative integer.");
  }
  if (supplierData.shippingWeightGrams !== null && !(typeof supplierData.shippingWeightGrams === "number" && supplierData.shippingWeightGrams > 0)) {
    errors.push("supplierData.shippingWeightGrams must be null or a positive number — never estimated, never zero.");
  }
  if (!Array.isArray(supplierData.images) || supplierData.images.length === 0) {
    errors.push("supplierData.images must be a non-empty array.");
  } else if (!supplierData.images.every((url) => /^https:\/\//.test(url))) {
    errors.push("Every supplierData.images entry must be a valid https URL.");
  }

  if (!renvura.title?.trim()) errors.push("renvura.title is required.");
  if (!isValidSlug(renvura.slug)) errors.push("renvura.slug must be a valid slug (lowercase, hyphenated).");
  if (!renvura.category?.trim()) errors.push("renvura.category is required.");
  if (!(typeof renvura.regularPrice === "number" && renvura.regularPrice > 0)) errors.push("renvura.regularPrice must be a positive number.");
  if (!(typeof renvura.sellingPrice === "number" && renvura.sellingPrice > 0)) errors.push("renvura.sellingPrice must be a positive number.");
  if (renvura.sellingPrice > renvura.regularPrice) errors.push("renvura.sellingPrice must not exceed renvura.regularPrice.");
  if (!["draft", "active", "inactive"].includes(renvura.status)) errors.push("renvura.status must be draft, active, or inactive.");

  return errors;
}

interface ExistingProductSnapshot {
  slug: string;
  wholesalePrice: number | null;
  stock: number | null;
  shippingWeightGrams: number | null;
  sellingPrice: number | null;
  contentHash: string | null;
}

export async function findExistingProduct(entry: SelfShopImportManifestEntry): Promise<ExistingProductSnapshot | null> {
  const doc = await ProductModel.findOne({
    $or: [
      { slug: entry.renvura.slug },
      { "supplier.sourceUrl": entry.supplier.sourceUrl },
      { "supplier.provider": entry.supplier.provider, "supplier.productId": entry.supplier.productId },
    ],
  })
    .select({ slug: 1, "pricing.wholesalePrice": 1, "pricing.sellingPrice": 1, "inventory.stock": 1, "inventory.shippingWeightGrams": 1, "supplier.contentHash": 1 })
    .lean<{ slug: string; pricing: { wholesalePrice: number | null; sellingPrice: number | null }; inventory: { stock: number | null; shippingWeightGrams: number | null }; supplier?: { contentHash?: string | null } } | null>();

  if (!doc) return null;
  return {
    slug: doc.slug,
    wholesalePrice: doc.pricing.wholesalePrice,
    sellingPrice: doc.pricing.sellingPrice,
    stock: doc.inventory.stock,
    shippingWeightGrams: doc.inventory.shippingWeightGrams,
    contentHash: doc.supplier?.contentHash ?? null,
  };
}

async function downloadImages(images: string[], category: string, slug: string): Promise<string[]> {
  const publicPaths: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const url = images[i];
    const ext = url.split(".").pop()?.split("?")[0] || "jpg";
    const relPath = `/products/${category}/${slug}/image-${i + 1}.${ext}`;
    const absPath = resolve(process.cwd(), "public" + relPath);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download image ${url}: HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(absPath), { recursive: true });
    await writeFile(absPath, buffer);
    publicPaths.push(relPath);
  }
  return publicPaths;
}

async function createProduct(entry: SelfShopImportManifestEntry, dryRun: boolean): Promise<SelfShopImportOutcome> {
  const { supplier, supplierData, renvura } = entry;
  const contentHash = computeContentHash(supplierData);

  if (dryRun) {
    return { status: "CREATED", slug: renvura.slug, productId: supplier.productId, imagesWritten: supplierData.images.length };
  }

  const images = await downloadImages(supplierData.images, renvura.category, renvura.slug);

  await ProductModel.create({
    slug: renvura.slug,
    title: renvura.title,
    shortDescription: renvura.shortDescription,
    description: renvura.description,
    category: renvura.category,
    subcategory: renvura.subcategory,
    brand: renvura.brand,
    model: renvura.model,
    sku: supplier.productId,
    pricing: {
      currency: "BDT",
      wholesalePrice: supplierData.wholesalePrice,
      regularPrice: renvura.regularPrice,
      sellingPrice: renvura.sellingPrice,
      discountPercentage: calculateDiscountPercentage(renvura.regularPrice, renvura.sellingPrice),
    },
    media: { thumbnail: images[0] ?? null, images, videos: [] },
    inventory: { stock: supplierData.stock, unit: "pcs", status: "in_stock", shippingWeightGrams: supplierData.shippingWeightGrams },
    features: renvura.features,
    specifications: renvura.specifications,
    status: renvura.status,
    featured: false,
    supplier: { provider: supplier.provider, productId: supplier.productId, sourceUrl: supplier.sourceUrl, lastCheckedAt: supplier.lastCheckedAt, contentHash },
  });

  return { status: "CREATED", slug: renvura.slug, productId: supplier.productId, imagesWritten: images.length };
}

/**
 * Diffs the manifest's `supplierData` against what's currently stored, then classifies and
 * (unless `dryRun`) applies the result. `stock`/`shippingWeightGrams` are the only fields ever
 * auto-applied — `wholesalePrice` changes and content (title/description/image) changes are
 * reported only, never applied, per this phase's "never silently overwrite" rule. A missing
 * `contentHash` baseline (a product imported before this field existed) is treated as "no baseline
 * yet" and backfilled silently — not reported as a content change.
 */
async function reconcileExisting(entry: SelfShopImportManifestEntry, existing: ExistingProductSnapshot, dryRun: boolean): Promise<SelfShopImportOutcome> {
  const { supplier, supplierData } = entry;
  const newHash = computeContentHash(supplierData);
  const hasBaseline = existing.contentHash !== null;
  const contentChanged = hasBaseline && existing.contentHash !== newHash;

  const safeChanges: string[] = [];
  if (existing.stock !== supplierData.stock) safeChanges.push("stock");
  if (existing.shippingWeightGrams !== supplierData.shippingWeightGrams) safeChanges.push("shippingWeightGrams");

  const costChanged = existing.wholesalePrice !== null && existing.wholesalePrice !== supplierData.wholesalePrice;

  const setFields: Record<string, unknown> = {
    "supplier.lastCheckedAt": supplier.lastCheckedAt,
    "supplier.contentHash": newHash,
  };
  if (safeChanges.includes("stock")) setFields["inventory.stock"] = supplierData.stock;
  if (safeChanges.includes("shippingWeightGrams")) setFields["inventory.shippingWeightGrams"] = supplierData.shippingWeightGrams;

  if (!dryRun) {
    await ProductModel.updateOne({ slug: existing.slug }, { $set: setFields });
  }

  if (costChanged) {
    const oldCost = existing.wholesalePrice as number;
    const newCost = supplierData.wholesalePrice;
    const currentSellingPrice = existing.sellingPrice ?? 0;
    return {
      status: "BLOCKED",
      slug: existing.slug,
      productId: supplier.productId,
      reasons: [
        `Supplier wholesale cost changed: ৳${oldCost} → ৳${newCost}. sellingPrice/regularPrice were NOT changed automatically.`,
        ...(contentChanged ? ["Supplier title/description/images appear to have changed (content hash differs) — review manually."] : []),
      ],
      appliedSafeFields: dryRun ? [] : safeChanges,
      costChange: {
        oldCost,
        newCost,
        currentSellingPrice,
        oldMarginBdt: currentSellingPrice - oldCost,
        newMarginBdt: currentSellingPrice - newCost,
        oldMarginPct: currentSellingPrice > 0 ? Math.round(((currentSellingPrice - oldCost) / currentSellingPrice) * 1000) / 10 : 0,
        newMarginPct: currentSellingPrice > 0 ? Math.round(((currentSellingPrice - newCost) / currentSellingPrice) * 1000) / 10 : 0,
      },
    };
  }

  if (contentChanged) {
    return {
      status: "BLOCKED",
      slug: existing.slug,
      productId: supplier.productId,
      reasons: ["Supplier title/description/images appear to have changed (content hash differs) — review manually before updating Renvura's copy."],
      appliedSafeFields: dryRun ? [] : safeChanges,
    };
  }

  if (safeChanges.length > 0) {
    return { status: "UPDATED", slug: existing.slug, productId: supplier.productId, changedFields: safeChanges };
  }

  return { status: "ALREADY_IMPORTED", slug: existing.slug, productId: supplier.productId };
}

export interface ImportOptions {
  dryRun: boolean;
}

/** Processes one manifest entry end to end: validate → find existing → create or reconcile. Never touches any collection other than `products`. */
export async function importEntry(entry: SelfShopImportManifestEntry, options: ImportOptions): Promise<SelfShopImportOutcome> {
  const errors = validateManifestEntry(entry);
  if (errors.length > 0) {
    return { status: "VALIDATION_ERROR", productId: entry.supplier?.productId ?? null, sourceUrl: entry.supplier?.sourceUrl ?? null, errors };
  }

  const existing = await findExistingProduct(entry);
  if (!existing) {
    return createProduct(entry, options.dryRun);
  }
  return reconcileExisting(entry, existing, options.dryRun);
}
