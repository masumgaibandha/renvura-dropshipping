/** Delivery fee math. Server-safe, no browser APIs — see src/config/delivery.ts for the amounts. */

import { deliveryFees } from "@/config/delivery";

/**
 * Inside-Dhaka vs outside-Dhaka, keyed off `district`. This is the one line
 * to change if the business later wants a different inside/outside
 * definition (e.g. by division, or a per-district table).
 */
export function calculateDeliveryFee(district: string): number {
  const normalized = district.trim().toLowerCase();
  return normalized === "dhaka" ? deliveryFees.insideDhaka : deliveryFees.outsideDhaka;
}
