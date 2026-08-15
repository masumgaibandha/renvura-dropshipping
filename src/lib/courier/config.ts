/**
 * Server-only courier credential + capability config — mirrors `src/lib/analytics/config.ts`'s
 * pattern (one place that reads `process.env`, everything else checks presence through these
 * functions). Every name here is read verbatim from the environment; none are invented — see
 * CLAUDE.md's Phase 13 section for why Pathao's/Steadfast's exact required fields couldn't be
 * verified against official docs (both are gated behind a merchant-account login). Never
 * `NEXT_PUBLIC_*` — these are fulfillment credentials, not customer-facing config like the manual
 * payment numbers in `src/config/payment.ts`.
 *
 * Safety-hardening pass (post-review): having real credentials present is *not* sufficient to let
 * either adapter make a real network call. `isPathaoConfigured()`/`isSteadfastConfigured()` — the
 * functions every other module actually gates on — require BOTH credentials *and* an explicit
 * `COURIER_*_ENABLED` flag, defaulting to `false`. This is deliberate defense-in-depth: since
 * neither adapter's request/response shape has been verified against official documentation (both
 * are reconstructed from third-party sources — see `providers/pathao.ts`/`providers/steadfast.ts`),
 * a credential being added (e.g. during testing, or copy-pasted into the wrong environment) must
 * never be enough on its own to start sending real, unverified requests to a live courier account.
 * The enable flag is the explicit "a human reviewed the real docs and turned this on" signal.
 */

export interface PathaoConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  /**
   * Optional explicit override — officially confirmed (Get Merchant Store Info,
   * `GET /aladdin/api/v1/stores`) that a store id can be *discovered* rather than configured, so
   * this is no longer a hard credential requirement. `providers/pathao.ts`'s `resolveStoreId()`
   * uses this value if set, otherwise calls the Store Info endpoint and picks the
   * active/default store — never guesses an id. See CLAUDE.md's "Pathao store resolution" note.
   */
  storeId: string | null;
  baseUrl: string;
  env: PathaoEnv;
}

export type PathaoEnv = "sandbox" | "production";

/**
 * Confirmed directly from the Pathao merchant dashboard (not a third-party source) — unlike the
 * request/response field names elsewhere in `providers/pathao.ts`, these two host names are real,
 * official facts.
 */
const PATHAO_SANDBOX_BASE_URL = "https://courier-api-sandbox.pathao.com";
const PATHAO_PRODUCTION_BASE_URL = "https://api-hermes.pathao.com";

/** Defaults to `sandbox` for anything other than the exact literal `"production"` — never silently default to calling the live courier account. */
export function getPathaoEnv(): PathaoEnv {
  return process.env.PATHAO_ENV === "production" ? "production" : "sandbox";
}

/** Credentials present in the environment — necessary but not sufficient. See `isPathaoConfigured()`. `PATHAO_STORE_ID` is deliberately not required here — it's resolved dynamically via the Store Info endpoint when unset (officially confirmed as safe, see `providers/pathao.ts`'s `resolveStoreId()`). */
export function isPathaoCredentialsConfigured(): boolean {
  return Boolean(process.env.PATHAO_CLIENT_ID && process.env.PATHAO_CLIENT_SECRET && process.env.PATHAO_USERNAME && process.env.PATHAO_PASSWORD);
}

/** Explicit human opt-in, independent of whether credentials happen to be present. Defaults to `false` — never assume "credentials exist" means "safe to call." */
export function isPathaoApiEnabled(): boolean {
  return process.env.COURIER_PATHAO_ENABLED === "true";
}

/** The one real gate every caller (`providers/pathao.ts`, `registry.ts`) checks before a network call — requires credentials AND the explicit enable flag. */
export function isPathaoConfigured(): boolean {
  return isPathaoCredentialsConfigured() && isPathaoApiEnabled();
}

