import { getPathaoConfig, isPathaoConfigured, isPathaoCredentialsConfigured } from "../config";
import type { CourierProvider, CreateShipmentResult, NormalizedCourierStatus, ShipmentOrderInput, ShipmentStatusResult } from "../types";

/**
 * Pathao Courier Merchant API adapter.
 *
 * ⚠️ UNVERIFIED AGAINST OFFICIAL DOCUMENTATION. Pathao's own API docs live only inside their
 * merchant dashboard ("Developer API" section, reachable after signing up as a Pathao merchant —
 * confirmed by reading Pathao's own public help article, which points there and nowhere else) —
 * this project has no merchant account, so the endpoint paths, field names, and auth flow below
 * are reconstructed from cross-referencing several independent third-party sources (community
 * SDKs on GitHub/npm/PyPI, integration blog posts), not read from Pathao's own docs. Treat every
 * literal string in this file as a best-effort placeholder — the auth method, endpoint paths,
 * payload shape, and status map below are NOT production-authoritative. Before the first real
 * shipment:
 *   1. Get real sandbox/production credentials from a Pathao merchant account.
 *   2. Open the "Developer API" section of that dashboard and read the real docs.
 *   3. Diff every endpoint path, field name, and status code below against what's actually there.
 *   4. Only then set `COURIER_PATHAO_ENABLED=true`.
 * `isPathaoConfigured()` gates every network call and requires BOTH real credentials AND the
 * explicit `COURIER_PATHAO_ENABLED=true` flag (default `false`) — a credential being present is
 * deliberately *not* enough on its own to let this unverified code start calling a live account.
 * See CLAUDE.md's Phase 13 section for the full reasoning.
 */

const TOKEN_SAFETY_MARGIN_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

// Process-local cache — acceptable for a single Next.js server instance; a token refresh on cold
// start is cheap and this avoids requesting a new token on every shipment call (see CLAUDE.md's
// "Pathao auth" note: don't request a new token for every shipment if not necessary).
let cachedToken: CachedToken | null = null;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/** Sanitizes an error string so a credential can never leak into a stored/logged message — checks credential *presence*, not the combined enable gate, so redaction still applies even if credentials exist while the `COURIER_PATHAO_ENABLED` flag is off. */
function sanitizeError(message: string): string {
  const config = isPathaoCredentialsConfigured() ? getPathaoConfig() : null;
  if (!config) return message;
  return message.split(config.clientSecret).join("[redacted]").split(config.password).join("[redacted]");
}

async function getAccessToken(): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  if (cachedToken && cachedToken.expiresAt - TOKEN_SAFETY_MARGIN_MS > Date.now()) {
    return { ok: true, token: cachedToken.accessToken };
  }

  const config = getPathaoConfig();
  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        username: config.username,
        password: config.password,
        grant_type: "password",
      }),
    });
    if (!response.ok) {
      return { ok: false, error: sanitizeError(`Pathao auth failed: HTTP ${response.status}`) };
    }
    const body = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!body.access_token) {
      return { ok: false, error: "Pathao auth failed: no access_token in response" };
    }
    cachedToken = { accessToken: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
    return { ok: true, token: body.access_token };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: sanitizeError(`Pathao auth request failed: ${message}`) };
  }
}

/** Best-effort mapping from Pathao's (unverified) order-status strings to the internal normalized enum — must be revisited once real status values are observed. */
function mapStatus(rawStatus: string): NormalizedCourierStatus {
  const normalized = rawStatus.toLowerCase().replace(/\s+/g, "_");
  const table: Record<string, NormalizedCourierStatus> = {
    pending: "pending",
    pickup_requested: "pickup_requested",
    assigned_for_pickup: "pickup_requested",
    picked_up: "picked_up",
    in_transit: "in_transit",
    at_sorting_hub: "in_transit",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    delivery_failed: "delivery_failed",
    return: "returned",
    returned: "returned",
    cancelled: "cancelled",
  };
  return table[normalized] ?? "unknown";
}

