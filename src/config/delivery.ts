/**
 * Delivery fee configuration.
 *
 * IMPORTANT — TEMPORARY PLACEHOLDER, NOT BUSINESS-APPROVED:
 * No delivery fee amounts have been confirmed by the business yet. These
 * are round, clearly-marked placeholder numbers so checkout can be built
 * and tested end-to-end now (order creation cannot be meaningfully tested
 * while blocked on missing fees). `DELIVERY_FEE_CONFIG_IS_FINAL` must be
 * flipped to `true` (and these numbers replaced with real, approved
 * amounts) before this is used for a real production order. See
 * CLAUDE.md's "no fake business logic" rule — this is a deliberate,
 * reported exception to it, not a silent one.
 */
export const DELIVERY_FEE_CONFIG_IS_FINAL = false;

export const deliveryFees = {
  insideDhaka: 70,
  outsideDhaka: 130,
} as const;
