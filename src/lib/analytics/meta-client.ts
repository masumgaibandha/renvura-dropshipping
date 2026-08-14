import { ANALYTICS_CURRENCY, type AddToCartEventData, type AddToWishlistEventData, type InitiateCheckoutEventData, type PurchaseEventData, type SearchEventData, type ViewContentEventData } from "./event-types";
import { isMetaPixelEnabled } from "./config";
import { toMetaContentIds, toMetaContents } from "./mapping";

/**
 * Browser-only Meta Pixel wrapper — the one place `window.fbq` is ever called from a component.
 * Every function silently no-ops when the Pixel isn't enabled/loaded (see `isMetaPixelEnabled`)
 * or when `window.fbq` doesn't exist yet (script still loading, ad blocker, etc.) — analytics must
 * never throw into the calling component's render/event-handler path.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/** Returns whether the call was actually dispatched to `fbq` — `false` covers both "intentionally
 * disabled" and "fbq unavailable" cases alike. `PurchaseTracker.tsx` uses this to avoid marking a
 * Purchase as sent when nothing actually fired, so a genuine failure can still be retried on a
 * same-tab reload rather than being silently and permanently lost. */
function fbqTrack(eventName: string, params: Record<string, unknown>, eventId?: string): boolean {
  if (typeof window === "undefined" || typeof window.fbq !== "function" || !isMetaPixelEnabled()) return false;
  try {
    if (eventId) {
      window.fbq("track", eventName, params, { eventID: eventId });
    } else {
      window.fbq("track", eventName);
    }
    return true;
  } catch {
    // Analytics must never break the page it's tracking.
    return false;
  }
}

export function trackMetaPageView(): void {
  fbqTrack("PageView", {});
}

export function trackMetaViewContent({ item }: ViewContentEventData): void {
  fbqTrack("ViewContent", {
    content_ids: toMetaContentIds([item]),
    contents: toMetaContents([item]),
    content_type: "product",
    content_name: item.name,
    value: item.price,
    currency: ANALYTICS_CURRENCY,
  });
}

export function trackMetaSearch({ searchString }: SearchEventData): void {
  fbqTrack("Search", { search_string: searchString });
}

export function trackMetaAddToCart({ item }: AddToCartEventData): void {
  fbqTrack("AddToCart", {
    content_ids: toMetaContentIds([item]),
    contents: toMetaContents([item]),
    content_type: "product",
    content_name: item.name,
    value: item.price * item.quantity,
    currency: ANALYTICS_CURRENCY,
  });
}

export function trackMetaAddToWishlist({ item }: AddToWishlistEventData): void {
  fbqTrack("AddToWishlist", {
    content_ids: toMetaContentIds([item]),
    contents: toMetaContents([item]),
    content_type: "product",
    content_name: item.name,
    ...(item.price > 0 ? { value: item.price, currency: ANALYTICS_CURRENCY } : {}),
  });
}

export function trackMetaInitiateCheckout({ items, value }: InitiateCheckoutEventData): void {
  fbqTrack("InitiateCheckout", {
    content_ids: toMetaContentIds(items),
    contents: toMetaContents(items),
    content_type: "product",
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
    value,
    currency: ANALYTICS_CURRENCY,
  });
}

/** `eventId` must be the exact same value the server-side CAPI Purchase used for this order (`purchaseEventId(orderNumber)`) — see `event-id.ts`. Returns whether the call actually reached `fbq` (see `fbqTrack`'s doc comment). */
export function trackMetaPurchase({ eventId, items, value }: PurchaseEventData): boolean {
  return fbqTrack(
    "Purchase",
    {
      content_ids: toMetaContentIds(items),
      contents: toMetaContents(items),
      content_type: "product",
      num_items: items.reduce((sum, item) => sum + item.quantity, 0),
      value,
      currency: ANALYTICS_CURRENCY,
    },
    eventId,
  );
}