export function createPathaoProvider(): CourierProvider {
  return {
    id: "pathao",
    apiCapable: true,
    isConfigured: isPathaoConfigured,

    async createShipment(order: ShipmentOrderInput): Promise<CreateShipmentResult> {
      if (!isPathaoConfigured()) return { status: "not_configured" };
      if (!order.pathaoLocation) {
        return { status: "failed", error: "Pathao area mapping is required for this delivery address." };
      }
      if (order.totalWeightGrams === null) {
        return { status: "failed", error: "One or more items are missing a shipping weight." };
      }

      const auth = await getAccessToken();
      if (!auth.ok) return { status: "failed", error: auth.error };

      const config = getPathaoConfig();
      const itemDescription = order.items.map((item) => `${item.title} x${item.quantity}`).join(", ").slice(0, 200);

      try {
        const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify({
            store_id: config.storeId,
            merchant_order_id: order.orderNumber,
            recipient_name: order.recipientName,
            recipient_phone: order.recipientPhone,
            recipient_address: [order.address.addressLine, order.address.landmark].filter(Boolean).join(", "),
            recipient_city: order.pathaoLocation.cityId,
            recipient_zone: order.pathaoLocation.zoneId,
            recipient_area: order.pathaoLocation.areaId,
            delivery_type: 48, // unverified placeholder — commonly cited value for "normal delivery"
            item_type: 2, // unverified placeholder — commonly cited value for "parcel"
            item_quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
            item_weight: (order.totalWeightGrams / 1000).toFixed(2),
            item_description: itemDescription,
            amount_to_collect: order.codAmountBdt,
          }),
        });

        if (!response.ok) {
          let detail = `HTTP ${response.status}`;
          try {
            const errorBody = (await response.json()) as { message?: string; errors?: unknown };
            if (errorBody.message) detail = `${detail}: ${errorBody.message}`;
          } catch {
            // Non-JSON error body — keep the generic status-only detail.
          }
          return { status: "failed", error: sanitizeError(`Pathao create-order failed: ${detail}`) };
        }

        const body = (await response.json()) as { data?: { consignment_id?: string; merchant_order_id?: string } };
        const consignmentId = body.data?.consignment_id;
        if (!consignmentId) {
          return { status: "failed", error: "Pathao create-order succeeded but returned no consignment_id — reconcile manually before retrying." };
        }
        return { status: "created", consignmentId, trackingId: consignmentId, trackingUrl: null, externalOrderId: body.data?.merchant_order_id ?? order.orderNumber };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { status: "failed", error: sanitizeError(`Pathao create-order request failed: ${message}`) };
      }
    },

    async getShipmentStatus(consignmentId: string): Promise<ShipmentStatusResult> {
      if (!isPathaoConfigured()) return { status: "not_configured" };
      const auth = await getAccessToken();
      if (!auth.ok) return { status: "failed", error: auth.error };

      const config = getPathaoConfig();
      try {
        const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`, {
          method: "GET",
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!response.ok) {
          return { status: "failed", error: sanitizeError(`Pathao status lookup failed: HTTP ${response.status}`) };
        }
        const body = (await response.json()) as { data?: { order_status?: string } };
        const rawStatus = body.data?.order_status;
        if (!rawStatus) return { status: "failed", error: "Pathao status lookup succeeded but returned no order_status." };
        return { status: "ok", normalizedStatus: mapStatus(rawStatus), rawStatusCode: rawStatus };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { status: "failed", error: sanitizeError(`Pathao status request failed: ${message}`) };
      }
    },

    // Pathao has not been observed to expose a stable public tracking URL pattern in any
    // cross-referenced source — never fabricate one. Staff can look up the consignment ID in the
    // Pathao merchant dashboard directly.
    getTrackingUrl: () => null,
  };
}
