import type { Product } from "../src/types/product";

/**
 * Automated regression check (Phase 17) — asserts `toPublicProduct()` never serializes
 * `pricing.wholesalePrice` or `supplier` (SelfShop cost/traceability data) into the shape handed to
 * Client Components. This repo has no Jest/Vitest configured (see CLAUDE.md's "Known Phase 10
 * limitations" — verification here has always been `tsc`/`eslint`/`next build` plus manual
 * checks), so this is a small dependency-free assertion script rather than a new test framework —
 * run it directly, or wire it into `npm run` / CI as `tsx scripts/verify-public-product-no-leak.ts`.
 * Exits non-zero on any failure.
 */

const FAKE_PRODUCT: Product = {
  id: "test-product",
  slug: "test-product",
  title: "Test Product",
  shortDescription: "Short",
  description: "Full",
  category: "health-beauty",
  subcategory: null,
  brand: null,
  model: null,
  sku: "PUBLIC-SKU-1234",
  pricing: { currency: "BDT", wholesalePrice: 999, regularPrice: 199, sellingPrice: 149, discountPercentage: 25 },
  media: { thumbnail: "/products/health-beauty/test-product/image-1.jpg", images: ["/products/health-beauty/test-product/image-1.jpg"], videos: [] },
  inventory: { stock: 10, unit: "pcs", status: "in_stock", shippingWeightGrams: 100 },
  status: "active",
  featured: false,
  // Deliberately distinct from `sku` above, which IS legitimately public — this check must only
  // fail on the supplier-only fields, not on the product's own public SKU.
  supplier: { provider: "selfshop", productId: "SUPPLIER-ONLY-REF-5678", sourceUrl: "https://api-v1.selfshop.com.bd/product/test-product", lastCheckedAt: "2026-01-01T00:00:00.000Z", contentHash: "abc123" },
};

async function main() {
  const { toPublicProduct } = await import("../src/services/products");

  const publicProduct = toPublicProduct(FAKE_PRODUCT);
  const serialized = JSON.stringify(publicProduct);

  const failures: string[] = [];

  if ("wholesalePrice" in publicProduct.pricing) failures.push("publicProduct.pricing still has a wholesalePrice key.");
  if ("supplier" in publicProduct) failures.push("publicProduct still has a supplier key.");
  if (serialized.includes("999")) failures.push("Serialized public product JSON contains the wholesale cost value (999).");
  if (serialized.includes("selfshop") || serialized.includes("SUPPLIER-ONLY-REF-5678") || serialized.includes("contentHash") || serialized.includes("api-v1.selfshop.com.bd")) {
    failures.push("Serialized public product JSON contains supplier traceability data.");
  }

  if (failures.length > 0) {
    console.error("FAIL: supplier/wholesale-cost leak detected in toPublicProduct():");
    for (const f of failures) console.error(" -", f);
    process.exit(1);
  }

  console.log("PASS: toPublicProduct() never leaks wholesalePrice or supplier data.");
}

main().catch((error) => {
  console.error("FAIL: exception during check:", error instanceof Error ? error.message : error);
  process.exit(1);
});
