import { categories } from "@/data/categories";
import { products } from "@/data/products";
import type { Category } from "@/types/category";
import type { Product, PublicProduct, VerifiedProductRecord } from "@/types/product";

/**
 * Data-access layer for the catalog. Reads from the verified seed data in
 * src/data/products.ts for now; once MongoDB is connected (later phase),
 * these functions should be reimplemented against ProductModel/
 * CategoryModel while keeping the same signatures, so callers don't change.
 */

export function getAllProducts(): Product[] {
  return products.map((record) => record.product);
}

/**
 * Strips `pricing.wholesalePrice` — call this before handing product data
 * to a Client Component (see `PublicProduct`'s doc comment for why the full
 * `Product` type must never cross that boundary).
 */
export function toPublicProduct(product: Product): PublicProduct {
  return {
    ...product,
    pricing: {
      currency: product.pricing.currency,
      regularPrice: product.pricing.regularPrice,
      sellingPrice: product.pricing.sellingPrice,
      discountPercentage: product.pricing.discountPercentage,
    },
  };
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((record) => record.product.slug === slug)?.product;
}

export function getProductById(id: string): Product | undefined {
  return products.find((record) => record.product.id === id)?.product;
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

/**
 * Shop/category listing — the one place category filtering, search,
 * sorting, and pagination happen, reused by /shop, /electronics-gadgets,
 * and /health-beauty (see src/components/shop/ProductListingPage.tsx) so
 * that logic isn't duplicated per route.
 *
 * Sort/filter options are computed from what the current data actually
 * supports, never hardcoded as always-available: price sort only appears
 * once at least one matched product has a real `sellingPrice` (never
 * `wholesalePrice` — that's never read here), and the "in stock only"
 * signal only matters once at least one product is actually out of stock.
 * This means both self-activate the moment real data supports them, with
 * no future code change — see CLAUDE.md.
 */
export type ProductSortOption = "featured" | "name-asc" | "name-desc" | "price-asc" | "price-desc";

export interface ProductListingParams {
  /** Top-level category or subcategory slug (used by /shop's category filter). */
  category?: string;
  sort?: string;
  /** Free-text search against title, model, and category name. */
  q?: string;
  /** "in_stock" restricts to in-stock products; only meaningful once real variance exists. */
  availability?: string;
  page?: string;
}

export interface ProductListingResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: ProductSortOption;
  /** Sort options worth showing in the UI right now, given the current result set. */
  availableSorts: ProductSortOption[];
  /** Whether an "in stock only" filter would currently do anything. */
  hasOutOfStock: boolean;
}

const LISTING_PAGE_SIZE = 12;
const NAME_SORTS: ProductSortOption[] = ["featured", "name-asc", "name-desc"];
const PRICE_SORTS: ProductSortOption[] = ["price-asc", "price-desc"];

function matchesSearchQuery(product: Product, query: string, categoryName?: string): boolean {
  const haystack = [product.title, product.model, categoryName]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function getProductListing(source: Product[], params: ProductListingParams): ProductListingResult {
  let filtered = source;

  if (params.category) {
    const categorySlug = params.category;
    filtered = filtered.filter((product) => product.category === categorySlug || product.subcategory === categorySlug);
  }

  const query = params.q?.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter((product) => {
      const categoryName = getCategoryBySlug(product.subcategory ?? product.category)?.name;
      return matchesSearchQuery(product, query, categoryName);
    });
  }

  const hasOutOfStock = filtered.some((product) => product.inventory.status === "out_of_stock");
  if (params.availability === "in_stock" && hasOutOfStock) {
    filtered = filtered.filter((product) => product.inventory.status === "in_stock");
  }

  const hasSellingPrice = filtered.some((product) => product.pricing.sellingPrice !== null);
  const availableSorts: ProductSortOption[] = hasSellingPrice ? [...NAME_SORTS, ...PRICE_SORTS] : NAME_SORTS;

  const requestedSort = params.sort as ProductSortOption | undefined;
  const sort: ProductSortOption = requestedSort && availableSorts.includes(requestedSort) ? requestedSort : "featured";

  const sorted = [...filtered];
  if (sort === "name-asc") {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === "name-desc") {
    sorted.sort((a, b) => b.title.localeCompare(a.title));
  } else if (sort === "price-asc") {
    sorted.sort((a, b) => (a.pricing.sellingPrice ?? Number.POSITIVE_INFINITY) - (b.pricing.sellingPrice ?? Number.POSITIVE_INFINITY));
  } else if (sort === "price-desc") {
    sorted.sort((a, b) => (b.pricing.sellingPrice ?? Number.NEGATIVE_INFINITY) - (a.pricing.sellingPrice ?? Number.NEGATIVE_INFINITY));
  }
  // "featured" — original catalog order, no sort applied.

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / LISTING_PAGE_SIZE));
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage >= 1 && requestedPage <= totalPages ? requestedPage : 1;
  const start = (page - 1) * LISTING_PAGE_SIZE;

  return {
    products: sorted.slice(start, start + LISTING_PAGE_SIZE),
    total,
    page,
    pageSize: LISTING_PAGE_SIZE,
    totalPages,
    sort,
    availableSorts,
    hasOutOfStock,
  };
}

/**
 * Related products for a product detail page — same subcategory first, then
 * same category, then other `"active"` products as a fallback (currently
 * always empty; every product is still `"draft"` in Phase 2 — built for
 * correctness anyway, the same "ready but dormant until real data supports
 * it" pattern as getProductListing's price sort). Always excludes the
 * current product; never pads with anything invented.
 */
export function getRelatedProducts(product: Product, source: Product[], limit = 5): Product[] {
  const others = source.filter((candidate) => candidate.id !== product.id);
  const picked: Product[] = [];
  const pickedIds = new Set<string>();

  function addFrom(candidates: Product[]) {
    for (const candidate of candidates) {
      if (picked.length >= limit) return;
      if (pickedIds.has(candidate.id)) continue;
      picked.push(candidate);
      pickedIds.add(candidate.id);
    }
  }

  if (product.subcategory) {
    addFrom(others.filter((candidate) => candidate.subcategory === product.subcategory));
  }
  addFrom(others.filter((candidate) => candidate.category === product.category));
  addFrom(others.filter((candidate) => candidate.status === "active"));

  return picked.slice(0, limit);
}
