/** Delivery fee math. Server-safe, no browser APIs. */

import { deliveryFees as staticFallbackFees } from "@/config/delivery";

export interface DeliveryFeeTable {
  insideDhaka: number;
  outsideDhaka: number;
}

/**
 * Inside-Dhaka vs outside-Dhaka, keyed off `district`. This is the one line
 * to change if the business later wants a different inside/outside
 * definition (e.g. by division, or a per-district table).
 *
 * `fees` is a required-shape parameter (defaulting to the static
 * `src/config/delivery.ts` numbers) rather than an internal constant so the
 * same pure function works both server-side (`order-logic.ts`, which fetches
 * the live, admin-editable `StoreSettings` values via
 * `src/services/settings.ts`) and in `OrderSummary` — a Client Component
 * that can't reach the database itself and receives the current fees as a
 * prop from the checkout page instead. Passing the *same* resolved fee
 * table to both call sites is what keeps the checkout estimate and the
 * server-authoritative total from ever disagreeing.
 */
export function calculateDeliveryFee(district: string, fees: DeliveryFeeTable = staticFallbackFees): number {
  const normalized = district.trim().toLowerCase();
  return normalized === "dhaka" ? fees.insideDhaka : fees.outsideDhaka;
}
