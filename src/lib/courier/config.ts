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
  /** Pickup point id from Pathao's own merchant dashboard (Stores). Not something Renvura invents or stores an address for — see CLAUDE.md's "Pickup / store configuration" note. */
  storeId: string;
  baseUrl: string;
}

/** Credentials present in the environment — necessary but not sufficient. See `isPathaoConfigured()`. */
export function isPathaoCredentialsConfigured(): boolean {
  return Boolean(
    process.env.PATHAO_CLIENT_ID && process.env.PATHAO_CLIENT_SECRET && process.env.PATHAO_USERNAME && process.env.PATHAO_PASSWORD && process.env.PATHAO_STORE_ID,
  );
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
  if (!PATHAO_CLIENT_ID || !PATHAO_CLIENT_SECRET || !PATHAO_USERNAME || !PATHAO_PASSWORD || !PATHAO_STORE_ID) {
    throw new Error("getPathaoConfig called while Pathao credentials are not configured");
  }
  return {
    clientId: PATHAO_CLIENT_ID,
    clientSecret: PATHAO_CLIENT_SECRET,
    username: PATHAO_USERNAME,
    password: PATHAO_PASSWORD,
    storeId: PATHAO_STORE_ID,
    // Default matches the host referenced by multiple independent unofficial sources — unverified
    // against Pathao's own docs (unreachable without a merchant login), overridable in case it's wrong.
    baseUrl: PATHAO_BASE_URL || "https://api-hermes.pathao.com",
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
