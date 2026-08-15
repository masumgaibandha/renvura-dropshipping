import { getSteadfastConfig, isSteadfastConfigured, isSteadfastCredentialsConfigured } from "../config";
import type { CourierProvider, CreateShipmentResult, NormalizedCourierStatus, ShipmentOrderInput, ShipmentStatusResult } from "../types";

/**
 * Steadfast Courier API adapter.
 *
 * ⚠️ UNVERIFIED AGAINST OFFICIAL DOCUMENTATION. Steadfast's own API docs live behind their
 * merchant portal (portal.packzy.com — Steadfast's platform is also known as "Packzy"); this
 * project has no merchant login. A third-party-hosted copy of a "SteadFast API Documentation"
 * PDF exists online, but its provenance and currency can't be verified, so it isn't treated as
 * authoritative either. The endpoint paths and field names below are reconstructed from
 * cross-referencing several independent third-party sources (community SDKs/packages, blog
 * posts) that consistently agree with each other, which is why this adapter is simpler and more
 * confidently shaped than Pathao's — but it is still unverified. The auth method, endpoint paths,
 * payload shape, and status map below are NOT production-authoritative. Before the first real
 * shipment:
 *   1. Get a real API key/secret key from a Steadfast merchant account.
 *   2. Read the real docs from the merchant portal.
 *   3. Diff every endpoint path, field name, and status code below against what's actually there.
 *   4. Only then set `COURIER_STEADFAST_ENABLED=true`.
 * `isSteadfastConfigured()` gates every network call and requires BOTH real credentials AND the
 * explicit `COURIER_STEADFAST_ENABLED=true` flag (default `false`) — a credential being present is
 * deliberately *not* enough on its own to let this unverified code start calling a live account.
 * See CLAUDE.md's Phase 13 section for the full reasoning.
 */

const REQUEST_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/** Checks credential *presence*, not the combined enable gate — see `pathao.ts`'s identical note. */
function sanitizeError(message: string): string {
  const config = isSteadfastCredentialsConfigured() ? getSteadfastConfig() : null;
  if (!config) return message;
  return message.split(config.secretKey).join("[redacted]").split(config.apiKey).join("[redacted]");
}

function authHeaders(config: ReturnType<typeof getSteadfastConfig>): HeadersInit {
  return { "Content-Type": "application/json", "Api-Key": config.apiKey, "Secret-Key": config.secretKey };
}

/** Best-effort mapping from Steadfast's (unverified) status strings to the internal normalized enum — must be revisited once real status values are observed. */
function mapStatus(rawStatus: string): NormalizedCourierStatus {
  const normalized = rawStatus.toLowerCase().replace(/\s+/g, "_");
  const table: Record<string, NormalizedCourierStatus> = {
    pending: "pending",
    in_review: "pending",
    delivered_approval_pending: "out_for_delivery",
    partial_delivered_approval_pending: "out_for_delivery",
    cancelled_approval_pending: "in_transit",
    unknown_approval_pending: "in_transit",
    delivered: "delivered",
    partial_delivered: "delivered",
    cancelled: "cancelled",
    hold: "in_transit",
    in_transit: "in_transit",
  };
  return table[normalized] ?? "unknown";
}

export function createSteadfastProvider(): CourierProvider {
  return {
    id: "steadfast",
    apiCapable: true,
    isConfigured: isSteadfastConfigured,

    async createShipment(order: ShipmentOrderInput): Promise<CreateShipmentResult> {
      if (!isSteadfastConfigured()) return { status: "not_configured" };
      // Steadfast's create-order API is documented (across every cross-referenced source) as
      // accepting a single free-text recipient_address — no city/zone/area ID system like
      // Pathao's, so there is no location-mapping precondition here.
      const config = getSteadfastConfig();
      const fullAddress = [order.address.addressLine, order.address.landmark, order.address.upazila, order.address.district, order.address.division]
        .filter(Boolean)
        .join(", ");
      const itemDescription = order.items.map((item) => `${item.title} x${item.quantity}`).join(", ").slice(0, 200);

      try {
        const response = await fetchWithTimeout(`${config.baseUrl}/create_order`, {
          method: "POST",
          headers: authHeaders(config),
          body: JSON.stringify({
            invoice: order.orderNumber,
            recipient_name: order.recipientName,
            recipient_phone: order.recipientPhone,
            recipient_address: fullAddress,
            cod_amount: order.codAmountBdt,
            note: itemDescription,
          }),
        });

        if (!response.ok) {
          let detail = `HTTP ${response.status}`;
          try {
            const errorBody = (await response.json()) as { message?: string };
            if (errorBody.message) detail = `${detail}: ${errorBody.message}`;
          } catch {
            // Non-JSON error body — keep the generic status-only detail.
          }
          return { status: "failed", error: sanitizeError(`Steadfast create-order failed: ${detail}`) };
        }

        const body = (await response.json()) as { consignment?: { consignment_id?: number | string; tracking_code?: string; invoice?: string } };
        const consignmentId = body.consignment?.consignment_id;
        if (consignmentId === undefined) {
          return { status: "failed", error: "Steadfast create-order succeeded but returned no consignment_id — reconcile manually before retrying." };
        }
        const trackingId = body.consignment?.tracking_code ?? String(consignmentId);
        return { status: "created", consignmentId: String(consignmentId), trackingId, trackingUrl: null, externalOrderId: body.consignment?.invoice ?? order.orderNumber };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { status: "failed", error: sanitizeError(`Steadfast create-order request failed: ${message}`) };
      }
    },

    async getShipmentStatus(consignmentId: string): Promise<ShipmentStatusResult> {
      if (!isSteadfastConfigured()) return { status: "not_configured" };
      const config = getSteadfastConfig();
      try {
        const response = await fetchWithTimeout(`${config.baseUrl}/status_by_cid/${encodeURIComponent(consignmentId)}`, {
          method: "GET",
          headers: authHeaders(config),
        });
        if (!response.ok) {
          return { status: "failed", error: sanitizeError(`Steadfast status lookup failed: HTTP ${response.status}`) };
        }
        const body = (await response.json()) as { delivery_status?: string };
        if (!body.delivery_status) return { status: "failed", error: "Steadfast status lookup succeeded but returned no delivery_status." };
        return { status: "ok", normalizedStatus: mapStatus(body.delivery_status), rawStatusCode: body.delivery_status };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { status: "failed", error: sanitizeError(`Steadfast status request failed: ${message}`) };
      }
    },

    // No stable public tracking URL pattern found in any cross-referenced source — never fabricate one.
    getTrackingUrl: () => null,
  };
}
