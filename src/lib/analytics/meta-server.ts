import { getMetaCapiServerConfig, isMetaCapiConfigured } from "./config";
import { ANALYTICS_CURRENCY, type PurchaseEventData } from "./event-types";
import { hashForMeta, normalizeEmailForHashing, normalizePhoneForMeta } from "./normalization";
import { toMetaContentIds, toMetaContents } from "./mapping";

/**
 * Server-only Meta Conversions API sender. Currently used for Purchase only (the only event this
 * phase sends server-side — see CLAUDE.md's Phase 11 section for why every other event stays
 * browser-only Pixel). Never throws: `createOrder`'s `after()` callback that calls this must never
 * be able to affect the already-returned order response, the same principle already established
 * for `sendOrderConfirmationEmail` (Phase 10.5).
 */

/**
 * Meta's Graph API version changes over time and this code was written against a snapshot of
 * Meta's documentation — do NOT assume this is still current by the time this runs in production.
 * Override with `META_GRAPH_API_VERSION` if Meta has deprecated this version; verify against
 * https://developers.facebook.com/docs/graph-api/changelog before relying on the default.
 *
 * Checked directly against Meta's own changelog on 2026-08-13 (not memory): v21.0 (this file's
 * original default) was still technically supported at that point (retires January 21, 2027) but
 * had already become the second-oldest of seven active versions, with Meta's own 2026 guidance
 * pushing implementers toward v22.0+. Moved to v24.0 (introduced October 8, 2025 — ~10 months
 * mature at time of writing, past any initial-release issues; supported until February 18, 2028)
 * rather than the newest version (v26.0, introduced just weeks prior at the time of this check) —
 * deliberately not the bleeding edge, per this project's own "verify, don't guess, and don't
 * default to newest/beta" rule for third-party API versions.
 */
const META_GRAPH_API_VERSION_DEFAULT = "v24.0";

const CAPI_TIMEOUT_MS = 5000;

export interface MetaCapiUserData {
  email: string | null;
  phone: string | null;
  clientIpAddress: string | null;
  clientUserAgent: string | null;
  fbp: string | null;
  fbc: string | null;
}

export interface SendMetaCapiPurchaseInput {
  purchase: PurchaseEventData;
  eventSourceUrl: string;
  userData: MetaCapiUserData;
}

export type SendMetaCapiPurchaseResult = { status: "sent"; eventId: string } | { status: "not_configured" } | { status: "failed"; error: string };

/** Builds Meta's `user_data` object — only hashed email/phone, never raw. `fbp`/`fbc`/IP/UA are sent as-is (Meta does not require these hashed) and omitted entirely when absent, never fabricated. */
function buildUserData(userData: MetaCapiUserData): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const hashedEmail = hashForMeta(userData.email ? normalizeEmailForHashing(userData.email) : null);
  const hashedPhone = hashForMeta(userData.phone ? normalizePhoneForMeta(userData.phone) : null);
  if (hashedEmail) result.em = [hashedEmail];
  if (hashedPhone) result.ph = [hashedPhone];
  if (userData.clientIpAddress) result.client_ip_address = userData.clientIpAddress;
  if (userData.clientUserAgent) result.client_user_agent = userData.clientUserAgent;
  if (userData.fbp) result.fbp = userData.fbp;
  if (userData.fbc) result.fbc = userData.fbc;
  return result;
}

/**
 * Sends one Purchase event to Meta CAPI. Returns a result object rather than throwing — the one
 * caller (`scheduleMetaPurchaseCapi` in `src/actions/orders.ts`) records this outcome on the order
 * (`Order.analytics.metaPurchase`) purely for admin visibility, exactly mirroring
 * `sendOrderConfirmationEmail`'s `{status, ...}` return shape.
 */
export async function sendMetaCapiPurchase({ purchase, eventSourceUrl, userData }: SendMetaCapiPurchaseInput): Promise<SendMetaCapiPurchaseResult> {
  if (!isMetaCapiConfigured()) {
    return { status: "not_configured" };
  }

  const config = getMetaCapiServerConfig();
  const graphApiVersion = config.graphApiVersion || META_GRAPH_API_VERSION_DEFAULT;
  const url = `https://graph.facebook.com/${graphApiVersion}/${config.datasetId}/events`;

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: purchase.eventId,
        action_source: "website",
        event_source_url: eventSourceUrl,
        user_data: buildUserData(userData),
        custom_data: {
          currency: ANALYTICS_CURRENCY,
          value: purchase.value,
          content_ids: toMetaContentIds(purchase.items),
          contents: toMetaContents(purchase.items),
          content_type: "product",
          num_items: purchase.items.reduce((sum, item) => sum + item.quantity, 0),
          order_id: purchase.orderNumber,
        },
      },
    ],
    ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CAPI_TIMEOUT_MS);

  try {
    const response = await fetch(`${url}?access_token=${encodeURIComponent(config.accessToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Never include the access token (part of the request URL) in a logged/returned error string.
      let detail = `HTTP ${response.status}`;
      try {
        const errorBody = (await response.json()) as { error?: { message?: string } };
        if (errorBody.error?.message) detail = `${detail}: ${errorBody.error.message}`;
      } catch {
        // Response body wasn't JSON — keep the generic status-only detail.
      }
      return { status: "failed", error: detail };
    }

    return { status: "sent", eventId: purchase.eventId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { status: "failed", error: message.replace(config.accessToken, "[redacted]") };
  } finally {
    clearTimeout(timeout);
  }
}
