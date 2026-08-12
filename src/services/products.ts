import { cache } from "react";

import { connectToDatabase } from "@/lib/db";
import { CategoryModel } from "@/models/Category";
import { ProductModel } from "@/models/Product";
import type { Category } from "@/types/category";
import type {
  InventoryStatus,
  Product,
  ProductSourceProvenance,
  ProductSpecification,
  ProductStatus,
  PublicProduct,
  VerifiedProductRecord,
} from "@/types/product";
import { calculateDiscountPercentage } from "@/utils/pricing";

/**
 * Data-access layer for the catalog. As of Phase 10 this reads from
 * MongoDB (`ProductModel`/`CategoryModel`) — the verified seed data that
 * used to live here directly now lives in `src/data/products.ts`/
 * `src/data/categories.ts` only as the original, human-verified record,
 * migrated in one shot by `scripts/seed-catalog.ts` (see its doc comment).
 * Every exported read is wrapped in React's `cache()` so a single request
 * that calls `getAllCategories()`/`getCategoryBySlug()` many times (e.g.
 * once per card in a product grid) only queries Mongo once.
 */

interface ProductLeanDoc {
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  sku: string | null;
  pricing: Product["pricing"];
  bulkPricing?: Product["bulkPricing"];
  media: Product["media"];
  inventory: Product["inventory"];
  variants?: Product["variants"];
  features?: string[];
  specifications?: Product["specifications"];
  seo?: Product["seo"];
  status: Product["status"];
  tags?: string[];
  featured: boolean;
  source?: ProductSourceProvenance;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryLeanDoc {
  slug: string;
  name: string;
  description: string | null;
  parentSlug: string | null;
  isActive: boolean;
  displayOrder: number;
}

function toProduct(doc: ProductLeanDoc): Product {
  return {
    // Deliberately `doc.slug`, not a Mongo ObjectId — see Product.ts's schema comment.
    id: doc.slug,
    slug: doc.slug,
    title: doc.title,
    shortDescription: doc.shortDescription,
    description: doc.description,
    category: doc.category,
    subcategory: doc.subcategory,
    brand: doc.brand,
    model: doc.model,
    sku: doc.sku,
    pricing: doc.pricing,
    bulkPricing: doc.bulkPricing,
    media: doc.media,
    inventory: doc.inventory,
    variants: doc.variants,
    features: doc.features,
    specifications: doc.specifications,
    seo: doc.seo,
    status: doc.status,
    tags: doc.tags,
    featured: doc.featured,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toCategory(doc: CategoryLeanDoc): Category {
  return {
    id: doc.slug,
    slug: doc.slug,
    name: doc.name,
    description: doc.description,
    parentSlug: doc.parentSlug,
    isActive: doc.isActive,
    displayOrder: doc.displayOrder,
  };
}

/** Every product, every status — callers that need storefront-only visibility filter separately (see individual pages). */
export const getAllProducts = cache(async (): Promise<Product[]> => {
  await connectToDatabase();
  const docs = await ProductModel.find().sort({ createdAt: 1 }).lean<ProductLeanDoc[]>();
  return docs.map(toProduct);
});

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

export const getProductBySlug = cache(async (slug: string): Promise<Product | undefined> => {
  await connectToDatabase();
  const doc = await ProductModel.findOne({ slug }).lean<ProductLeanDoc>();
  return doc ? toProduct(doc) : undefined;
});

/** `id === slug` for every product (see `Product.ts`'s schema comment) — kept as a distinct name because callers (cart/order code) conceptually deal in "productId." */
export const getProductById = cache(async (id: string): Promise<Product | undefined> => {
  return getProductBySlug(id);
});

export const getVerifiedProductRecordBySlug = cache(async (slug: string): Promise<VerifiedProductRecord | undefined> => {
  await connectToDatabase();
  const doc = await ProductModel.findOne({ slug }).lean<ProductLeanDoc>();
  if (!doc || !doc.source) return undefined;
  return { product: toProduct(doc), source: doc.source };
});

/** Products in a category, matching either the top-level category or subcategory slug. */
export const getProductsByCategory = cache(async (categorySlug: string): Promise<Product[]> => {
  await connectToDatabase();
  const docs = await ProductModel.find({ $or: [{ category: categorySlug }, { subcategory: categorySlug }] })
    .sort({ createdAt: 1 })
    .lean<ProductLeanDoc[]>();
  return docs.map(toProduct);
});

/** Every category, active and inactive — storefront call sites filter `isActive` themselves (mirrors how they already filter `!parentSlug`). */
export const getAllCategories = cache(async (): Promise<Category[]> => {
  await connectToDatabase();
  const docs = await CategoryModel.find().sort({ displayOrder: 1, name: 1 }).lean<CategoryLeanDoc[]>();
  return docs.map(toCategory);
});

export const getCategoryBySlug = cache(async (slug: string): Promise<Category | undefined> => {
  const all = await getAllCategories();
  return all.find((category) => category.slug === slug);
});

export const getSubcategories = cache(async (parentSlug: string): Promise<Category[]> => {
  const all = await getAllCategories();
  return all.filter((category) => category.parentSlug === parentSlug);
});

/**
 * Shop/category listing — the one place category filtering, search,
 * sorting, and pagination happen, reused by /shop, /electronics-gadgets,
 * and /health-beauty (see src/components/shop/ProductListingPage.tsx) so
 * that logic isn't duplicated per route). Operates on an already-fetched
 * `Product[]` (not a DB query itself) — callers fetch once via
 * `getAllProducts()`, this stays pure/sync so it's trivially testable.
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

export function getProductListing(
  source: Product[],
  params: ProductListingParams,
  categoryLookup: (slug: string) => Category | undefined = () => undefined,
): ProductListingResult {
  let filtered = source;

  if (params.category) {
    const categorySlug = params.category;
    filtered = filtered.filter((product) => product.category === categorySlug || product.subcategory === categorySlug);
  }

  const query = params.q?.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter((product) => {
      const categoryName = categoryLookup(product.subcategory ?? product.category)?.name;
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
 * same category, then other `"active"` products as a fallback. Always
 * excludes the current product; never pads with anything invented.
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

/* ---------------------------------------------------------------------- */
/* Phase 10 admin — product/category writes. Every function here is only  */
/* ever called from src/actions/admin/*, which independently enforces     */
/* requireAdmin() before any of these run — this file has no authorization*/
/* logic of its own, matching src/services/orders.ts's existing split.    */
/* ---------------------------------------------------------------------- */

export interface AdminProductListParams {
  page?: number;
  pageSize?: number;
  /** Matches title, SKU, or model. */
  search?: string;
  category?: string;
  status?: ProductStatus;
  stock?: InventoryStatus;
}

export interface AdminProductListResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Server-side paginated/filtered/searched product list for /admin/products — never loads the full catalog into memory. */
export async function listProductsForAdmin(params: AdminProductListParams): Promise<AdminProductListResult> {
  await connectToDatabase();

  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
  const page = Math.max(params.page ?? 1, 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: Record<string, any>[] = [];
  if (params.category) conditions.push({ $or: [{ category: params.category }, { subcategory: params.category }] });
  if (params.status) conditions.push({ status: params.status });
  if (params.stock) conditions.push({ "inventory.status": params.stock });

  const search = params.search?.trim();
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");
    conditions.push({ $or: [{ title: pattern }, { sku: pattern }, { model: pattern }] });
  }

  const filter = conditions.length > 0 ? { $and: conditions } : {};

  const [docs, total] = await Promise.all([
    ProductModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<ProductLeanDoc[]>(),
    ProductModel.countDocuments(filter),
  ]);

  return {
    products: docs.map(toProduct),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Products with a known, numeric stock at or below `threshold` — powers the dashboard's "Low Stock Products" panel and /admin/inventory's indicator. Products with unknown stock (`null`) are never flagged, since there's nothing to compare. */
export const getLowStockProducts = cache(async (threshold: number, limit = 10): Promise<Product[]> => {
  await connectToDatabase();
  const docs = await ProductModel.find({ "inventory.stock": { $ne: null, $lte: threshold } })
    .sort({ "inventory.stock": 1 })
    .limit(limit)
    .lean<ProductLeanDoc[]>();
  return docs.map(toProduct);
});

/**
 * Editable fields for the admin product form — deliberately excludes
 * `wholesalePrice` (preserved as-is on update, never accepted from this
 * input shape) and `videos`/`inventory.unit` (no admin UI for those yet;
 * preserved as-is too). See `src/actions/admin/products.ts` for the
 * allowlist enforcement and validation that produces this shape.
 */
export interface AdminProductInput {
  title: string;
  shortDescription: string | null;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  sku: string | null;
  regularPrice: number | null;
  sellingPrice: number | null;
  stock: number | null;
  inventoryStatus: InventoryStatus;
  status: ProductStatus;
  featured: boolean;
  thumbnail: string | null;
  images: string[];
  features: string[];
  specifications: ProductSpecification[];
}

/** Returns `null` if no product with this slug exists. */
export async function updateProductForAdmin(slug: string, input: AdminProductInput): Promise<Product | null> {
  await connectToDatabase();
  const doc = await ProductModel.findOneAndUpdate(
    { slug },
    {
      $set: {
        title: input.title,
        shortDescription: input.shortDescription,
        description: input.description,
        category: input.category,
        subcategory: input.subcategory,
        brand: input.brand,
        model: input.model,
        sku: input.sku,
        "pricing.regularPrice": input.regularPrice,
        "pricing.sellingPrice": input.sellingPrice,
        "pricing.discountPercentage": calculateDiscountPercentage(input.regularPrice, input.sellingPrice),
        "media.thumbnail": input.thumbnail,
        "media.images": input.images,
        "inventory.stock": input.stock,
        "inventory.status": input.inventoryStatus,
        features: input.features,
        specifications: input.specifications,
        status: input.status,
        featured: input.featured,
      },
    },
    { returnDocument: "after" },
  ).lean<ProductLeanDoc>();
  return doc ? toProduct(doc) : null;
}

/**
 * Creates a product with no supplier-screenshot provenance (`source` stays
 * unset — see `Product.ts`'s schema comment) and `wholesalePrice: null`,
 * since an admin-authored product has no wholesale cost to record. Caller
 * (`adminCreateProduct`) is responsible for checking the slug doesn't
 * already exist first — this lets a duplicate-slug attempt fail with a
 * clean message instead of a raw Mongo E11000 error.
 */
export async function createProductForAdmin(slug: string, input: AdminProductInput): Promise<Product> {
  await connectToDatabase();
  const doc = await ProductModel.create({
    slug,
    title: input.title,
    shortDescription: input.shortDescription,
    description: input.description,
    category: input.category,
    subcategory: input.subcategory,
    brand: input.brand,
    model: input.model,
    sku: input.sku,
    pricing: {
      currency: "BDT",
      wholesalePrice: null,
      regularPrice: input.regularPrice,
      sellingPrice: input.sellingPrice,
      discountPercentage: calculateDiscountPercentage(input.regularPrice, input.sellingPrice),
    },
    media: { thumbnail: input.thumbnail, images: input.images, videos: [] },
    inventory: { stock: input.stock, unit: null, status: input.inventoryStatus },
    features: input.features,
    specifications: input.specifications,
    status: input.status,
    featured: input.featured,
  });
  return toProduct(doc.toObject() as ProductLeanDoc);
}

/** Sets only `inventory.stock` — used by /admin/inventory's adjustment form. Returns `null` if no product with this slug exists. */
export async function adjustProductStockForAdmin(slug: string, newStock: number): Promise<Product | null> {
  await connectToDatabase();
  const doc = await ProductModel.findOneAndUpdate({ slug }, { $set: { "inventory.stock": newStock } }, { returnDocument: "after" }).lean<ProductLeanDoc>();
  return doc ? toProduct(doc) : null;
}

/** Sets only `featured` — used by /admin/homepage. Returns `null` if no product with this slug exists. */
export async function setProductFeaturedForAdmin(slug: string, featured: boolean): Promise<Product | null> {
  await connectToDatabase();
  const doc = await ProductModel.findOneAndUpdate({ slug }, { $set: { featured } }, { returnDocument: "after" }).lean<ProductLeanDoc>();
  return doc ? toProduct(doc) : null;
}

export interface AdminCategoryInput {
  name: string;
  description: string | null;
  parentSlug: string | null;
  displayOrder: number;
}

/** Caller is responsible for checking the slug doesn't already exist first (see `createProductForAdmin`'s doc comment — same reasoning). */
export async function insertCategoryForAdmin(slug: string, input: AdminCategoryInput): Promise<Category> {
  await connectToDatabase();
  const doc = await CategoryModel.create({
    slug,
    name: input.name,
    description: input.description,
    parentSlug: input.parentSlug,
    isActive: true,
    displayOrder: input.displayOrder,
  });
  return toCategory(doc.toObject() as CategoryLeanDoc);
}

export async function updateCategoryForAdmin(slug: string, input: AdminCategoryInput): Promise<Category | null> {
  await connectToDatabase();
  const doc = await CategoryModel.findOneAndUpdate(
    { slug },
    { $set: { name: input.name, description: input.description, parentSlug: input.parentSlug, displayOrder: input.displayOrder } },
    { returnDocument: "after" },
  ).lean<CategoryLeanDoc>();
  return doc ? toCategory(doc) : null;
}

/** Activate/deactivate — never deletes a category, since existing products may still reference its slug. */
export async function setCategoryActiveForAdmin(slug: string, isActive: boolean): Promise<Category | null> {
  await connectToDatabase();
  const doc = await CategoryModel.findOneAndUpdate({ slug }, { $set: { isActive } }, { returnDocument: "after" }).lean<CategoryLeanDoc>();
  return doc ? toCategory(doc) : null;
}
