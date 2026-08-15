import { NextResponse, type NextRequest } from "next/server";

import { getPathaoWebhookIntegrationSecret, getPathaoWebhookSecret } from "@/lib/courier/config";
import { isWebhookIntegrationEvent, parsePathaoWebhookPayload, verifyPathaoWebhookSignature } from "@/lib/courier/webhook";
import { processPathaoWebhookEvent } from "@/services/courier";

/**
 * Pathao inbound webhook receiver (Phase 14) — the project's first Route Handler (every other
 * mutation in this codebase is a Server Action; a webhook is an external-consumer endpoint, the
 * one case CLAUDE.md's Server Actions note calls out as needing a real Route Handler).
 *
 * SANDBOX/LOCAL-DEVELOPMENT FOCUSED FOR THIS PASS. The real Pathao merchant panel callback URL is
 * NOT configured to point here yet, and Pathao production is not enabled anywhere (see
 * `COURIER_PATHAO_ENABLED`/`PATHAO_ENV` — unchanged, still sandbox-only). This route is built and
 * locally testable ahead of that step, not wired up to receive real traffic yet.
 *
 * Two independent secrets, per official docs — see `src/lib/courier/config.ts`'s doc comment:
 * `PATHAO_WEBHOOK_SECRET` (compared against every real event's `X-PATHAO-Signature`) and
 * `PATHAO_WEBHOOK_INTEGRATION_SECRET` (returned verbatim only for the one-time verification
 * handshake). Never assumed equal.
 *
 * Response codes: 202 for a successful integration handshake; 200 for any authenticated event that
 * was safely processed (including "acknowledged but not mutated" cases — order not found, a
 * consignment/store mismatch, or a genuinely unknown event — all deliberately non-error responses
 * so Pathao doesn't retry indefinitely for something that will never resolve differently); 401 for
 * a missing/invalid signature; 400 for malformed JSON or an invalid payload shape; 503 if the
 * integration handshake is requested before `PATHAO_WEBHOOK_INTEGRATION_SECRET` is configured.
 * Never returns a stack trace or any secret value in a response body.
 */
export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Could not read request body." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ error: "Malformed JSON." }, { status: 400 });
  }

  // Integration handshake: Pathao's own mechanism for verifying this endpoint. Checked before
  // signature verification and never touches the database — see CLAUDE.md's Phase 14 webhook note
  // on why this is modeled as a distinct, separate check from the ongoing per-event signature.
  if (isWebhookIntegrationEvent(body)) {
    const integrationSecret = getPathaoWebhookIntegrationSecret();
    if (!integrationSecret) {
      console.error("Pathao webhook integration handshake received but PATHAO_WEBHOOK_INTEGRATION_SECRET is not configured.");
      return NextResponse.json({ error: "Webhook integration is not configured." }, { status: 503 });
    }
    return new NextResponse(null, {
      status: 202,
      headers: { "X-Pathao-Merchant-Webhook-Integration-Secret": integrationSecret },
    });
  }

  // Every other event must carry a valid signature BEFORE any further processing — reject first,
  // parse/mutate never happens on an unverified request.
  // Headers.get() is case-insensitive per the Fetch API spec, so this matches
  // "X-PATHAO-Signature" regardless of the casing Pathao actually sends.
  const receivedSignature = request.headers.get("x-pathao-signature");
  const configuredSecret = getPathaoWebhookSecret();
  if (!verifyPathaoWebhookSignature(receivedSignature, configuredSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = parsePathaoWebhookPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await processPathaoWebhookEvent(parsed.payload);
    return NextResponse.json({ received: true, outcome: result.outcome }, { status: 200 });
  } catch (error) {
    console.error("Pathao webhook processing failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal error while processing webhook." }, { status: 500 });
  }
}
