/**
 * Reusable SelfShop → Renvura pricing engine (Phase 18). Calibrated from the 21 already-approved
 * real catalog products' actual wholesale→selling ratios (see docs history / Phase 16 discovery
 * report) rather than an invented formula — lower-cost items need a proportionally bigger markup
 * to cover the same fixed per-order costs (Meta ad spend, delivery, RTO reserve) regardless of
 * item cost. Never uses SelfShop's own "regular price" as Renvura's price — that number is
 * secondary evidence only, per this phase's explicit instruction.
 */

export interface PricingProposal {
  wholesaleCost: number;
  sellingPrice: number;
  regularPrice: number;
  grossMarginBdt: number;
  grossMarginPct: number;
  rationale: string;
}

/** Minimum acceptable gross margin % before a product is flagged PRICE_REVIEW_REQUIRED instead of imported. */
export const MIN_ACCEPTABLE_MARGIN_PCT = 35;

function bandMultiplier(wholesaleCost: number): { multiplier: number; band: string } {
  if (wholesaleCost <= 200) return { multiplier: 4.0, band: "<=200" };
  if (wholesaleCost <= 350) return { multiplier: 3.2, band: "200-350" };
  if (wholesaleCost <= 600) return { multiplier: 2.4, band: "350-600" };
  if (wholesaleCost <= 900) return { multiplier: 2.0, band: "600-900" };
  if (wholesaleCost <= 1500) return { multiplier: 1.85, band: "900-1500" };
  if (wholesaleCost <= 2500) return { multiplier: 1.65, band: "1500-2500" };
  return { multiplier: 1.55, band: ">2500" };
}

function roundToTen(n: number): number {
  return Math.round(n / 10) * 10;
}

export function proposeRenvuraPricing(wholesaleCost: number): PricingProposal {
  const { multiplier, band } = bandMultiplier(wholesaleCost);
  const sellingPrice = roundToTen(wholesaleCost * multiplier);
  const regularPrice = roundToTen(sellingPrice / 0.87); // ~13% headline discount, matching catalog convention
  const grossMarginBdt = sellingPrice - wholesaleCost;
  const grossMarginPct = Math.round((grossMarginBdt / sellingPrice) * 1000) / 10;
  return {
    wholesaleCost,
    sellingPrice,
    regularPrice,
    grossMarginBdt,
    grossMarginPct,
    rationale: `Wholesale cost ৳${wholesaleCost} falls in the ${band} tier (${multiplier}x calibrated multiplier) — sellingPrice ৳${sellingPrice}, regularPrice ৳${regularPrice} (~13% headline discount), gross margin ৳${grossMarginBdt} (${grossMarginPct}%).`,
  };
}
