/** Pricing math. Server-safe, no browser APIs. */

/**
 * Percentage saved by selling at `sellingPrice` instead of `regularPrice`.
 * Returns null when either price is unknown, or the inputs don't describe
 * an actual discount (selling price at or above regular price).
 */
export function calculateDiscountPercentage(
  regularPrice: number | null | undefined,
  sellingPrice: number | null | undefined,
): number | null {
  if (regularPrice === null || regularPrice === undefined || regularPrice <= 0) {
    return null;
  }
  if (sellingPrice === null || sellingPrice === undefined || sellingPrice < 0) {
    return null;
  }
  if (sellingPrice >= regularPrice) {
    return null;
  }

  const discount = ((regularPrice - sellingPrice) / regularPrice) * 100;
  return Math.round(discount * 100) / 100;
}
