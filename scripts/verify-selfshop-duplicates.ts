import { findPotentialDuplicates } from "../src/lib/selfshop-import/duplicates";

/**
 * Automated regression check (Phase 18) for potential-duplicate detection. Confirms the heuristic
 * catches the two real cases flagged during the scale test (SelfShop's "X699..." and "...Spray
 * Fan..." listings vs. Renvura's own pre-existing catalog titles "X699 Turbo Fan" /
 * "Handheld Spray Fan") without needing a live database — this is exactly the scenario
 * `scripts/build-selfshop-manifest.ts` handles for real via its read-only catalog-title fetch.
 * Also confirms two genuinely different products are NOT flagged.
 */

const failures: string[] = [];
function assert(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

// Case 1: real SelfShop listing title vs. Renvura's existing catalog title for the same physical item.
const turboFanResult = findPotentialDuplicates(
  [{ slug: "x699-high-speed-portable-rechargeable-turbo-fan", title: "X699 High Speed Portable Rechargeable Turbo Fan Digital Display USB Handheld Mini Fan" }],
  [{ slug: "x699-turbo-fan", title: "X699 Turbo Fan" }],
);
assert(turboFanResult.length === 1, `Expected the X699 turbo fan case to be flagged as a potential duplicate, got ${turboFanResult.length} matches.`);
if (turboFanResult.length === 1) {
  assert(turboFanResult[0].sharedTokens.includes("x699"), `Expected "x699" to be a shared token, got: ${turboFanResult[0].sharedTokens.join(", ")}`);
}

// Case 2: same pattern for the spray fan.
const sprayFanResult = findPotentialDuplicates(
  [{ slug: "portable-handheld-spray-fan-usb-rechargeable-mist-cooling-fan-with-built-in-battery", title: "Portable Handheld Spray Fan USB Rechargeable Mist Cooling Fan With Built-In Battery" }],
  [{ slug: "handheld-spray-fan", title: "Handheld Spray Fan" }],
);
assert(sprayFanResult.length === 1, `Expected the handheld spray fan case to be flagged as a potential duplicate, got ${sprayFanResult.length} matches.`);

// Negative case: two genuinely different products must NOT be flagged.
const negativeResult = findPotentialDuplicates(
  [{ slug: "kiss-beauty-spf90-sunscreen-60ml", title: "Kiss Beauty SPF 90 Oil-Free Sunscreen — 60ml" }],
  [{ slug: "vendens-10000mah-power-bank", title: "VEN-DENS 10000mAh Portable Power Bank with Built-in Cable" }],
);
assert(negativeResult.length === 0, `Expected two unrelated products (sunscreen vs. power bank) to NOT be flagged, got ${negativeResult.length} matches.`);

// Negative case: same brand, clearly different model numbers should not collide on the model-number rule.
const differentModelResult = findPotentialDuplicates(
  [{ slug: "ven-dens-10000mah-power-bank-model-vd-pb058", title: "VEN-DENS 10000mAh Power Bank (Model: VD-PB058)" }],
  [{ slug: "ven-dens-20000-mah-premium-power-bank", title: "Ven-Dens 20,000 mAh Premium Power Bank (Model: VD-PB059)" }],
);
assert(differentModelResult.length === 0, `Expected two different VEN-DENS power bank models (VD-PB058 vs VD-PB059) to NOT be flagged as duplicates, got ${differentModelResult.length}.`);

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} duplicate-detection check(s) failed:`);
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("PASS: potential-duplicate detection correctly flags the known Turbo Fan / Spray Fan cases and correctly ignores unrelated/different-model products.");
