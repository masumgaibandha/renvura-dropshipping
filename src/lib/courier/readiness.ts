/**
 * Pure, provider-neutral-in-shape readiness logic for admin UI display only (Phase 15) — no DB
 * access, no network calls, safe to import from both Server and Client Components (including
 * `ProductForm.tsx`'s live, unsaved form state). Named after Pathao specifically because that's
 * the only provider with a real, credential-gated adapter today (see `registry.ts`); the shape
 * would generalize if Steadfast is ever verified.
 *
 * This module only classifies data that's already been read elsewhere — it never itself decides
 * whether a real shipment can be created. `src/services/courier.ts`'s `createShipmentForOrder()`
 * (and every check inside it) remains the sole authoritative, server-side gate; this is a display
 * convenience layered on top, matching the same "UI checks never replace server checks" principle
 * already established for `isOrderEligibleForShipmentCreation()`.
 */

export type PathaoProductReadiness = "ready" | "missing_weight" | "invalid_weight";

export function getPathaoProductReadiness(shippingWeightGrams: number | null | undefined): PathaoProductReadiness {
  if (shippingWeightGrams === null || shippingWeightGrams === undefined) return "missing_weight";
  if (!Number.isFinite(shippingWeightGrams) || shippingWeightGrams <= 0) return "invalid_weight";
  return "ready";
}

export const PATHAO_PRODUCT_READINESS_LABELS: Record<PathaoProductReadiness, string> = {
  ready: "READY",
  missing_weight: "MISSING WEIGHT",
  invalid_weight: "INVALID WEIGHT",
};

/**
 * A real weight under 500g is a perfectly valid catalog value — Pathao's 0.5kg minimum is handled
 * by flooring the outgoing courier *request* value (`providers/pathao.ts`'s `createShipment()`),
 * never by rejecting or rewriting a genuinely lighter product. This message only ever appears for
 * `missing_weight`/`invalid_weight`, never for a real light weight.
 */
export const PATHAO_PRODUCT_READINESS_MESSAGES: Record<PathaoProductReadiness, string | null> = {
  ready: null,
  missing_weight: "Pathao shipment creation is blocked until a shipping weight is added.",
  invalid_weight: "This product's shipping weight is invalid (must be a positive number) — Pathao shipment creation is blocked until it's corrected.",
};
