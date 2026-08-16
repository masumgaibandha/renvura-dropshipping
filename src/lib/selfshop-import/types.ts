import type { ProductStatus } from "@/types/product";

/**
 * SelfShop import manifest (Phase 17) — the reusable, source-controlled input format for
 * `scripts/import-selfshop-products.ts`. A manifest file (`data/selfshop-imports/*.json`) is a
 * `SelfShopImportManifest` (an array of entries), produced by a human/Claude reading SelfShop's
 * logged-in browser pages and writing down what's actually there — never invented. This file
 * contains no credentials, cookies, or session data; only public-facing product content and
 * pricing figures a logged-in reseller sees.
 *
 * Two content blocks are deliberately kept separate and are never conflated:
 * - `supplierData`: SelfShop's own raw listing content, used only for diffing on re-check
 *   (`content changed?`) and as the source of operational fields (stock/weight/cost).
 * - `renvura`: Renvura's own rewritten, customer-facing content — never auto-overwritten by a
 *   re-check once the product exists (see `importer.ts`'s `diffAndClassify`).
 */

export interface SelfShopSupplierData {
  /** SelfShop's own raw product title, exactly as shown — for content-hash diffing only, never copied into Renvura's title. */
  title: string;
  /** What Renvura pays per unit — Renvura's cost basis, never a selling price. */
  wholesalePrice: number;
  stock: number;
  /** `null` when SelfShop's page doesn't state a trustworthy weight — never estimated. */
  shippingWeightGrams: number | null;
  /** SelfShop's own category label, kept for reference only — Renvura's own category slug lives in `renvura.category`. */
  category: string;
  /** SelfShop's own raw description text, exactly as shown. */
  description: string;
  specifications: { label: string; value: string }[];
  /** Supplier CDN image URLs, in gallery order. */
  images: string[];
  /** Reserved — no SelfShop product observed with variants/options as of Phase 17; always `[]` today. */
  variants: unknown[];
}

export interface SelfShopRenvuraContent {
  title: string;
  slug: string;
  /** Renvura category slug (see `src/data/categories.ts`), not SelfShop's category label. */
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  shortDescription: string;
  description: string;
  features: string[];
  specifications: { label: string; value: string }[];
  /** Customer-facing pre-discount price — a deliberate business decision, never derived automatically from `supplierData.wholesalePrice`. */
  regularPrice: number;
  /** Customer-facing selling price — same deliberate-decision rule as `regularPrice`. */
  sellingPrice: number;
  status: ProductStatus;
}

export interface SelfShopImportManifestEntry {
  supplier: {
    provider: "selfshop";
    /** SelfShop's own SKU/reference for this product. */
    productId: string;
    /** The exact SelfShop page this entry was read from. */
    sourceUrl: string;
    /** ISO timestamp of when this entry's data was read/verified. */
    lastCheckedAt: string;
  };
  supplierData: SelfShopSupplierData;
  renvura: SelfShopRenvuraContent;
}

export type SelfShopImportManifest = SelfShopImportManifestEntry[];

/**
 * Normalized SelfShop product data (Phase 18) — the generic input shape
 * `src/lib/selfshop-import/classify.ts` and `scripts/build-selfshop-manifest.ts` accept. This is
 * deliberately provider-shaped, not batch-shaped: nothing here names or hardcodes any specific
 * product. A human/Claude reading a logged-in SelfShop page produces one of these per product —
 * never invented, only what the page actually shows. `regularPrice`/`sellingPrice` are SelfShop's
 * own two displayed prices (the lower one becomes Renvura's wholesale cost basis) — kept as two
 * separate raw numbers here, rather than pre-resolved, so `classify.ts` can itself detect
 * inverted/impossible pricing before deriving a cost.
 */
export interface SelfShopRawProduct {
  sourceUrl: string;
  productId: string;
  title: string;
  /** SelfShop's own category label, exactly as shown (e.g. "Electronic Accessories") — see `categoryMapping.ts`. */
  selfshopCategory: string;
  /** SelfShop's crossed-out "was" price, if shown. */
  regularPrice: number | null;
  /** SelfShop's highlighted price — what Renvura actually pays, before any sanity check. */
  sellingPrice: number | null;
  stock: number | null;
  /** `null` when the page doesn't state a trustworthy weight — never estimated. */
  shippingWeightGrams: number | null;
  description: string | null;
  specifications: { label: string; value: string }[];
  /** Supplier CDN image URLs, own-gallery only (never a related-product thumbnail). */
  images: string[];
  variants: unknown[];
  /** ISO timestamp of when this data was read/verified. */
  lastCheckedAt: string;
}

export type ClassificationStatus = "IMPORTABLE" | "IMPORTABLE_WITH_WARNINGS" | "BLOCKED" | "CATEGORY_MAPPING_REQUIRED" | "PRICE_REVIEW_REQUIRED";

export type ClassificationWarningCode = "MISSING_WEIGHT" | "THIN_IMAGES" | "THIN_DESCRIPTION" | "COPY_REVIEW_RECOMMENDED";

export interface ClassificationWarning {
  code: ClassificationWarningCode;
  message: string;
}

export interface ClassificationResult {
  sourceUrl: string;
  productId: string;
  title: string;
  status: ClassificationStatus;
  warnings: ClassificationWarning[];
  /** Present only when `status` is `BLOCKED`. */
  blockedReasons?: string[];
  /** Present only when `status` is `CATEGORY_MAPPING_REQUIRED`. */
  selfshopCategory?: string;
  /** Present whenever pricing was computed (IMPORTABLE / IMPORTABLE_WITH_WARNINGS / PRICE_REVIEW_REQUIRED). */
  pricing?: { wholesaleCost: number; sellingPrice: number; regularPrice: number; grossMarginPct: number };
  /** Present only when `status` is IMPORTABLE or IMPORTABLE_WITH_WARNINGS — ready to drop into a manifest file. */
  manifestEntry?: SelfShopImportManifestEntry;
}

export type SelfShopImportOutcome =
  | { status: "VALIDATION_ERROR"; productId: string | null; sourceUrl: string | null; errors: string[] }
  | { status: "CREATED"; slug: string; productId: string; imagesWritten: number }
  | { status: "ALREADY_IMPORTED"; slug: string; productId: string }
  | { status: "UPDATED"; slug: string; productId: string; changedFields: string[] }
  | {
      status: "BLOCKED";
      slug: string;
      productId: string;
      reasons: string[];
      appliedSafeFields: string[];
      costChange?: { oldCost: number; newCost: number; currentSellingPrice: number; oldMarginBdt: number; newMarginBdt: number; oldMarginPct: number; newMarginPct: number };
    };
