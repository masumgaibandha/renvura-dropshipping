import { getPathaoConfig, isPathaoConfigured, isPathaoCredentialsConfigured } from "../config";
import type { CourierProvider, CreateShipmentResult, NormalizedCourierStatus, ShipmentOrderInput, ShipmentStatusResult } from "../types";

/**
 * Pathao Courier Merchant API adapter.
 *
 * OFFICIALLY VERIFIED (read directly from screenshots of the Merchant Panel → Developer API
 * documentation, not a third-party source) as of this pass: Issue an Access Token, Issue an
 * Access Token from Refresh Token, Get Merchant Store Info, Create a New Order (request + success
 * response), Create a New Store (request + success response), Get List of Cities, Get zones
 * inside a particular city, Get areas inside a particular zone, Get Order Short Info, Price
 * Calculation API. Every one of those sections below is implemented to match the documented
 * contract exactly — see the comment above each one for the specific fields confirmed.
 * Live-tested end to end against a real sandbox consignment (`DT1508266DUDEM`, created via a real
 * Create Order call): auth (password grant + refresh-token grant), store creation/lookup,
 * create-order, Get Order Short Info, and Price Calculation have all been exercised against
 * Pathao's real sandbox, not just read from docs.
 *
 * `createStore()` has been called once (the sandbox "Renvura Sandbox Store", `store_id: 150696`,
 * now referenced via `PATHAO_STORE_ID`). Any *future* store creation remains blocked on the same
 * reasoning as before if attempted for a different location: `city_id`/`zone_id`/`area_id` must be
 * resolved via the verified Cities/Zones/Areas lookups first, never guessed.
 *
 * ⚠️ STILL UNVERIFIED — no official documentation content has been supplied for this yet, so it
 * is not implemented: Webhook Integration.
 *
 * Status normalization (`mapStatus()`) is deliberately minimal — only `"Pending"` → `pending` is
 * mapped, since that's the only value ever actually observed (both from Create Order's own
 * response and from a live Get Order Short Info call against the same consignment). No large
 * speculative status table is maintained; every other raw value normalizes to `unknown` until
 * observed with real evidence. `getPathaoOrderInfo()`/`getShipmentStatus()` always preserve the
 * raw `order_status_slug` string alongside the normalized value, so nothing is lost even when the
 * mapping can't yet classify it.
 *
 * `isPathaoConfigured()` gates every network call and requires BOTH real credentials AND the
 * explicit `COURIER_PATHAO_ENABLED=true` flag (default `false`). `PATHAO_ENV` (default `sandbox`)
 * selects the confirmed sandbox/production base URL — see CLAUDE.md's Phase 13 section.
 */

const TOKEN_SAFETY_MARGIN_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

/** Officially confirmed: 48 = Normal Delivery, 12 = On Demand Delivery. Renvura's standard ecommerce shipments use Normal Delivery. */
const DELIVERY_TYPE_NORMAL = 48;
/** Officially confirmed: 1 = Document, 2 = Parcel. Every Renvura order is a physical product. */
const ITEM_TYPE_PARCEL = 2;
/**
 * Officially confirmed: `item_weight` is in KG, minimum 0.5, maximum 10. Exported so
 * `src/services/courier.ts`'s read-only shipment-readiness check (Phase 15) reuses this exact
 * pair rather than a second hardcoded copy — one source of truth for the >10kg rule.
 */
export const MIN_ITEM_WEIGHT_KG = 0.5;
export const MAX_ITEM_WEIGHT_KG = 10;

