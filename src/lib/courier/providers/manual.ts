import type { CourierProvider, CreateShipmentResult, ShipmentStatusResult } from "../types";

/**
 * `other`/`redx`/`paperfly` all resolve to this adapter — none has a real API integration (see
 * CLAUDE.md's Phase 13 section: RedX/Paperfly are recognized labels only, never marked
 * API-enabled). `isConfigured()` is deliberately always `true` — "configured" for a manual-mode
 * provider just means "staff can select it and type in tracking info," which is always possible.
 * `createShipment`/`getShipmentStatus` should never actually be called for this provider (the
 * admin UI never shows a "Create Shipment" button for it) — they return `not_configured` as a safe
 * fallback if a caller ever does.
 */
export function createManualProvider(id: "other" | "redx" | "paperfly"): CourierProvider {
  return {
    id,
    apiCapable: false,
    isConfigured: () => true,
    async createShipment(): Promise<CreateShipmentResult> {
      return { status: "not_configured" };
    },
    async getShipmentStatus(): Promise<ShipmentStatusResult> {
      return { status: "not_configured" };
    },
    getTrackingUrl: () => null,
  };
}