/** Throws if called while credentials are missing — callers must check `isPathaoCredentialsConfigured()` first (not `isPathaoConfigured()`, since this is also used for error-message redaction even when the enable flag is off). */
export function getPathaoConfig(): PathaoConfig {
  const { PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME, PATHAO_PASSWORD, PATHAO_STORE_ID, PATHAO_BASE_URL } = process.env;
  if (!PATHAO_CLIENT_ID || !PATHAO_CLIENT_SECRET || !PATHAO_USERNAME || !PATHAO_PASSWORD) {
    throw new Error("getPathaoConfig called while Pathao credentials are not configured");
  }
  const env = getPathaoEnv();
  return {
    clientId: PATHAO_CLIENT_ID,
    clientSecret: PATHAO_CLIENT_SECRET,
    username: PATHAO_USERNAME,
    password: PATHAO_PASSWORD,
    storeId: PATHAO_STORE_ID || null,
    // PATHAO_BASE_URL, if set, overrides the env-derived default entirely — an explicit escape
    // hatch, not the normal path. Normally this is the confirmed sandbox/production host for
    // whatever PATHAO_ENV resolves to.
    baseUrl: PATHAO_BASE_URL || (env === "production" ? PATHAO_PRODUCTION_BASE_URL : PATHAO_SANDBOX_BASE_URL),
    env,
  };
}

export interface SteadfastConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

/** Credentials present in the environment — necessary but not sufficient. See `isSteadfastConfigured()`. */
export function isSteadfastCredentialsConfigured(): boolean {
  return Boolean(process.env.STEADFAST_API_KEY && process.env.STEADFAST_SECRET_KEY);
}

/** Explicit human opt-in, independent of whether credentials happen to be present. Defaults to `false`. */
export function isSteadfastApiEnabled(): boolean {
  return process.env.COURIER_STEADFAST_ENABLED === "true";
}

/** The one real gate every caller checks before a network call — requires credentials AND the explicit enable flag. */
export function isSteadfastConfigured(): boolean {
  return isSteadfastCredentialsConfigured() && isSteadfastApiEnabled();
}

/** Throws if called while credentials are missing — callers must check `isSteadfastCredentialsConfigured()` first, same reasoning as `getPathaoConfig()`. */
export function getSteadfastConfig(): SteadfastConfig {
  const { STEADFAST_API_KEY, STEADFAST_SECRET_KEY, STEADFAST_BASE_URL } = process.env;
  if (!STEADFAST_API_KEY || !STEADFAST_SECRET_KEY) {
    throw new Error("getSteadfastConfig called while Steadfast credentials are not configured");
  }
  return {
    apiKey: STEADFAST_API_KEY,
    secretKey: STEADFAST_SECRET_KEY,
    // Default matches the host referenced by multiple independent unofficial sources (Steadfast's
    // platform is also known as "Packzy") — unverified against Steadfast's own docs, overridable.
    baseUrl: STEADFAST_BASE_URL || "https://portal.packzy.com/api/v1",
  };
}

/** Dev-only mock provider gate — must never be selectable in production regardless of this flag (see `registry.ts`). */
export function isMockCourierEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.COURIER_MOCK_ENABLED === "true";
}

/**
 * Pathao webhook secrets (inbound, `POST /api/webhooks/pathao` — see `src/lib/courier/webhook.ts`).
 * Deliberately modeled as two independent secrets, never assumed equal:
 * - `PATHAO_WEBHOOK_SECRET` — the value Pathao sends back verbatim in the `X-PATHAO-Signature`
 *   header on every real event notification; compared against incoming requests.
 * - `PATHAO_WEBHOOK_INTEGRATION_SECRET` — returned verbatim in the
 *   `X-Pathao-Merchant-Webhook-Integration-Secret` response header only for the one-time
 *   `{"event":"webhook_integration"}` handshake Pathao's panel uses to verify the endpoint.
 * Neither is ever `NEXT_PUBLIC_*` — both are inbound-verification secrets, not client config.
 */
export function getPathaoWebhookSecret(): string | null {
  return process.env.PATHAO_WEBHOOK_SECRET || null;
}

export function getPathaoWebhookIntegrationSecret(): string | null {
  return process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET || null;
}

/** Raw comparison value only — non-throwing, unlike `getPathaoConfig()`. Used by the webhook handler to sanity-check `payload.store_id` without requiring full Pathao API credentials to be configured (a webhook may legitimately arrive before/independent of outbound API access). */
export function getConfiguredPathaoStoreId(): string | null {
  return process.env.PATHAO_STORE_ID || null;
}
