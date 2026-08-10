import { categories } from "@/data/categories";
import { products } from "@/data/products";
import type { Category } from "@/types/category";
import type { Product, VerifiedProductRecord } from "@/types/product";

/**
 * Data-access layer for the catalog. Reads from the verified seed data in
 * src/data/products.ts for now; once MongoDB is connected (later phase),
 * these functions should be reimplemented against ProductModel/
 * CategoryModel while keeping the same signatures, so callers don't change.
 */

export function getAllProducts(): Product[] {
  return products.map((record) => record.product);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((record) => record.product.slug === slug)?.product;
}

export function getVerifiedProductRecordBySlug(slug: string): VerifiedProductRecord | undefined {
  return products.find((record) => record.product.slug === slug);
}

/** Products in a category, matching either the top-level category or subcategory slug. */
export function getProductsByCategory(categorySlug: string): Product[] {
  return products
    .filter(
      (record) =>
        record.product.category === categorySlug || record.product.subcategory === categorySlug,
    )
    .map((record) => record.product);
}

export function getAllCategories(): Category[] {
  return categories;
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getSubcategories(parentSlug: string): Category[] {
  return categories.filter((category) => category.parentSlug === parentSlug);
}
