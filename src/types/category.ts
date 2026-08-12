/**
 * Category domain model.
 *
 * Renvura's own business categories, distinct from whatever internal
 * taxonomy a supplier uses (see docs/PRODUCT-DATA.md for the mapping).
 */

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  /** slug of the parent category, if this is a subcategory. */
  parentSlug?: string | null;
  /** Inactive categories are hidden from storefront nav/filters (Phase 10 admin). */
  isActive: boolean;
  /** Admin-controlled ordering for homepage category highlights (Phase 10). */
  displayOrder: number;
}

export type CategorySlug = "electronics-gadgets" | "health-beauty";
