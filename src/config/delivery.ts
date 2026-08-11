/**
 * Delivery fee configuration — approved by the business.
 *
 * Charged to the customer in addition to the product subtotal (see
 * `src/actions/order-logic.ts`'s `recalculateOrder`, which adds this to
 * `subtotal` to produce `total`). District === "Dhaka" gets `insideDhaka`;
 * every other district gets `outsideDhaka` — see `src/utils/delivery.ts`.
 */
export const DELIVERY_FEE_CONFIG_IS_FINAL = true;

export const deliveryFees = {
  insideDhaka: 80,
  outsideDhaka: 150,
} as const;
