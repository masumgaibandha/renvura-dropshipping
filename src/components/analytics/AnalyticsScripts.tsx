import Script from "next/script";

import { gaMeasurementId, isGa4Enabled, isMetaPixelEnabled, metaPixelId } from "@/lib/analytics/config";

/**
 * Loads the Meta Pixel base code and GA4 `gtag.js`, each only when its ID is configured and
 * enabled (`isMetaPixelEnabled`/`isGa4Enabled` — see `src/lib/analytics/config.ts`; with nothing
 * configured, this renders nothing at all, and the rest of the site is completely unaffected).
 * Server Component — reading `NEXT_PUBLIC_*` env vars needs no client hook, so this stays out of
 * the client bundle and doesn't force `src/app/layout.tsx` into dynamic rendering. Mounted once in
 * the root layout; `strategy="afterInteractive"` keeps these from blocking first paint/LCP.
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
        <Script id="meta-pixel-base" strategy="afterInteractive">
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
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaMeasurementId}', { page_path: window.location.pathname });
            `}
          </Script>
        </>
      )}
    </>
  );
}