interface CachedToken {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

// Process-local cache — acceptable for a single Next.js server instance; a token refresh on cold
// start is cheap and this avoids requesting a new token on every shipment call (see CLAUDE.md's
// "Pathao auth" note: don't request a new token for every shipment if not necessary). Never
// persisted to MongoDB or client storage — server-memory only, cleared on process restart.
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

interface TokenGrantSuccess {
  ok: true;
  token: CachedToken;
  tokenType: string | null;
  expiresIn: number | null;
}
type TokenGrantResult = TokenGrantSuccess | { ok: false; error: string };

/** Shared response parsing for both grant types — same success shape either way. */
function parseTokenResponse(body: { token_type?: string; expires_in?: number; access_token?: string; refresh_token?: string }): TokenGrantResult {
  if (!body.access_token) return { ok: false, error: "Pathao auth failed: no access_token in response" };
  return {
    ok: true,
    token: { accessToken: body.access_token, refreshToken: body.refresh_token ?? null, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 },
    tokenType: body.token_type ?? null,
    expiresIn: body.expires_in ?? null,
  };
}

/**
 * OFFICIALLY VERIFIED: `POST /aladdin/api/v1/issue-token`, `Content-Type: application/json`,
 * body `{client_id, client_secret, grant_type: "password", username, password}`. Success (HTTP
 * 200) returns `{token_type: "Bearer", expires_in, access_token, refresh_token}` — `expires_in`
 * is used verbatim, never a guessed lifetime. Neither token is ever logged.
 */
async function requestTokenViaPassword(): Promise<TokenGrantResult> {
  const config = getPathaoConfig();
  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: "password", username: config.username, password: config.password }),
    });
    if (!response.ok) return { ok: false, error: sanitizeError(`Pathao auth failed: HTTP ${response.status}`) };
    return parseTokenResponse(await response.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: sanitizeError(`Pathao auth request failed: ${message}`) };
  }
}

/**
 * OFFICIALLY VERIFIED: same endpoint (`POST /aladdin/api/v1/issue-token`), but
 * `grant_type: "refresh_token"` with `{client_id, client_secret, grant_type, refresh_token}` —
 * deliberately never includes `username`/`password` in this request, per the documented refresh
 * contract. Same success response shape as the password grant. Pathao returns a **new**
 * `refresh_token` on every successful refresh — the caller is responsible for replacing both
 * cached values, never reusing the old refresh token after a successful rotation.
 */
async function requestTokenViaRefresh(refreshToken: string): Promise<TokenGrantResult> {
  const config = getPathaoConfig();
  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: "refresh_token", refresh_token: refreshToken }),
    });
    if (!response.ok) return { ok: false, error: sanitizeError(`Pathao token refresh failed: HTTP ${response.status}`) };
    return parseTokenResponse(await response.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: sanitizeError(`Pathao token refresh request failed: ${message}`) };
  }
}

/**
 * Auth cache strategy (Phase 13 hardening pass): (A) a still-valid cached access token is reused
 * as-is — never re-authenticate on every request. (B) once within `TOKEN_SAFETY_MARGIN_MS` of
 * expiry (or already expired) and a cached refresh token exists, try the verified refresh-token
 * flow first — cheaper and doesn't require re-sending the password. (C) if refresh fails for any
 * reason (revoked, network error, etc.), fall back to the password grant — the existing cached
 * token is *not* deleted before this fallback succeeds, so a transient refresh failure can't turn
 * into a hard outage if the password grant still works. (D) if both fail but the previously cached
 * token hasn't *actually* expired yet (only crossed the safety margin), it's served as a
 * last-resort rather than failing a request that could otherwise succeed. Tokens are never
 * persisted outside this process-local variable.
 */
async function getAccessToken(): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - TOKEN_SAFETY_MARGIN_MS > now) {
    return { ok: true, token: cachedToken.accessToken };
  }

  if (cachedToken?.refreshToken) {
    const refreshed = await requestTokenViaRefresh(cachedToken.refreshToken);
    if (refreshed.ok) {
      cachedToken = refreshed.token;
      return { ok: true, token: cachedToken.accessToken };
    }
    // Refresh failed — fall through to the password grant below. The stale cachedToken is left
    // in place (not cleared) until/unless a fallback grant actually succeeds and replaces it.
  }

  const passwordResult = await requestTokenViaPassword();
  if (passwordResult.ok) {
    cachedToken = passwordResult.token;
    return { ok: true, token: cachedToken.accessToken };
  }

  if (cachedToken && cachedToken.expiresAt > now) {
    return { ok: true, token: cachedToken.accessToken };
  }
  return { ok: false, error: passwordResult.error };
}

/** Sanitized diagnostic result for `checkPathaoAuth()` — never the actual token values, only presence/metadata. */
export type PathaoAuthCheckResult =
  | { ok: true; tokenType: string | null; expiresIn: number | null; hasAccessToken: boolean; hasRefreshToken: boolean }
  | { ok: false; error: string };

/** One-shot diagnostic that calls the real password-grant token endpoint and reports only sanitized metadata — used for admin/manual verification, never returns or logs a token value. Replaces the process cache on success, same as `getAccessToken()`. */
export async function checkPathaoAuth(): Promise<PathaoAuthCheckResult> {
  if (!isPathaoCredentialsConfigured()) return { ok: false, error: "Pathao credentials are not configured." };
  const result = await requestTokenViaPassword();
  if (!result.ok) return result;
  cachedToken = result.token;
  return {
    ok: true,
    tokenType: result.tokenType,
    expiresIn: result.expiresIn,
    hasAccessToken: true,
    hasRefreshToken: cachedToken.refreshToken !== null,
  };
}

