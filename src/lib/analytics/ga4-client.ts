import { ANALYTICS_CURRENCY, type AddToCartEventData, type AddToWishlistEventData, type InitiateCheckoutEventData, type PurchaseEventData, type SearchEventData, type ViewCartEventData, type ViewContentEventData } from "./event-types";
import { gaMeasurementId, isGa4Enabled } from "./config";
import { toGa4Items } from "./mapping";

/**
 * Browser-only GA4 gtag wrapper — the one place `window.gtag` is ever called from a component.
 * Mirrors `meta-client.ts`'s structure/no-op-on-failure behavior. Uses direct `gtag()` calls
 * (official GA4 semantics) rather than a wrapper library — see CLAUDE.md's Phase 11 section for why.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function gtagEvent(eventName: string, params: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function" || !isGa4Enabled()) return;
  try {
    window.gtag("event", eventName, params);
  } catch {
    // Analytics must never break the page it's tracking.
  }
}

/** Pathname only — never the full URL with query string, see `RouteTracker.tsx`'s sanitization rule. */
export function trackGaPageView(pathname: string): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function" || !isGa4Enabled() || !gaMeasurementId) return;
  try {
    window.gtag("event", "page_view", { page_path: pathname, page_location: `${window.location.origin}${pathname}` });
  } catch {
    // no-op
  }
}

export function trackGaViewItem({ item }: ViewContentEventData): void {
  gtagEvent("view_item", { currency: ANALYTICS_CURRENCY, value: item.price, items: toGa4Items([item]) });
}

export function trackGaSearch({ searchString }: SearchEventData): void {
  gtagEvent("search", { search_term: searchString });
}

export function trackGaAddToCart({ item }: AddToCartEventData): void {
  gtagEvent("add_to_cart", { currency: ANALYTICS_CURRENCY, value: item.price * item.quantity, items: toGa4Items([item]) });
}

export function trackGaAddToWishlist({ item }: AddToWishlistEventData): void {
  gtagEvent("add_to_wishlist", {
    ...(item.price > 0 ? { currency: ANALYTICS_CURRENCY, value: item.price } : {}),
    items: toGa4Items([item]),
  });
}

export function trackGaViewCart({ items, value }: ViewCartEventData): void {
  gtagEvent("view_cart", { currency: ANALYTICS_CURRENCY, value, items: toGa4Items(items) });
}

export function trackGaBeginCheckout({ items, value }: InitiateCheckoutEventData): void {
  gtagEvent("begin_checkout", { currency: ANALYTICS_CURRENCY, value, items: toGa4Items(items) });
}

/** `transaction_id = orderNumber` gives GA4 its own natural duplicate-event protection, independent of Meta's `event_id` dedup. */
export function trackGaPurchase({ orderNumber, items, value, deliveryFee }: PurchaseEventData): void {
  gtagEvent("purchase", {
    transaction_id: orderNumber,
    currency: ANALYTICS_CURRENCY,
    value,
    shipping: deliveryFee,
    items: toGa4Items(items),
  });
}
