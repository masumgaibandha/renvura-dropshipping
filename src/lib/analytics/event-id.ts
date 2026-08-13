/**
 * Event ID generation. Only Purchase is sent from both the browser (Pixel) and the server (CAPI)
 * in this phase (see `meta-server.ts` — no other event has a CAPI counterpart), so only Purchase
 * needs a deterministic, shared id; every other browser-only event gets a fresh random id purely
 * for its own internal identity, never relied on for cross-provider deduplication.
 */

/**
 * Deterministic, stable, based on the order number alone — never a timestamp (a timestamp would
 * differ between the browser firing Purchase on `/order-success` and the server firing CAPI
 * moments earlier inside `createOrder`, defeating deduplication). Computed identically by
 * `src/actions/orders.ts` (server) and `PurchaseTracker.tsx` (browser) from the same `orderNumber`
 * — never the Mongo `_id`, which stays server-internal.
 */
export function purchaseEventId(orderNumber: string): string {
  return `purchase:${orderNumber}`;
}

/** For browser-only events with no CAPI counterpart — not used for deduplication, just a stable per-event identity. */
export function randomEventId(prefix: string): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${random}`;
}