/** Sanitized diagnostic result for `checkPathaoTokenRefresh()` — never the actual token values. */
export type PathaoRefreshCheckResult =
  | { ok: true; tokenType: string | null; expiresIn: number | null; hasNewAccessToken: boolean; hasNewRefreshToken: boolean; accessTokenRotated: boolean; refreshTokenRotated: boolean }
  | { ok: false; error: string };

/**
 * One-shot diagnostic that explicitly exercises the refresh-token grant (not the password grant)
 * using whatever refresh token is currently cached (populated by a prior `checkPathaoAuth()`/
 * `getAccessToken()` call) — used for admin/manual verification. Never returns or logs a token
 * value; only reports whether the access/refresh tokens actually changed. Replaces the process
 * cache on success.
 */
export async function checkPathaoTokenRefresh(): Promise<PathaoRefreshCheckResult> {
  if (!isPathaoCredentialsConfigured()) return { ok: false, error: "Pathao credentials are not configured." };
  const before = cachedToken;
  if (!before?.refreshToken) {
    return { ok: false, error: "No cached refresh token available — call checkPathaoAuth() first to populate one." };
  }
  const result = await requestTokenViaRefresh(before.refreshToken);
  if (!result.ok) return result;
  cachedToken = result.token;
  return {
    ok: true,
    tokenType: result.tokenType,
    expiresIn: result.expiresIn,
    hasNewAccessToken: true,
    hasNewRefreshToken: cachedToken.refreshToken !== null,
    accessTokenRotated: cachedToken.accessToken !== before.accessToken,
    refreshTokenRotated: cachedToken.refreshToken !== before.refreshToken,
  };
}

interface PathaoStoreRow {
  storeId: number;
  storeName: string;
  isActive: boolean;
  isDefaultStore: boolean;
  isDefaultReturnStore: boolean;
  cityId: number;
  zoneId: number;
}

type ListStoresResult = { ok: true; stores: PathaoStoreRow[] } | { ok: false; error: string };

/**
 * OFFICIALLY VERIFIED: `GET /aladdin/api/v1/stores`, `Authorization: Bearer {access_token}`, no
 * body. Success response is `{message, type, code, data: {data: [{store_id, store_name,
 * store_address, is_active, city_id, zone_id, hub_id, is_default_store, is_default_return_store}],
 * ...pagination}}` — note the double-nested `data.data` array, distinct from Create Order's
 * single-nested `data` object.
 */
async function listStores(): Promise<ListStoresResult> {
  const auth = await getAccessToken();
  if (!auth.ok) return { ok: false, error: auth.error };
  const config = getPathaoConfig();
  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/stores`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
    });
    if (!response.ok) return { ok: false, error: sanitizeError(`Pathao store list failed: HTTP ${response.status}`) };
    const body = (await response.json()) as {
      data?: {
        // Confirmed live: Pathao returns these as 0/1 (numbers), not JSON true/false — coerced
        // with Boolean() below rather than trusted as already-boolean, so `PathaoStoreRow`'s
        // declared `boolean` type is actually true at runtime, not just at the type level.
        data?: {
          store_id: number;
          store_name: string;
          is_active: number | boolean;
          is_default_store: number | boolean;
          is_default_return_store: number | boolean;
          city_id: number;
          zone_id: number;
        }[];
      };
    };
    const rows = body.data?.data ?? [];
    return {
      ok: true,
      stores: rows.map((row) => ({
        storeId: row.store_id,
        storeName: row.store_name,
        isActive: Boolean(row.is_active),
        isDefaultStore: Boolean(row.is_default_store),
        isDefaultReturnStore: Boolean(row.is_default_return_store),
        cityId: row.city_id,
        zoneId: row.zone_id,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: sanitizeError(`Pathao store list request failed: ${message}`) };
  }
}

/** Diagnostic wrapper around `listStores()` for admin/manual verification — same sanitized shape, safe to log/display (store names/ids are not secrets, but nothing else from the response is surfaced). */
export async function checkPathaoStores(): Promise<ListStoresResult> {
  if (!isPathaoCredentialsConfigured()) return { ok: false, error: "Pathao credentials are not configured." };
  return listStores();
}

export interface PathaoCity {
  cityId: number;
  cityName: string;
}

export interface PathaoZone {
  zoneId: number;
  zoneName: string;
}

export interface PathaoArea {
  areaId: number;
  areaName: string;
  homeDeliveryAvailable: boolean;
  pickupAvailable: boolean;
}

type PathaoLookupResult<T> = { ok: true; items: T[] } | { ok: false; error: string };

/**
 * OFFICIALLY VERIFIED: `GET /aladdin/api/v1/city-list`, `Authorization: Bearer {access_token}`,
 * no body. Response `{data: {data: [{city_id, city_name}]}}` — double-nested like Store Info.
 */
export async function getPathaoCities(): Promise<PathaoLookupResult<PathaoCity>> {
  if (!isPathaoCredentialsConfigured()) return { ok: false, error: "Pathao credentials are not configured." };
  const auth = await getAccessToken();
  if (!auth.ok) return { ok: false, error: auth.error };
  const config = getPathaoConfig();
  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/city-list`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
    });
    if (!response.ok) return { ok: false, error: sanitizeError(`Pathao city list failed: HTTP ${response.status}`) };
    const body = (await response.json()) as { data?: { data?: { city_id: number; city_name: string }[] } };
    const rows = body.data?.data ?? [];
    return { ok: true, items: rows.map((row) => ({ cityId: row.city_id, cityName: row.city_name })) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: sanitizeError(`Pathao city list request failed: ${message}`) };
  }
}

