/**
 * Single source of truth for analytics configuration/enablement — every other analytics module
 * (client or server) reads presence/enablement through this file rather than touching
 * `process.env` directly, so there is exactly one place to change the gating rule later (e.g.
 * when real consent-management logic replaces `isAnalyticsConsentGranted`'s current always-true
 * stub — see its doc comment).
 *
 * `NEXT_PUBLIC_*` values are safe to read anywhere (bundled into the client build by Next.js
 * itself); everything else here is server-only and must never be imported from a Client
 * Component — `metaCapiServerConfig()`/`isMetaCapiConfigured()` read `META_CAPI_ACCESS_TOKEN`,
 * which would leak into the browser bundle if imported client-side.
 */

/** Bangladesh audience, no GDPR-style gate assumed today (see CLAUDE.md) — a real consent banner
 * can replace this single function later without touching any call site. */
export function isAnalyticsConsentGranted(): boolean {
  return true;
}

/**
 * `NODE_ENV=production` (Vercel Production/Preview) always allows analytics to load once an ID is
 * configured. Local dev is opt-in only via `NEXT_PUBLIC_ANALYTICS_ENABLED=true`, so running the app
 * locally never pollutes real Meta/GA4 data even if IDs happen to be present in `.env.local`.
 */
function analyticsExplicitlyEnabledLocally(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
}

function analyticsEnvAllowed(): boolean {
  return process.env.NODE_ENV === "production" || analyticsExplicitlyEnabledLocally();
}

export const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null;
export const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? null;

/** Client-safe: whether the browser Meta Pixel should load at all. */
export function isMetaPixelEnabled(): boolean {
  return Boolean(metaPixelId) && analyticsEnvAllowed() && isAnalyticsConsentGranted();
}

/** Client-safe: whether GA4 gtag should load at all. */
export function isGa4Enabled(): boolean {
  return Boolean(gaMeasurementId) && analyticsEnvAllowed() && isAnalyticsConsentGranted();
}

/** Server-only — reads `META_CAPI_ACCESS_TOKEN`. Never import this file's server exports from a Client Component. */
export interface MetaCapiServerConfig {
  accessToken: string;
  /** The Pixel/Dataset ID CAPI events are attributed to — `META_CAPI_DATASET_ID` if set (Conversions API Gateway / a dedicated dataset), otherwise the same Pixel ID the browser uses, which is Meta's standard single-dataset setup. */
  datasetId: string;
  testEventCode: string | null;
  /** `META_GRAPH_API_VERSION` verbatim, or `""` when unset — `meta-server.ts` applies the actual default (`META_GRAPH_API_VERSION_DEFAULT`) via `config.graphApiVersion || META_GRAPH_API_VERSION_DEFAULT`. Deliberately not defaulted here too, so there is exactly one place the default version lives. */
  graphApiVersion: string;
}

export function isMetaCapiConfigured(): boolean {
  return Boolean(process.env.META_CAPI_ACCESS_TOKEN) && Boolean(process.env.META_CAPI_DATASET_ID ?? metaPixelId);
}

/** Throws if called while unconfigured — callers must check `isMetaCapiConfigured()` first. */
export function getMetaCapiServerConfig(): MetaCapiServerConfig {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const datasetId = process.env.META_CAPI_DATASET_ID ?? metaPixelId;
  if (!accessToken || !datasetId) {
    throw new Error("getMetaCapiServerConfig called while Meta CAPI is not configured");
  }
  return {
    accessToken,
    datasetId,
    testEventCode: process.env.META_TEST_EVENT_CODE ?? null,
    // Deliberately no fallback version here — `meta-server.ts`'s `META_GRAPH_API_VERSION_DEFAULT`
    // is the single source of truth for the default, applied via `config.graphApiVersion ||
    // META_GRAPH_API_VERSION_DEFAULT`. A second hardcoded default here previously silently shadowed
    // that constant whenever META_GRAPH_API_VERSION was unset — caught by a real CAPI re-test.
    graphApiVersion: process.env.META_GRAPH_API_VERSION ?? "",
  };
}
