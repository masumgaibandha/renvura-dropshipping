"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { trackGaPageView } from "@/lib/analytics/ga4-client";
import { trackMetaPageView } from "@/lib/analytics/meta-client";

/**
 * Fires PageView/page_view on client-side route changes only — the very first page load's
 * PageView already comes from `AnalyticsScripts.tsx`'s init snippets, so this component
 * deliberately skips firing on its own first render (the `isFirstRender` ref below) to avoid a
 * duplicate initial PageView.
 *
 * Deliberately reads only `usePathname()`, never `useSearchParams()` — query strings can carry
 * PII (`/verify-email?email=...`, `/reset-password?email=...`) and must never reach Meta/GA4 (see
 * CLAUDE.md's Phase 11 "PageView URL sanitization" note). `usePathname()` alone needs no Suspense
 * boundary, unlike `useSearchParams()` (see `SearchBar.tsx` for a component that does need one).
 */
export function RouteTracker() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    trackMetaPageView();
    trackGaPageView(pathname);
  }, [pathname]);

  return null;
}