/**
 * OFFICIALLY VERIFIED: `GET /aladdin/api/v1/cities/{city_id}/zone-list`, same headers/auth as
 * cities. Response `{data: {data: [{zone_id, zone_name}]}}`.
 */
export async function getPathaoZones(cityId: number): Promise<PathaoLookupResult<PathaoZone>> {
  if (!Number.isInteger(cityId) || cityId <= 0) return { ok: false, error: "cityId must be a positive integer." };
  if (!isPathaoCredentialsConfigured()) return { ok: false, error: "Pathao credentials are not configured." };
  const auth = await getAccessToken();
  if (!auth.ok) return { ok: false, error: auth.error };
  const config = getPathaoConfig();
  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/cities/${cityId}/zone-list`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
    });
    if (!response.ok) return { ok: false, error: sanitizeError(`Pathao zone list failed: HTTP ${response.status}`) };
    const body = (await response.json()) as { data?: { data?: { zone_id: number; zone_name: string }[] } };
    const rows = body.data?.data ?? [];
    return { ok: true, items: rows.map((row) => ({ zoneId: row.zone_id, zoneName: row.zone_name })) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: sanitizeError(`Pathao zone list request failed: ${message}`) };
  }
}

/**
 * OFFICIALLY VERIFIED: `GET /aladdin/api/v1/zones/{zone_id}/area-list`, same headers/auth.
 * Response `{data: {data: [{area_id, area_name, home_delivery_available, pickup_available}]}}`.
 */
export async function getPathaoAreas(zoneId: number): Promise<PathaoLookupResult<PathaoArea>> {
  if (!Number.isInteger(zoneId) || zoneId <= 0) return { ok: false, error: "zoneId must be a positive integer." };
  if (!isPathaoCredentialsConfigured()) return { ok: false, error: "Pathao credentials are not configured." };
  const auth = await getAccessToken();
  if (!auth.ok) return { ok: false, error: auth.error };
  const config = getPathaoConfig();
  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/zones/${zoneId}/area-list`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
    });
    if (!response.ok) return { ok: false, error: sanitizeError(`Pathao area list failed: HTTP ${response.status}`) };
    const body = (await response.json()) as {
      // Same 0/1-vs-boolean caveat as the store list above — coerced with Boolean() rather than trusted.
      data?: { data?: { area_id: number; area_name: string; home_delivery_available: number | boolean; pickup_available: number | boolean }[] };
    };
    const rows = body.data?.data ?? [];
    return {
      ok: true,
      items: rows.map((row) => ({
        areaId: row.area_id,
        areaName: row.area_name,
        homeDeliveryAvailable: Boolean(row.home_delivery_available),
        pickupAvailable: Boolean(row.pickup_available),
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: sanitizeError(`Pathao area list request failed: ${message}`) };
  }
}

export interface PathaoOrderInfo {
  consignmentId: string;
  merchantOrderId?: string;
  orderStatus?: string;
  orderStatusSlug: string;
  updatedAt?: string;
  invoiceId?: string | null;
}

type PathaoOrderInfoResult = { ok: true; info: PathaoOrderInfo } | { ok: false; error: string };

/**
 * OFFICIALLY VERIFIED: `GET /aladdin/api/v1/orders/{consignment_id}/info`, `Authorization: Bearer
 * {access_token}`, no body. Response `{data: {consignment_id, merchant_order_id, order_status,
 * order_status_slug, updated_at, invoice_id}}` — single-nested (like Create Order, unlike the
 * double-nested Stores/Cities/Zones/Areas list endpoints). Only `consignment_id` and
 * `order_status_slug` are documented as required; everything else is read defensively and stays
 * optional, matching the official contract rather than assuming fields that aren't guaranteed.
 */
export async function getPathaoOrderInfo(consignmentId: string): Promise<PathaoOrderInfoResult> {
  const trimmed = consignmentId.trim();
  if (!trimmed) return { ok: false, error: "consignmentId must be a non-empty string." };
  if (!isPathaoCredentialsConfigured()) return { ok: false, error: "Pathao credentials are not configured." };

  const auth = await getAccessToken();
  if (!auth.ok) return { ok: false, error: auth.error };

  const config = getPathaoConfig();
  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/orders/${encodeURIComponent(trimmed)}/info`, {
      method: "GET",
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!response.ok) return { ok: false, error: sanitizeError(`Pathao order info lookup failed: HTTP ${response.status}`) };

    const body = (await response.json()) as {
      data?: {
        consignment_id?: string;
        merchant_order_id?: string;
        order_status?: string;
        order_status_slug?: string;
        updated_at?: string;
        invoice_id?: string | null;
      };
    };
    const data = body.data;
    if (!data?.consignment_id || !data.order_status_slug) {
      return { ok: false, error: "Pathao order info lookup succeeded but response was missing required fields (consignment_id/order_status_slug)." };
    }
    return {
      ok: true,
      info: {
        consignmentId: data.consignment_id,
        merchantOrderId: data.merchant_order_id,
        orderStatus: data.order_status,
        orderStatusSlug: data.order_status_slug,
        updatedAt: data.updated_at,
        invoiceId: data.invoice_id,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: sanitizeError(`Pathao order info request failed: ${message}`) };
  }
}

export interface CalculatePathaoPriceInput {
  storeId: number;
  itemType: 1 | 2;
  deliveryType: 12 | 48;
  itemWeightKg: number;
  recipientCityId: number;
  recipientZoneId: number;
}

export interface PathaoPriceResult {
  price: number;
  discount: number;
  promoDiscount: number;
  planId: number;
  /** Coerced with `Boolean(...)` — see `PathaoStoreRow`'s identical 0/1-vs-boolean note. Optional since the official response table doesn't list it as a guaranteed field (only the example shows it). */
  codEnabled?: boolean;
  codPercentage: number;
  additionalCharge: number;
  finalPrice: number;
}

type CalculatePathaoPriceResult = { ok: true; price: PathaoPriceResult } | { ok: false; error: string };

function validateCalculatePriceInput(input: CalculatePathaoPriceInput): string | null {
  if (!Number.isInteger(input.storeId) || input.storeId <= 0) return "storeId must be a positive integer.";
  if (input.itemType !== 1 && input.itemType !== 2) return "itemType must be 1 (Document) or 2 (Parcel).";
  if (input.deliveryType !== 12 && input.deliveryType !== 48) return "deliveryType must be 12 (On Demand) or 48 (Normal).";
  if (!Number.isFinite(input.itemWeightKg) || input.itemWeightKg < MIN_ITEM_WEIGHT_KG || input.itemWeightKg > MAX_ITEM_WEIGHT_KG) {
    return `itemWeightKg must be between ${MIN_ITEM_WEIGHT_KG} and ${MAX_ITEM_WEIGHT_KG}.`;
  }
  if (!Number.isInteger(input.recipientCityId) || input.recipientCityId <= 0) return "recipientCityId must be a positive integer.";
  if (!Number.isInteger(input.recipientZoneId) || input.recipientZoneId <= 0) return "recipientZoneId must be a positive integer.";
  return null;
}

/**
 * OFFICIALLY VERIFIED: `POST /aladdin/api/v1/merchant/price-plan`, `Content-Type: application/json;
 * charset=UTF-8`, `Authorization: Bearer {access_token}`. Unlike Create Order,
 * `recipient_city`/`recipient_zone` are REQUIRED here (no address-based auto-resolution) —
 * `recipient_area` is not part of this request at all. Response is single-nested
 * `{data: {price, discount, promo_discount, plan_id, cod_enabled, cod_percentage,
 * additional_charge, final_price}}`. Provider/operations data only — never wired into Renvura
 * checkout pricing, product pricing, or any business-state mutation (see CLAUDE.md's "Renvura
 * integration boundary" note for this phase).
 */
export async function calculatePathaoPrice(input: CalculatePathaoPriceInput): Promise<CalculatePathaoPriceResult> {
  const validationError = validateCalculatePriceInput(input);
  if (validationError) return { ok: false, error: validationError };
  if (!isPathaoCredentialsConfigured()) return { ok: false, error: "Pathao credentials are not configured." };

  const auth = await getAccessToken();
  if (!auth.ok) return { ok: false, error: auth.error };

  const config = getPathaoConfig();
  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/merchant/price-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({
        store_id: input.storeId,
        item_type: input.itemType,
        delivery_type: input.deliveryType,
        item_weight: input.itemWeightKg,
        recipient_city: input.recipientCityId,
        recipient_zone: input.recipientZoneId,
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
      return { ok: false, error: sanitizeError(`Pathao price calculation failed: ${detail}`) };
    }

    const body = (await response.json()) as {
      data?: {
        price?: number;
        discount?: number;
        promo_discount?: number;
        plan_id?: number;
        cod_enabled?: number | boolean;
        cod_percentage?: number;
        additional_charge?: number;
        final_price?: number;
      };
    };
    const data = body.data;
    if (
      data?.price === undefined ||
      data.discount === undefined ||
      data.promo_discount === undefined ||
      data.plan_id === undefined ||
      data.cod_percentage === undefined ||
      data.additional_charge === undefined ||
      data.final_price === undefined
    ) {
      return { ok: false, error: "Pathao price calculation succeeded but response was missing required fields." };
    }
    return {
      ok: true,
      price: {
        price: data.price,
        discount: data.discount,
        promoDiscount: data.promo_discount,
        planId: data.plan_id,
        codEnabled: data.cod_enabled === undefined ? undefined : Boolean(data.cod_enabled),
        codPercentage: data.cod_percentage,
        additionalCharge: data.additional_charge,
        finalPrice: data.final_price,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: sanitizeError(`Pathao price calculation request failed: ${message}`) };
  }
}

export interface CreatePathaoStoreInput {
  /** 3–50 characters. */
  name: string;
  /** 3–50 characters. */
  contactName: string;
  /** Exactly 11 characters — same normalized-phone format as `ShipmentOrderInput.recipientPhone`. */
  contactNumber: string;
  /** Exactly 11 characters if supplied. */
  secondaryContact?: string;
  /** OTPs for orders from this store are sent to this number, per the official docs. */
  otpNumber?: string;
  /** 15–120 characters. */
  address: string;
  cityId: number;
  zoneId: number;
  areaId: number;
}

export type CreatePathaoStoreResult = { ok: true; storeName: string } | { ok: false; error: string };

/**
 * OFFICIALLY VERIFIED: `POST /aladdin/api/v1/stores`, `Authorization: Bearer {access_token}`,
 * body `{name, contact_name, contact_number, secondary_contact, otp_number, address, city_id,
 * zone_id, area_id}`. Success (HTTP 200) returns `{message, type, code, data: {store_name}}` —
 * **no `store_id`** — the docs' own confirmed sandbox workflow is to call `listStores()` again
 * afterward (once approved) and read the id from there, which is exactly what `resolveStoreId()`
 * already does when `PATHAO_STORE_ID` isn't set. Not exposed through the generic
 * `CourierProvider` interface — this is a one-time Pathao-specific setup operation, never part of
 * the per-order shipment flow. Never called automatically; a human decides when to run this.
 */
export async function createPathaoStore(input: CreatePathaoStoreInput): Promise<CreatePathaoStoreResult> {
  if (!isPathaoCredentialsConfigured()) return { ok: false, error: "Pathao credentials are not configured." };
  const auth = await getAccessToken();
  if (!auth.ok) return { ok: false, error: auth.error };

  const config = getPathaoConfig();
  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/stores`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({
        name: input.name,
        contact_name: input.contactName,
        contact_number: input.contactNumber,
        ...(input.secondaryContact ? { secondary_contact: input.secondaryContact } : {}),
        ...(input.otpNumber ? { otp_number: input.otpNumber } : {}),
        address: input.address,
        city_id: input.cityId,
        zone_id: input.zoneId,
        area_id: input.areaId,
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
      return { ok: false, error: sanitizeError(`Pathao store creation failed: ${detail}`) };
    }

    const body = (await response.json()) as { data?: { store_name?: string } };
    return { ok: true, storeName: body.data?.store_name ?? input.name };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: sanitizeError(`Pathao store creation request failed: ${message}`) };
  }
}

