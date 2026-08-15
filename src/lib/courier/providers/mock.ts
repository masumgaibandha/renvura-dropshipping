import { randomUUID } from "node:crypto";

import { isMockCourierEnabled } from "../config";
import type { CourierProvider, CreateShipmentResult, ShipmentStatusResult } from "../types";

/**
 * Development-only mock courier — lets the shipment-creation/status-refresh flow be exercised
 * end-to-end without real Pathao/Steadfast credentials (see CLAUDE.md's "Test provider" note).
 * `isConfigured()` returns `false` whenever `isMockCourierEnabled()` is false, which is *always*
 * true in production (`NODE_ENV === "production"` short-circuits it regardless of any env var) —
 * this is the one hard guarantee that this provider can never be selected/active for a real order.
 * Tracking IDs are always prefixed `TEST-` so a mock shipment can never be mistaken for a real one
 * even if a record leaked somewhere unexpected.
 */
export function createMockProvider(): CourierProvider {
  return {
    id: "other",
    apiCapable: true,
    isConfigured: isMockCourierEnabled,
    async createShipment(): Promise<CreateShipmentResult> {
      if (!isMockCourierEnabled()) return { status: "not_configured" };
      const id = `TEST-${randomUUID().slice(0, 8).toUpperCase()}`;
      return { status: "created", consignmentId: id, trackingId: id, trackingUrl: null, externalOrderId: null };
    },
    async getShipmentStatus(): Promise<ShipmentStatusResult> {
      if (!isMockCourierEnabled()) return { status: "not_configured" };
      return { status: "ok", normalizedStatus: "in_transit", rawStatusCode: "mock_in_transit" };
    },
    getTrackingUrl: () => null,
  };
}
