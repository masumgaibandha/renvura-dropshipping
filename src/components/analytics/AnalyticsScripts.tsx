import Script from "next/script";

import { gaMeasurementId, isGa4Enabled, isMetaPixelEnabled, metaPixelId } from "@/lib/analytics/config";

/**
 * Loads the Meta Pixel base code and GA4 `gtag.js`, each only when its ID is configured and
 * enabled (`isMetaPixelEnabled`/`isGa4Enabled` — see `src/lib/analytics/config.ts`; with nothing
 * configured, this renders nothing at all, and the rest of the site is completely unaffected).
 * Server Component — reading `NEXT_PUBLIC_*` env vars needs no client hook, so this stays out of
 * the client bundle and doesn't force `src/app/layout.tsx` into dynamic rendering.
 *
 * The two inline stub-defining scripts (`meta-pixel-base`, `ga4-init`) use
 * `strategy="beforeInteractive"`, deliberately NOT `afterInteractive`. This was a real production
 * bug: `afterInteractive` only guarantees a script runs "early, after some hydration occurs" — it
 * does NOT guarantee it runs before every Client Component's own `useEffect`. On a page reached as
 * the *first* load of a session (very commonly `/order-success/[orderNumber]` — a direct link, a
 * refresh, a new tab), `PurchaseTracker.tsx`'s effect could run before this script had executed at
 * all, meaning `window.fbq`/`window.gtag` didn't exist yet — silently and permanently dropping the
 * browser Purchase event for that load (PageView still "worked" because it's fired inline by this
 * same script, with no such race against itself). `beforeInteractive` guarantees Next.js executes
 * these scripts before ANY hydration begins, so the queueing stubs Meta/Google's own snippets
 * define (`n.queue.push(arguments)` / `dataLayer.push(arguments)`) are always present by the time
 * any component's effect runs — every `fbq()`/`gtag()` call queues safely even before the real
 * `fbevents.js`/`gtag.js` library has finished loading over the network (those stay fetched
 * asynchronously — `t.async=!0` — so this doesn't block on a network round trip, just tiny inline
 * JS). This is Next.js's documented use case for `beforeInteractive` (critical script setup needed
 * before any part of the page becomes interactive), not a misuse.
 *
 * Each snippet fires its own initial PageView/page_view exactly once at load — subsequent
 * client-side route changes are handled separately by `RouteTracker.tsx`, which explicitly skips
 * its own first render so the two never double-fire for the initial page load.
 */
export function AnalyticsScripts() {
  const metaEnabled = isMetaPixelEnabled();
  const gaEnabled = isGa4Enabled();

  return (
    <>
      {metaEnabled && (
        // This rule only recognizes the Pages Router's pages/_document.js; the App Router's root
        // layout (src/app/layout.tsx, which renders <AnalyticsScripts /> directly) fills the
        // identical role — Next.js's own App Router docs use this exact pattern.
        // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
        <Script id="meta-pixel-base" strategy="beforeInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {gaEnabled && (
        <>
          {/* Same false-positive as meta-pixel-base above — App Router root layout, not pages/_document.js. */}
          {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
          <Script id="ga4-init" strategy="beforeInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaMeasurementId}', { page_path: window.location.pathname });
            `}
          </Script>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
        </>
      )}
    </>
  );
}