/**
 * Resolves the `store_id` to send on Create Order. `PATHAO_STORE_ID`, if set, is used verbatim as
 * an explicit override — no API call needed. Otherwise, calls the officially verified Store Info
 * endpoint and picks the single unambiguous active/default store. Never guesses: if zero or more
 * than one candidate exists, this fails with a precise message rather than picking arbitrarily.
 */
async function resolveStoreId(): Promise<{ ok: true; storeId: string } | { ok: false; error: string }> {
  const config = getPathaoConfig();
  if (config.storeId) return { ok: true, storeId: config.storeId };

  const result = await listStores();
  if (!result.ok) return result;

  const active = result.stores.filter((store) => store.isActive);
  const candidate = active.find((store) => store.isDefaultStore) ?? (active.length === 1 ? active[0] : null);
  if (!candidate) {
    return {
      ok: false,
      error:
        active.length === 0
          ? "No active Pathao store found for this account — create/activate one in the Pathao merchant dashboard first."
          : "Multiple active Pathao stores exist with no default — set PATHAO_STORE_ID explicitly to disambiguate.",
    };
  }
  return { ok: true, storeId: String(candidate.storeId) };
}

/**
 * Deliberately minimal — maps only status values actually observed against real Pathao responses
 * (Create Order's own response and a live Get Order Short Info call both returned `"Pending"` for
 * the same sandbox consignment). No speculative status vocabulary is maintained; every other raw
 * value normalizes to `unknown` until it's been observed with real evidence, per this project's
 * "do not guess" rule for anything not yet verified. Matched against `order_status_slug`
 * specifically (the documented "current status of the order" field), not the more presentational
 * `order_status`.
 */
