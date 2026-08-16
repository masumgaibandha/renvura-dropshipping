import { mapSelfShopCategory } from "./categoryMapping";
import { MIN_ACCEPTABLE_MARGIN_PCT, proposeRenvuraPricing } from "./pricing";
import type { ClassificationResult, ClassificationWarning, SelfShopRawProduct } from "./types";

/**
 * Generalized SelfShop product-quality classifier (Phase 18) — the reusable logic behind
 * `scripts/build-selfshop-manifest.ts`, generalized out of the one-off Phase 18 scale-test script.
 * Pure and DB-free: takes one `SelfShopRawProduct` at a time and returns a `ClassificationResult`.
 * Nothing in this file names or hardcodes any specific product — every check here is a pattern
 * (a brand list, a SKU-shape regex, a numeric threshold), never a per-product special case.
 */

/**
 * Major trademarked brand names that appear on SelfShop as unauthorized "styled"/"master copy"
 * replicas (confirmed for Apple/JBL during the Phase 18 scale test). Deliberately a small, explicit
 * list — extend it only after observing a real counterfeit case for that brand, never guess widely
 * (a false positive here blocks a possibly-genuine product; a false negative just means a human
 * catches it on review, same as any other exception).
 */
const WATCHED_TRADEMARK_BRANDS = [
  "apple", "airpods", "iphone", "jbl", "samsung", "sony", "bose",
  "nike", "adidas", "jordan", "air jordan", "new balance", "skechers",
  "louis vuitton", "off-white", "off white", "kaws", "the north face", "supreme", "gucci",
];

/** Phrases (English + Bengali) that self-admit a listing is a replica/unauthorized copy, not a genuine branded item. */
const REPLICA_ADMISSION_PATTERNS = [/master\s*copy/i, /মাস্টার\s*কপি/, /styled\s*version/i, /replica/i, /first\s*copy/i, /এএ+\s*quality/i, /inspired/i, /average\s*quality/i];

export interface CounterfeitCheck {
  risk: boolean;
  reason: string | null;
}

/**
 * Flags counterfeit/trademark risk on either of two independent, defensible signals — never on
 * brand-name presence alone (see this module's doc comment: a legitimate branded product must not
 * be over-blocked just because it names a real brand):
 *
 * 1. A watched brand is named AND the text itself admits it's a copy/replica/"inspired"/styled
 *    version — the original Phase 18 signal.
 * 2. TWO OR MORE distinct watched brands appear in the same listing (e.g. a "Nike" sneaker also
 *    labeled "Louis Vuitton Monogram Edition", or "Air Jordan x Off-White"). A genuine product is
 *    never simultaneously two different luxury/sportswear brands — this pattern only appears on
 *    unauthorized mashup/replica listings (confirmed by direct observation during the Phase 19
 *    Men's Fashion sneaker cluster: real designer collaborations exist but are never sold in bulk
 *    wholesale at these price points, so on this specific supplier this pattern is unambiguous).
 */
/**
 * "Inspired" + an explicit quality-tier qualifier ("average quality" / "premium quality") is this
 * supplier's own house style for its entire replica-fragrance line (confirmed during Phase 19
 * expansion: Gucci Flora, Dior Sauvage, "Stronger With You", "Vampire Blood" all use this exact
 * pairing) — a strong signal on its own, independent of whether the referenced name happens to be
 * on `WATCHED_TRADEMARK_BRANDS`. A brand list can never be exhaustive; this pattern generalizes the
 * detection to names not yet catalogued.
 */
const INSPIRED_QUALITY_TIER_PATTERN = /inspired/i;
const QUALITY_TIER_QUALIFIER_PATTERN = /average\s*quality|premium\s*quality/i;

export function detectCounterfeitRisk(title: string, description: string | null): CounterfeitCheck {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  const mentionedBrands = WATCHED_TRADEMARK_BRANDS.filter((brand) => haystack.includes(brand));

  if (mentionedBrands.length >= 2) {
    return { risk: true, reason: `Listing references multiple distinct trademarked brands in one product (${mentionedBrands.join(", ")}) — a genuine product is never simultaneously two different brands; this pattern only appears on unauthorized mashup/replica listings.` };
  }

  if (INSPIRED_QUALITY_TIER_PATTERN.test(haystack) && QUALITY_TIER_QUALIFIER_PATTERN.test(haystack)) {
    return { risk: true, reason: `Listing pairs "inspired" with an explicit quality-tier qualifier (average/premium quality) — this supplier's own house style for unauthorized replica fragrances, regardless of whether the referenced name is on the watched-brand list.` };
  }

  if (mentionedBrands.length === 0) return { risk: false, reason: null };

  const admission = REPLICA_ADMISSION_PATTERNS.find((pattern) => pattern.test(haystack));
  if (admission) {
    return { risk: true, reason: `Listing names a watched trademarked brand ("${mentionedBrands[0]}") and self-describes as a copy/styled/replica/inspired version (matched ${admission}).` };
  }
  return { risk: false, reason: null };
}

/** SelfShop's own SKU shape, observed consistently as "VP" + 13 digits across every real listing seen. A value that doesn't match this shape (e.g. a stray variant label like "Chocolate") is treated as a broken/invalid SKU, not a real product reference. */
const VALID_SELFSHOP_SKU_PATTERN = /^VP\d{10,}$/;

export function isValidSelfShopSku(sku: string): boolean {
  return VALID_SELFSHOP_SKU_PATTERN.test(sku);
}

