import type { Category } from "@/types/category";

/**
 * Renvura's own business categories, normalized from the supplier's
 * internal taxonomy (folder names like "electric-product", and the
 * "Electronic Accessories" / "Health & Beauty" category field shown on
 * source screenshots). See docs/PRODUCT-DATA.md for the mapping.
 *
 * Only "Electronic Accessories" is added as a subcategory here because
 * it's the only subcategory clearly and consistently shown across the
 * source screenshots — Health & Beauty products never show a
 * subcategory, so none is invented.
 */
export const categories: Category[] = [
  {
    id: "electronics-gadgets",
    slug: "electronics-gadgets",
    name: "Electronics & Gadgets",
    description: null,
    parentSlug: null,
  },
  {
    id: "electronic-accessories",
    slug: "electronic-accessories",
    name: "Electronic Accessories",
    description: null,
    parentSlug: "electronics-gadgets",
  },
  {
    id: "health-beauty",
    slug: "health-beauty",
    name: "Health & Beauty",
    description: null,
    parentSlug: null,
  },
];