function mapStatus(rawStatusSlug: string): NormalizedCourierStatus {
  const normalized = rawStatusSlug.toLowerCase().replace(/\s+/g, "_");
  const table: Record<string, NormalizedCourierStatus> = {
    pending: "pending", // confirmed — observed from both Create Order's response and a live Get Order Short Info call
  };
  return table[normalized] ?? "unknown";
}

export function createPathaoProvider(): CourierProvider {
  return {
    id: "pathao",
    apiCapable: true,
    isConfigured: isPathaoConfigured,

    /**
     * OFFICIALLY VERIFIED: `POST /aladdin/api/v1/orders`, `Authorization: Bearer {access_token}`.
     * `recipient_city`/`recipient_zone`/`recipient_area` are OPTIONAL — Pathao resolves them from
     * `recipient_address` when omitted, so a missing `CourierLocationMapping` entry is no longer a
     * hard block (Phase 13 correction: the fields are included only when verified IDs exist, and
     * omitted entirely otherwise — never sent as `null`/`0`/a guess). `item_quantity` is set to `1`
     * (one Renvura order = one physical parcel) — the docs label this "quantity of parcels," which
     * is ambiguous against multi-unit orders; this is a judgment call pending confirmation via
     * Pathao support or a real test order, not a verified fact.
     *
     * Weight model (Phase 14 correction): `order.totalWeightGrams` is always the real,
     * unmodified sum of each line item's stored product weight × quantity — this function never
     * rewrites a product's actual weight to satisfy Pathao's minimum. Pathao's own documented
     * `item_weight` constraint (0.5–10 kg) is instead applied only to the outgoing *request* value:
     * a real parcel under 0.5kg is floored to 0.5kg for this API call only (Pathao has no smaller
     * unit — this is an operational courier-request adjustment, not a claim that the parcel
     * actually weighs 500g); a real parcel over 10kg is a genuine operational blocker (no verified
     * Pathao mechanism splits or accepts an overweight single consignment) and fails with a precise
     * message rather than being silently clamped down, which would misrepresent the parcel to the
     * courier.
     */
    async createShipment(order: ShipmentOrderInput): Promise<CreateShipmentResult> {
      if (!isPathaoConfigured()) return { status: "not_configured" };
      if (order.totalWeightGrams === null) {
        return { status: "failed", error: "One or more items are missing a shipping weight." };
      }

      const weightKg = order.totalWeightGrams / 1000;
      if (weightKg > MAX_ITEM_WEIGHT_KG) {
        return {
          status: "failed",
          error: `Order weight ${weightKg.toFixed(2)}kg exceeds Pathao's maximum supported parcel weight (${MAX_ITEM_WEIGHT_KG}kg). This order cannot be shipped as a single Pathao consignment.`,
        };
      }
      // Real parcels lighter than Pathao's documented minimum are floored only for the request —
      // see the doc comment above. order.totalWeightGrams itself is never touched.
      const requestWeightKg = Math.max(weightKg, MIN_ITEM_WEIGHT_KG);

      const storeResult = await resolveStoreId();
      if (!storeResult.ok) return { status: "failed", error: storeResult.error };

      const auth = await getAccessToken();
      if (!auth.ok) return { status: "failed", error: auth.error };

      const config = getPathaoConfig();
      const itemDescription = order.items.map((item) => `${item.title} x${item.quantity}`).join(", ").slice(0, 200);

      const payload: Record<string, unknown> = {
        store_id: Number(storeResult.storeId),
        merchant_order_id: order.orderNumber,
        recipient_name: order.recipientName,
        recipient_phone: order.recipientPhone,
        recipient_address: [order.address.addressLine, order.address.landmark].filter(Boolean).join(", "),
        delivery_type: DELIVERY_TYPE_NORMAL,
        item_type: ITEM_TYPE_PARCEL,
        item_quantity: 1,
        item_weight: Number(requestWeightKg.toFixed(2)),
        item_description: itemDescription,
        amount_to_collect: order.codAmountBdt,
      };
      // Optional per the official docs — omitted entirely (never null/0/guessed) when no verified mapping exists.
      if (order.pathaoLocation) {
        payload.recipient_city = Number(order.pathaoLocation.cityId);
        payload.recipient_zone = Number(order.pathaoLocation.zoneId);
        payload.recipient_area = Number(order.pathaoLocation.areaId);
      }

      try {
        const response = await fetchWithTimeout(`${config.baseUrl}/aladdin/api/v1/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify(payload),
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

        // OFFICIALLY VERIFIED success shape: {message, type, code, data: {consignment_id, merchant_order_id, order_status, delivery_fee}}.
        const body = (await response.json()) as { data?: { consignment_id?: string; merchant_order_id?: string; order_status?: string; delivery_fee?: number } };
        const consignmentId = body.data?.consignment_id;
        if (!consignmentId) {
          return { status: "failed", error: "Pathao create-order succeeded but returned no consignment_id — reconcile manually before retrying." };
        }
        return {
          status: "created",
          consignmentId,
          trackingId: consignmentId,
          trackingUrl: null,
          externalOrderId: body.data?.merchant_order_id ?? order.orderNumber,
          rawProviderStatus: body.data?.order_status,
          courierDeliveryFeeBdt: body.data?.delivery_fee,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { status: "failed", error: sanitizeError(`Pathao create-order request failed: ${message}`) };
      }
    },

    // Wired to the officially verified Get Order Short Info endpoint (`getPathaoOrderInfo()`
    // above). Matches on `order_status_slug` (the documented "current status of the order"
    // field), not the more presentational `order_status`. Read-only — never mutates
    // `orderStatus`/inventory/payment; the caller (`src/services/courier.ts`'s
    // `refreshShipmentStatus`) only ever persists `courier.normalizedStatus`/`rawStatusCode`/
    // `lastSyncedAt`, matching Phase 13's deliberate separation of courier status sync from
    // Renvura's own order lifecycle.
    async getShipmentStatus(consignmentId: string): Promise<ShipmentStatusResult> {
      if (!isPathaoConfigured()) return { status: "not_configured" };
      const result = await getPathaoOrderInfo(consignmentId);
      if (!result.ok) return { status: "failed", error: result.error };
      return { status: "ok", normalizedStatus: mapStatus(result.info.orderStatusSlug), rawStatusCode: result.info.orderStatusSlug };
    },

    // No tracking-URL section has been verified yet — never fabricate one.
    getTrackingUrl: () => null,
  };
}