/** Heuristic for supplier copy that's too thin, promotional, or poorly formatted to publish as-is — never blocks import, only flags for a later editorial pass. */
function needsCopyReview(title: string, description: string | null): boolean {
  if (!description || description.length < 120) return true;
  const exclamations = (description.match(/[!❗✨🔥💥]/g) ?? []).length;
  if (exclamations >= 5) return true;
  // Mostly non-Latin/emoji marketing copy with almost no real sentence structure.
  const words = description.split(/\s+/).filter(Boolean);
  if (words.length < 15) return true;
  return false;
}

export function classifySelfShopProduct(raw: SelfShopRawProduct): ClassificationResult {
  const base = { sourceUrl: raw.sourceUrl, productId: raw.productId, title: raw.title };

  // 1. Counterfeit/trademark risk — checked first, regardless of how complete the rest of the data is.
  const counterfeit = detectCounterfeitRisk(raw.title, raw.description);
  if (counterfeit.risk) {
    return { ...base, status: "BLOCKED", warnings: [], blockedReasons: [counterfeit.reason as string] };
  }

  // 2. Invalid SKU.
  if (!isValidSelfShopSku(raw.productId)) {
    return { ...base, status: "BLOCKED", warnings: [], blockedReasons: [`SKU "${raw.productId}" does not match SelfShop's expected SKU shape (VP + digits) — likely a broken/mislabeled listing.`] };
  }

  // 3. Pricing sanity: both prices present, positive, and not inverted.
  if (raw.sellingPrice === null || raw.sellingPrice <= 0) {
    return { ...base, status: "BLOCKED", warnings: [], blockedReasons: ["Missing or non-positive wholesale price."] };
  }
  if (raw.regularPrice !== null && raw.regularPrice > 0 && raw.regularPrice < raw.sellingPrice) {
    return {
      ...base,
      status: "BLOCKED",
      warnings: [],
      blockedReasons: [`Impossible pricing: SelfShop's displayed "regular" price (৳${raw.regularPrice}) is lower than its displayed "selling" price (৳${raw.sellingPrice}).`],
    };
  }

  // 4. No usable images.
  if (raw.images.length === 0) {
    return { ...base, status: "BLOCKED", warnings: [], blockedReasons: ["No usable images."] };
  }

  // 5. Category mapping.
  const mapping = mapSelfShopCategory(raw.selfshopCategory);
  if (!mapping) {
    return { ...base, status: "CATEGORY_MAPPING_REQUIRED", warnings: [], selfshopCategory: raw.selfshopCategory };
  }

  // 6. Pricing engine + minimum margin gate.
  const wholesaleCost = raw.sellingPrice;
  const pricing = proposeRenvuraPricing(wholesaleCost);
  if (pricing.grossMarginPct < MIN_ACCEPTABLE_MARGIN_PCT) {
    return {
      ...base,
      status: "PRICE_REVIEW_REQUIRED",
      warnings: [],
      pricing: { wholesaleCost, sellingPrice: pricing.sellingPrice, regularPrice: pricing.regularPrice, grossMarginPct: pricing.grossMarginPct },
    };
  }

  // 7. Warnings — never block, only flag.
  const warnings: ClassificationWarning[] = [];
  if (raw.shippingWeightGrams === null) warnings.push({ code: "MISSING_WEIGHT", message: "No verified shipping weight — shippingWeightGrams will be null, product will show as Pathao-not-ready until a real weight is recorded." });
  if (raw.images.length === 1) warnings.push({ code: "THIN_IMAGES", message: "Only 1 image available." });
  if (!raw.description || raw.description.length < 200) warnings.push({ code: "THIN_DESCRIPTION", message: "Supplier description is short." });
  if (needsCopyReview(raw.title, raw.description)) warnings.push({ code: "COPY_REVIEW_RECOMMENDED", message: "Supplier copy looks thin, highly promotional, or poorly formatted — recommend an editorial pass before relying on it as final customer-facing copy." });

  const slug = slugifyTitle(raw.title);
  const manifestEntry = {
    supplier: { provider: "selfshop" as const, productId: raw.productId, sourceUrl: raw.sourceUrl, lastCheckedAt: raw.lastCheckedAt },
    supplierData: {
      title: raw.title,
      wholesalePrice: wholesaleCost,
      stock: raw.stock ?? 0,
      shippingWeightGrams: raw.shippingWeightGrams,
      category: raw.selfshopCategory,
      description: raw.description ?? "",
      specifications: raw.specifications,
      images: raw.images,
      variants: raw.variants,
    },
    renvura: {
      title: raw.title.trim(),
      slug,
      category: mapping.category,
      subcategory: mapping.subcategory,
      brand: null,
      model: null,
      shortDescription: (raw.description ?? "").slice(0, 180).replace(/\s+\S*$/, "") + "...",
      description: raw.description ?? "",
      features: [],
      specifications: raw.specifications,
      regularPrice: pricing.regularPrice,
      sellingPrice: pricing.sellingPrice,
      status: "active" as const,
    },
  };

  return {
    ...base,
    status: warnings.length > 0 ? "IMPORTABLE_WITH_WARNINGS" : "IMPORTABLE",
    warnings,
    pricing: { wholesaleCost, sellingPrice: pricing.sellingPrice, regularPrice: pricing.regularPrice, grossMarginPct: pricing.grossMarginPct },
    manifestEntry,
  };
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
