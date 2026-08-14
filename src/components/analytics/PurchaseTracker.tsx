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
 *
 * The marker is written only AFTER at least one provider actually fires (`trackMetaPurchase`/
 * `trackGaPurchase` each report back whether their call actually reached `fbq`/`gtag` — see their
 * doc comments). This was a real bug: the marker used to be written unconditionally before even
 * attempting the calls, so if `fbq`/`gtag` weren't ready yet for any reason, the Purchase was lost
 * AND a same-tab reload would still see the marker and refuse to retry. Now a failed attempt
 * leaves no marker, so a reload gets a genuine second chance.
 */
export function PurchaseTracker({ eventId, orderNumber, items, value, deliveryFee }: PurchaseTrackerProps) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const marker = `${SESSION_MARKER_PREFIX}${orderNumber}`;
    let alreadyMarked = false;
    try {
      alreadyMarked = sessionStorage.getItem(marker) !== null;
    } catch {
      // sessionStorage unavailable (private mode, disabled storage) — fall through and fire
      // anyway; provider-side dedup (event_id / transaction_id) still protects against a real
      // double-count, and there's nothing to persist a marker into regardless.
    }
    if (alreadyMarked) return;

    const metaFired = trackMetaPurchase({ eventId, orderNumber, items, value, deliveryFee });
    const gaFired = trackGaPurchase({ eventId, orderNumber, items, value, deliveryFee });

    if (metaFired || gaFired) {
      try {
        sessionStorage.setItem(marker, "1");
      } catch {
        // Nothing to do — the events already fired; the marker is purely a same-tab UX nicety.
      }
    }
  }, [eventId, orderNumber, items, value, deliveryFee]);

  return null;
}
