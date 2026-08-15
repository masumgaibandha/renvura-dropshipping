import { isMockCourierEnabled } from "./config";
import { createManualProvider } from "./providers/manual";
import { createMockProvider } from "./providers/mock";
import { createPathaoProvider } from "./providers/pathao";
import { createSteadfastProvider } from "./providers/steadfast";
import type { CourierProvider, CourierProviderId } from "./types";

/**
 * Single lookup point for every courier provider — admin actions and UI code call `getProvider()`
 * instead of importing a specific adapter directly, so no provider-specific logic leaks outside
 * this module (see CLAUDE.md's Phase 13 "provider architecture" note).
 */
const providers: Record<CourierProviderId, CourierProvider> = {
  pathao: createPathaoProvider(),
  steadfast: createSteadfastProvider(),
  redx: createManualProvider("redx"),
  paperfly: createManualProvider("paperfly"),
  other: createManualProvider("other"),
};

export function getProvider(id: CourierProviderId): CourierProvider {
  return providers[id];
}

/**
 * A provider is only ever offered "Create Shipment" when it's both API-capable (a real adapter
 * exists) and currently configured (real credentials present) — see CLAUDE.md's "Courier provider
 * enum" note: unsupported/unconfigured providers must never appear integrated in the UI. The mock
 * provider is a special case, deliberately never reachable through `CourierProviderId` at all — it
 * exists only for `getMockProviderForDevTesting()` below, used exclusively by local/dev testing
 * code paths, never by the real order-detail admin UI.
 */
export function isProviderApiEnabled(id: CourierProviderId): boolean {
  const provider = providers[id];
  return provider.apiCapable && provider.isConfigured();
}

/** Dev-only — never imported by admin UI or Server Actions reachable in production. See `providers/mock.ts`. */
export function getMockProviderForDevTesting(): CourierProvider | null {
  return isMockCourierEnabled() ? createMockProvider() : null;
}
