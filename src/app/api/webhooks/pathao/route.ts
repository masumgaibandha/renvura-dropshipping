import { NextResponse, type NextRequest } from "next/server";

import { getPathaoWebhookIntegrationSecret, getPathaoWebhookSecret } from "@/lib/courier/config";
import { isWebhookIntegrationEvent, parsePathaoWebhookPayload, verifyPathaoWebhookSignature } from "@/lib/courier/webhook";
import { processPathaoWebhookEvent } from "@/services/courier";

/**
 * Pathao inbound webhook receiver (Phase 14) — the project's first Route Handler (every other
 * mutation in this codebase is a Server Action; a webhook is an external-consumer endpoint, the
 * one case CLAUDE.md's Server Actions note calls out as needing a real Route Handler).
 *
 * Two independent secrets, per official docs — see `src/lib/courier/config.ts`'s doc comment:
 * `PATHAO_WEBHOOK_SECRET` (compared against every real event's `X-PATHAO-Signature`) and
 * `PATHAO_WEBHOOK_INTEGRATION_SECRET`. Never assumed equal.
 *
 * Pathao's real webhook TEST run revealed an additional runtime requirement beyond the initial
 * `webhook_integration` handshake: `X-Pathao-Merchant-Webhook-Integration-Secret` must also be
 * present on every successfully *authenticated* response — not just the handshake — including
 * `order.created`, other known/unknown events, and safely-acknowledged non-mutating outcomes
 * (order not found, a consignment/merchant-order mismatch). `pathaoWebhookResponse()` is the one
 * place that attaches it, so no return branch below duplicates header logic. The header is
 * deliberately withheld on anything that happens *before* successful signature verification
 * (malformed JSON, a missing/invalid `X-PATHAO-Signature`) — see `verifyPathaoWebhookSignature()`
 * below; that boundary is unchanged, only what happens *after* it changed.
 *
 * Response codes: 202 for a successful integration handshake; 200 for any authenticated event that
 * was safely processed; 401 for a missing/invalid signature (no integration header — this is not
 * an authenticated response); 400 for malformed JSON (pre-auth, no header) or an invalid payload
 * shape on an authenticated request (header present); 503 if the integration handshake is
 * requested before `PATHAO_WEBHOOK_INTEGRATION_SECRET` is configured (fails safely — no header,
 * since there is no correct value to send). Never returns a stack trace or any secret value in a
 * response body.
 */

/**
 * The single place `X-Pathao-Merchant-Webhook-Integration-Secret` is attached to a response.
 * Only ever call this for a response that follows successful signature verification (or the
 * integration handshake, which is its own distinct check) — never for a 401/pre-auth response.
 * If the secret isn't configured, the event is still processed/acknowledged normally (a normal
 * webhook must never fail just because an optional diagnostic header can't be set) — the header
 * is simply omitted, never sent empty or with a wrong value.
 */
function pathaoWebhookResponse(body: unknown, status: number): NextResponse {
  const integrationSecret = getPathaoWebhookIntegrationSecret();
  const headers = new Headers();
  if (integrationSecret) {
    headers.set("X-Pathao-Merchant-Webhook-Integration-Secret", integrationSecret);
  }
  if (body === null) {
    return new NextResponse(null, { status, headers });
  }
  headers.set("Content-Type", "application/json");
  return new NextResponse(JSON.stringify(body), { status, headers });
}

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    // Pre-auth: body couldn't even be read. No integration header — never attach it to an
    // unauthenticated/pre-auth response (see CLAUDE.md's Phase 14 webhook note).
    return NextResponse.json({ error: "Could not read request body." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Pre-auth malformed JSON — no header, same reasoning as above.
    return NextResponse.json({ error: "Malformed JSON." }, { status: 400 });
  }

  // Integration handshake: Pathao's own mechanism for verifying this endpoint. Checked before
  // signature verification and never touches the database — modeled as a distinct, separate check
  // from the ongoing per-event signature (see `src/lib/courier/config.ts`'s doc comment).
  if (isWebhookIntegrationEvent(body)) {
    const integrationSecret = getPathaoWebhookIntegrationSecret();
    if (!integrationSecret) {
      console.error("Pathao webhook integration handshake received but PATHAO_WEBHOOK_INTEGRATION_SECRET is not configured.");
      return NextResponse.json({ error: "Webhook integration is not configured." }, { status: 503 });
    }
    return pathaoWebhookResponse(null, 202);
  }

  // Every other event must carry a valid signature BEFORE any further processing, and before any
  // response carries the integration header — reject first, parse/mutate/header never happens on
  // an unverified request. Headers.get() is case-insensitive per the Fetch API spec, so this
  // matches "X-PATHAO-Signature" regardless of the casing Pathao actually sends.
  const receivedSignature = request.headers.get("x-pathao-signature");
  const configuredSecret = getPathaoWebhookSecret();
  if (!verifyPathaoWebhookSignature(receivedSignature, configuredSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // From this point on, the request is authenticated — every response below carries the
  // integration header (best-effort if configured).
  const parsed = parsePathaoWebhookPayload(body);
  if (!parsed.ok) {
    return pathaoWebhookResponse({ error: parsed.error }, 400);
  }

  try {
    const result = await processPathaoWebhookEvent(parsed.payload);
    return pathaoWebhookResponse({ received: true, outcome: result.outcome }, 200);
  } catch (error) {
    console.error("Pathao webhook processing failed:", error instanceof Error ? error.message : error);
    return pathaoWebhookResponse({ error: "Internal error while processing webhook." }, 500);
  }
}
