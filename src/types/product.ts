/**
 * Product domain model.
 *
 * Field values must trace back to what a supplier source (screenshot,
 * image, or video) actually shows. Unverifiable fields are `null`/
 * `undefined`, never guessed. See docs/PRODUCT-DATA.md for the
 * extraction rules and known gaps in the current catalog.
 */

export type ProductStatus = "draft" | "active" | "inactive";

export type InventoryStatus = "in_stock" | "out_of_stock" | "unknown";

export interface ProductPricing {
  currency: "BDT";
  /**
   * What the supplier charges per unit, as shown on the source screenshot.
   * This is Renvura's cost basis, not a customer-facing price.
   */
  wholesalePrice: number | null;
  /** Customer-facing pre-discount price. Unset until the business sets it. */
  regularPrice: number | null;
  /** Customer-facing selling price. Unset until the business sets it. */
  sellingPrice: number | null;
  /**
   * Derived discount percentage (see `calculateDiscountPercentage` in
   * `src/utils/pricing.ts`). Only meaningful once both `regularPrice` and
   * `sellingPrice` are set.
   */
  discountPercentage: number | null;
}

export interface ProductBulkPriceTier {
  minQuantity: number;
  maxQuantity: number | null;
  price: number;
}

export interface ProductMedia {
  thumbnail: string | null;
  /** Public paths (under /products/...), suitable for next/image. */
  images: string[];
  videos: string[];
}

export interface ProductInventory {
  stock: number | null;
  unit: string | null;
  status: InventoryStatus;
}

export interface ProductVariant {
  id: string;
  label: string;
  sku?: string | null;
  price?: number | null;
  attributes?: Record<string, string>;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductSeo {
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  shortDescription?: string | null;
  description: string | null;

  /** Category slug, see src/types/category.ts. */
  category: string;
  /** Subcategory slug, only set when the source clearly provides one. */
  subcategory?: string | null;

  brand?: string | null;
  model?: string | null;
  /** Verified SKU from the source. Never invented. */
  sku: string | null;

  pricing: ProductPricing;
  /** Quantity-break pricing, when the source clearly shows tiers. */
  bulkPricing?: ProductBulkPriceTier[];

  media: ProductMedia;
  inventory: ProductInventory;

  variants?: ProductVariant[];
  features?: string[];
  specifications?: ProductSpecification[];

  seo?: ProductSeo;
  status: ProductStatus;
  tags?: string[];

  /** Admin-controlled homepage placement (Phase 10) — never set by storefront/customer code. Absent/undefined is treated as `false`. */
  featured?: boolean;

  createdAt?: string;
  updatedAt?: string;
}

/**
 * Where a verified product record actually came from — required so every
 * catalog entry can be traced back to resources/products/ and re-verified.
 * Lives alongside the product in seed data, not in the public Product
 * shape itself (see src/data/products.ts).
 */
export interface ProductSourceProvenance {
  sourceFolder: string;
  sourceScreenshot: string;
  sourceImages: string[];
  sourceMarketplace: string;
  /** Seller/store id shown on the source screenshot, if any. */
  sourceSellerId?: string | null;
  verifiedAt: string;
  /** Anything ambiguous, inconsistent, or worth a human double-checking. */
  dataQualityNotes?: string[];
}

export interface VerifiedProductRecord {
  product: Product;
  source: ProductSourceProvenance;
}

/**
 * `Product` with `pricing.wholesalePrice` removed. Any Client Component
 * boundary that needs product data must receive this shape instead of the
 * full `Product` — a Client Component's props (and the source of any data
 * module it imports directly) are bundled into the JS sent to the browser,
 * so passing the real `Product` type across that boundary ships Renvura's
 * supplier cost to every visitor. See `toPublicProduct` in
 * `src/services/products.ts`.
 */
export type PublicProduct = Omit<Product, "pricing"> & { pricing: Omit<ProductPricing, "wholesalePrice"> };
