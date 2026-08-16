/**
 * Reusable SelfShop → Renvura category mapping (Phase 18). A deliberately small, hand-curated
 * table — never auto-generated or guessed. SelfShop's own category label (exactly as shown on its
 * product detail pages, e.g. "Electronic Accessories") maps to a real, already-existing Renvura
 * category/subcategory slug pair (see `src/data/categories.ts`). An unmapped SelfShop category
 * returns `null`, which callers must treat as `CATEGORY_MAPPING_REQUIRED` — never invent a mapping
 * on the fly, and never auto-create a new Renvura category to force a match (see CLAUDE.md's
 * "Prefer: Renvura parent category → sensible subcategory → supplier category mapping" and "Do not
 * create hundreds of unnecessarily granular Renvura categories").
 *
 * Extending this table is a deliberate, reviewed decision — add an entry only once a human has
 * confirmed the target Renvura category/subcategory is the right home for that SelfShop category's
 * products, matching how the two entries below were confirmed in Phase 16/18.
 */

export interface RenvuraCategoryMapping {
  category: string;
  subcategory: string | null;
}

export const SELFSHOP_CATEGORY_MAP: Record<string, RenvuraCategoryMapping> = {
  "Electronic Accessories": { category: "electronics-gadgets", subcategory: "electronic-accessories" },
  "Health & Beauty": { category: "health-beauty", subcategory: null },

  // Phase 19 — new mappings, confirmed via the same "broad, customer-friendly, not
  // over-fragmented" reasoning as the two above. Each new Renvura category/subcategory used here
  // must already exist in the database (see `scripts/create-selfshop-categories.ts`) before any
  // manifest referencing it is imported — this table only maps labels, it never creates categories.
  "Electronics Device": { category: "electronics-gadgets", subcategory: "electronics-device" },
  "Women's & Girls' Fashion": { category: "fashion", subcategory: "womens-fashion" },
  "Men's & Boys' Fashion": { category: "fashion", subcategory: "mens-fashion" },
  "Watches, Bags, Jewellery": { category: "watches-bags-jewellery", subcategory: null },
  "Home & Lifestyle": { category: "home-lifestyle", subcategory: null },
  "TV & Home Appliances": { category: "home-lifestyle", subcategory: "home-appliances" },
  "Gift": { category: "home-lifestyle", subcategory: "gifts" },
  "Mother & Baby": { category: "mother-baby", subcategory: null },
  "Sports & Outdoors": { category: "sports-outdoors", subcategory: null },
  "Automotive & Motorbike": { category: "automotive", subcategory: null },

  // Deliberately NOT mapped this phase — "Groceries" and "Organic food" involve perishables with a
  // meaningfully different fulfillment/COD/RTO risk profile than general merchandise; that's a
  // real business-scope decision for a human, not something to fold in casually alongside a
  // catalog-expansion pass. Any product from these SelfShop categories correctly falls through to
  // `CATEGORY_MAPPING_REQUIRED` rather than being force-mapped.
};

/** Returns `null` for any SelfShop category not in the table — callers must classify that as `CATEGORY_MAPPING_REQUIRED`, never guess. */
export function mapSelfShopCategory(selfshopCategory: string): RenvuraCategoryMapping | null {
  return SELFSHOP_CATEGORY_MAP[selfshopCategory] ?? null;
}
