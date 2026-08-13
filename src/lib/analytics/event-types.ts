/**
 * Shared ecommerce event shapes for Meta Pixel/CAPI and GA4. Both providers' senders
 * (`meta-client.ts`, `ga4-client.ts`, `meta-server.ts`) build their own provider-specific payload
 * from these, so a component only ever constructs one of these, never a raw `fbq`/`gtag` call —
 * see CLAUDE.md's Phase 11 section for why (no scattered raw tracking calls).
 *
 * Currency is always the literal string `"BDT"` — never the `৳` symbol (Meta/GA4 both require an
 * ISO 4217 currency code). All monetary values are plain numbers (e.g. `1190`, never `"৳1,190"`).
 */

export const ANALYTICS_CURRENCY = "BDT" as const;

/** One line item, already resolved to the one stable identity this project uses across both
 * providers — see `mapping.ts`'s doc comment for why that's the product slug, never a Mongo id or
 * the wholesale-price-bearing full `Product`. */
export interface AnalyticsItem {
  id: string;
  name: string;
  category?: string | null;
  price: number;
  quantity: number;
}

export interface ViewContentEventData {
  item: AnalyticsItem;
}

export interface SearchEventData {
  searchString: string;
}

export interface AddToCartEventData {
  item: AnalyticsItem;
}

export interface AddToWishlistEventData {
  item: AnalyticsItem;
}

export interface ViewCartEventData {
  items: AnalyticsItem[];
  value: number;
}

export interface InitiateCheckoutEventData {
  items: AnalyticsItem[];
  value: number;
}

/**
 * Purchase is the one event sent from both the browser (Pixel) and the server (CAPI) — `eventId`
 * must be identical on both sides for Meta's deduplication to treat them as one conversion (see
 * `event-id.ts`). `value` is always the final order total (items + delivery fee) — see
 * `docs/ARCHITECTURE.md`'s Phase 11 "Purchase value definition" note for why shipping is included
 * rather than broken out on the Meta side.
 */
export interface PurchaseEventData {
  eventId: string;
  orderNumber: string;
  items: AnalyticsItem[];
  value: number;
  deliveryFee: number;
}
