import { MIN_ACCEPTABLE_MARGIN_PCT, proposeRenvuraPricing } from "../src/lib/selfshop-import/pricing";

/**
 * Automated regression check (Phase 18) for the SelfShop pricing engine — same dependency-free
 * assertion-script pattern as `verify-public-product-no-leak.ts` (this repo has no Jest/Vitest
 * configured). Exercises every tier boundary and the minimum-margin gate. Exits non-zero on any
 * failure.
 */

const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

// Tier boundaries — one value just inside each band, plus the exact boundary values themselves.
const boundaryCases: { cost: number; expectMultiplierAtLeast: number; label: string }[] = [
  { cost: 100, expectMultiplierAtLeast: 4.0, label: "deep <=200 tier" },
  { cost: 200, expectMultiplierAtLeast: 4.0, label: "exact <=200 boundary" },
  { cost: 201, expectMultiplierAtLeast: 3.2, label: "just above 200 -> 200-350 tier" },
  { cost: 350, expectMultiplierAtLeast: 3.2, label: "exact 350 boundary" },
  { cost: 351, expectMultiplierAtLeast: 2.4, label: "just above 350 -> 350-600 tier" },
  { cost: 600, expectMultiplierAtLeast: 2.4, label: "exact 600 boundary" },
  { cost: 601, expectMultiplierAtLeast: 2.0, label: "just above 600 -> 600-900 tier" },
  { cost: 900, expectMultiplierAtLeast: 2.0, label: "exact 900 boundary" },
  { cost: 901, expectMultiplierAtLeast: 1.85, label: "just above 900 -> 900-1500 tier" },
  { cost: 1500, expectMultiplierAtLeast: 1.85, label: "exact 1500 boundary" },
  { cost: 1501, expectMultiplierAtLeast: 1.65, label: "just above 1500 -> 1500-2500 tier" },
  { cost: 2500, expectMultiplierAtLeast: 1.65, label: "exact 2500 boundary" },
  { cost: 2501, expectMultiplierAtLeast: 1.55, label: "just above 2500 -> >2500 tier" },
  { cost: 5000, expectMultiplierAtLeast: 1.55, label: "deep >2500 tier" },
];

for (const c of boundaryCases) {
  const p = proposeRenvuraPricing(c.cost);
  const actualMultiplier = p.sellingPrice / c.cost;
  assert(actualMultiplier >= c.expectMultiplierAtLeast - 0.05, `${c.label} (cost ৳${c.cost}): expected multiplier >= ${c.expectMultiplierAtLeast}, got ${actualMultiplier.toFixed(2)}`);
  assert(p.sellingPrice > c.cost, `${c.label}: sellingPrice (৳${p.sellingPrice}) must exceed wholesale cost (৳${c.cost})`);
  assert(p.regularPrice > p.sellingPrice, `${c.label}: regularPrice (৳${p.regularPrice}) must exceed sellingPrice (৳${p.sellingPrice})`);
  assert(p.grossMarginPct > 0 && p.grossMarginPct < 100, `${c.label}: grossMarginPct (${p.grossMarginPct}) must be between 0 and 100`);
}

// Monotonicity: the underlying tier multiplier must never increase as wholesale cost increases
// (bigger items get proportionally cheaper). Realized post-rounding ratios (sellingPrice/cost) can
// wobble by a few hundredths right at a tier boundary purely because roundToTen() rounds each side
// independently — that's expected, cosmetic rounding noise from the "psychologically sensible
// round price" requirement, not a pricing defect, so this check uses a tolerance wide enough to
// absorb rounding jitter while still catching a genuine monotonicity break (e.g. a misordered band).
const ROUNDING_JITTER_TOLERANCE = 0.1;
const sortedCosts = boundaryCases.map((c) => c.cost).sort((a, b) => a - b);
let previousMultiplier = Infinity;
for (const cost of sortedCosts) {
  const multiplier = proposeRenvuraPricing(cost).sellingPrice / cost;
  assert(multiplier <= previousMultiplier + ROUNDING_JITTER_TOLERANCE, `Multiplier increased from cost ${cost} (${multiplier.toFixed(3)}) vs previous (${previousMultiplier.toFixed(3)}) by more than the expected rounding jitter — bands must be non-increasing.`);
  previousMultiplier = multiplier;
}

// Minimum-margin threshold sanity — every generated price must clear MIN_ACCEPTABLE_MARGIN_PCT
// by construction (the pricing engine's own multipliers are calibrated above the gate); this just
// confirms that invariant holds across the full boundary set, and that the constant itself is sane.
assert(MIN_ACCEPTABLE_MARGIN_PCT > 0 && MIN_ACCEPTABLE_MARGIN_PCT < 100, "MIN_ACCEPTABLE_MARGIN_PCT must be a sane percentage.");
for (const c of boundaryCases) {
  const p = proposeRenvuraPricing(c.cost);
  assert(p.grossMarginPct >= MIN_ACCEPTABLE_MARGIN_PCT, `${c.label}: engine-proposed margin (${p.grossMarginPct}%) fell below its own MIN_ACCEPTABLE_MARGIN_PCT (${MIN_ACCEPTABLE_MARGIN_PCT}%) — a caller relying on the engine's own output should never see PRICE_REVIEW_REQUIRED; only a real supplier price INCREASE on an already-imported product should trigger that path.`);
}

// wholesaleCost is echoed back untouched, never mutated.
const echoCheck = proposeRenvuraPricing(777);
assert(echoCheck.wholesaleCost === 777, "wholesaleCost must be echoed back unchanged.");

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} pricing engine check(s) failed:`);
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(`PASS: all ${boundaryCases.length} tier-boundary cases + monotonicity + minimum-margin checks passed.`);
