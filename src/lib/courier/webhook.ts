import { timingSafeEqual } from "node:crypto";

import type { NormalizedCourierStatus } from "@/types/order";

/**
 * Pathao inbound webhook — pure parsing/verification logic only, no DB access (mirrors
 * `providers/pathao.ts`'s split from `src/services/courier.ts`: this file understands Pathao's
 * wire format, the service layer owns persistence). Built ONLY from the official webhook
 * documentation supplied for this pass — no speculative event strings, no assumed HMAC signing.
 *
 * Per the documentation, `X-PATHAO-Signature` is not a computed signature over the request body —
 * it is the shared secret value itself, sent back verbatim on every event. Verification is
 * therefore a direct secret comparison against `PATHAO_WEBHOOK_SECRET`, not an HMAC recomputation.
 */

/** Constant-time string comparison. Buffers of different length short-circuit `false` before reaching `timingSafeEqual` (which throws on length mismatch) — this leaks secret *length* via timing, not content, which is the standard accepted tradeoff for this class of check (same approach used by most HMAC-comparison libraries). */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies an incoming `X-PATHAO-Signature` header value against the configured secret. Returns
 * `false` for any missing/unconfigured/mismatched case — callers must reject (never mutate) on
 * `false`, and must call this BEFORE parsing/trusting the request body.
 */
export function verifyPathaoWebhookSignature(receivedHeaderValue: string | null, configuredSecret: string | null): boolean {
  if (!receivedHeaderValue || !configuredSecret) return false;
  return safeCompare(receivedHeaderValue, configuredSecret);
}

/** True only for the exact documented handshake shape `{"event": "webhook_integration"}` — checked before signature verification, since this is Pathao's own mechanism for confirming the endpoint (see CLAUDE.md's Phase 13 webhook note on why this is modeled as a distinct, separate check). */
export function isWebhookIntegrationEvent(body: unknown): boolean {
  return typeof body === "object" && body !== null && (body as Record<string, unknown>).event === "webhook_integration";
}

export interface PathaoWebhookPayload {
  consignmentId: string;
  merchantOrderId: string | null;
  updatedAt: string | null;
  timestamp: string | null;
  storeId: number | null;
  event: string;
  deliveryFeeBdt: number | null;
}

export type ParsePathaoWebhookPayloadResult = { ok: true; payload: PathaoWebhookPayload } | { ok: false; error: string };

/** Defensive parse matching the official sample payload shape. Only `consignment_id`/`event` are required — everything else is optional and defaults to `null` rather than throwing, since Pathao's documented event shapes vary. */
export function parsePathaoWebhookPayload(body: unknown): ParsePathaoWebhookPayloadResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Payload must be a JSON object." };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.event !== "string" || !b.event) {
    return { ok: false, error: "Missing or invalid 'event' field." };
  }
  if (typeof b.consignment_id !== "string" || !b.consignment_id) {
    return { ok: false, error: "Missing or invalid 'consignment_id' field." };
  }
  return {
    ok: true,
    payload: {
      consignmentId: b.consignment_id,
      merchantOrderId: typeof b.merchant_order_id === "string" ? b.merchant_order_id : null,
      updatedAt: typeof b.updated_at === "string" ? b.updated_at : null,
      timestamp: typeof b.timestamp === "string" ? b.timestamp : null,
      storeId: typeof b.store_id === "number" ? b.store_id : null,
      event: b.event,
      deliveryFeeBdt: typeof b.delivery_fee === "number" ? b.delivery_fee : null,
    },
  };
}

/**
 * Only `order.created` is a confirmed machine-readable event string (from the official sample
 * payload). Every other label visible in Pathao's merchant panel (Pickup Requested, Delivered,
 * etc.) has never been confirmed as an exact wire value, so mapping any of them here would be
 * guessing — exactly what this pass was told not to do. `null` means "no confident mapping,"
 * which callers must treat as "leave `normalizedStatus` unchanged," never as `"unknown"` — an
 * unrecognized event must never overwrite a previously-known-good status (e.g. a manual
 * `refreshShipmentStatus()` result) with a downgrade.
 */
const KNOWN_EVENT_STATUS_MAP: Partial<Record<string, NormalizedCourierStatus>> = {
  "order.created": "pending",
};

export function mapWebhookEventToNormalizedStatus(event: string): NormalizedCourierStatus | null {
  return KNOWN_EVENT_STATUS_MAP[event] ?? null;
}
