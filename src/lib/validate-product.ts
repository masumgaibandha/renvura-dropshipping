import { categories } from "@/data/categories";
import { isValidSlug } from "@/utils/slug";
import type { Product } from "@/types/product";

/**
 * Plain-TypeScript validation for catalog data. Zod was considered but
 * isn't justified yet: the checks needed (numeric price, slug shape,
 * required identifiers, media path shape, category references) are
 * simple enough that a schema library would add a dependency without
 * adding real value. Revisit if/when this validates untrusted input
 * (e.g. an admin product form) rather than our own seed data.
 */

export interface ValidationIssue {
  field: string;
  message: string;
}

const KNOWN_CATEGORY_SLUGS = new Set(categories.map((category) => category.slug));

function isNonNegativeNumberOrNull(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

export function validateProduct(product: Product): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!product.id?.trim()) {
    issues.push({ field: "id", message: "id is required" });
  }

  if (!product.slug || !isValidSlug(product.slug)) {
    issues.push({ field: "slug", message: `"${product.slug}" is not a valid slug (expected lowercase-kebab-case)` });
  }

  if (!product.title?.trim()) {
    issues.push({ field: "title", message: "title is required" });
  }

  if (!KNOWN_CATEGORY_SLUGS.has(product.category)) {
    issues.push({ field: "category", message: `"${product.category}" is not a known category slug` });
  }

  if (product.subcategory && !KNOWN_CATEGORY_SLUGS.has(product.subcategory)) {
    issues.push({ field: "subcategory", message: `"${product.subcategory}" is not a known category slug` });
  }

  const { pricing } = product;
  if (pricing.currency !== "BDT") {
    issues.push({ field: "pricing.currency", message: "currency must be BDT" });
  }
  for (const field of ["wholesalePrice", "regularPrice", "sellingPrice"] as const) {
    if (!isNonNegativeNumberOrNull(pricing[field])) {
      issues.push({ field: `pricing.${field}`, message: "must be a non-negative number or null" });
    }
  }
  if (
    pricing.discountPercentage !== null &&
    (typeof pricing.discountPercentage !== "number" ||
      pricing.discountPercentage < 0 ||
      pricing.discountPercentage > 100)
  ) {
    issues.push({ field: "pricing.discountPercentage", message: "must be between 0 and 100, or null" });
  }

  if (product.media.images.length === 0) {
    issues.push({ field: "media.images", message: "product has no images" });
  }
  for (const path of [...product.media.images, ...product.media.videos]) {
    if (!path.startsWith("/products/")) {
      issues.push({ field: "media", message: `"${path}" should be a public path under /products/` });
    }
  }
  if (product.media.thumbnail && !product.media.thumbnail.startsWith("/products/")) {
    issues.push({ field: "media.thumbnail", message: `"${product.media.thumbnail}" should live under /products/` });
  }

  return issues;
}

export function assertValidProducts(products: Product[]): void {
  const failures = products
    .map((product) => ({ slug: product.slug, issues: validateProduct(product) }))
    .filter((entry) => entry.issues.length > 0);

  if (failures.length > 0) {
    const details = failures
      .map((f) => `- ${f.slug}: ${f.issues.map((i) => `[${i.field}] ${i.message}`).join("; ")}`)
      .join("\n");
    throw new Error(`Invalid product data:\n${details}`);
  }
}
