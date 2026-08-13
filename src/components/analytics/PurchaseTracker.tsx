"use client";

import { useEffect, useRef } from "react";

import { trackGaPurchase } from "@/lib/analytics/ga4-client";
import { trackMetaPurchase } from "@/lib/analytics/meta-client";
import type { AnalyticsItem } from "@/lib/analytics/event-types";

export interface PurchaseTrackerProps {
  eventId: string;
  orderNumber: string;
  items: AnalyticsItem[];
  value: number;
  deliveryFee: number;
}

const SESSION_MARKER_PREFIX = "renvura:analytics:purchase:";

/**
 * Fires the browser-side Meta Purchase + GA4 purchase events on `/order-success/[orderNumber]`,
 * using the exact same `eventId` (`purchaseEventId(orderNumber)`, see `event-id.ts`) the server
 * CAPI Purchase already used — this is what lets Meta deduplicate the two into one conversion
 * instead of counting twice.
 *
 * Receives only a small, pre-sanitized prop shape from the (Server Component) order-success
 * page — never the raw `OrderSummary`, and never anything from `localStorage`/the cart, which is
 * why this can't just read `useCart()` instead: the cart may have already been cleared, and even
 * if it hadn't, it's untrusted display state, not the authoritative purchase record. See
 * CLAUDE.md's Phase 11 "Purchase implementation" note.
 *
 * A `sessionStorage` marker keyed by `orderNumber` suppresses a same-tab reload from re-firing —
 * a UX nicety only. Meta's `event_id` dedup and GA4's `transaction_id` are what actually make a
 * refresh or a re-fire harmless even without this marker, so its absence (private browsing,
 * cleared storage) is never treated as a correctness problem.
 */
export function PurchaseTracker({ eventId, orderNumber, items, value, deliveryFee }: PurchaseTrackerProps) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const marker = `${SESSION_MARKER_PREFIX}${orderNumber}`;
    try {
      if (sessionStorage.getItem(marker)) return;
      sessionStorage.setItem(marker, "1");
    } catch {
      // sessionStorage unavailable (private mode, disabled storage) — fire anyway; provider-side
      // dedup (event_id / transaction_id) still protects against a real double-count.
    }

    trackMetaPurchase({ eventId, orderNumber, items, value, deliveryFee });
    trackGaPurchase({ eventId, orderNumber, items, value, deliveryFee });
  }, [eventId, orderNumber, items, value, deliveryFee]);

  return null;
}
