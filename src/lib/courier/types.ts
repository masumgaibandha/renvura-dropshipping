/**
 * Provider-neutral courier types (Phase 13). See CLAUDE.md's "Courier / fulfillment integration
 * (Phase 13)" section for the full architecture writeup — this file only defines shapes.
 */

/**
 * Controlled provider identifier — replaces the old free-text `courier.provider` string for new
 * orders. `pathao`/`steadfast` are the two providers this phase built adapters for (see
 * `providers/pathao.ts`/`providers/steadfast.ts`); `redx`/`paperfly` are recognized labels only
 * (no adapter — always manual mode, never API-enabled, see `registry.ts`) so staff can still pick
 * an accurate label without the codebase pretending to integrate with them; `other` is the
 * catch-all for anything else. `null` marks a legacy order created before this field existed.
 */
export type CourierProviderId = "pathao" | "steadfast" | "redx" | "paperfly" | "other";

export type CourierMode = "api" | "manual";

export type CourierCreationStatus = "not_created" | "creating" | "created" | "failed";

/**
 * Provider-neutral shipment status — every adapter's `getShipmentStatus()` maps its own raw
 * provider status string into this enum (see each provider's `mapStatus()`). Never expose a raw
 * provider status code to a customer; only this normalized value (via `NORMALIZED_STATUS_LABELS`).
 */
export type NormalizedCourierStatus =
  | "unknown"
  | "pending"
  | "pickup_requested"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "returned"
  | "cancelled";

export const NORMALIZED_STATUS_LABELS: Record<NormalizedCourierStatus, string> = {
  unknown: "Unknown",
  pending: "Pending",
  pickup_requested: "Pickup Requested",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  delivery_failed: "Delivery Attempt Failed",
  returned: "Returned",
  cancelled: "Cancelled",
};

export const COURIER_PROVIDER_LABELS: Record<CourierProviderId, string> = {
  pathao: "Pathao",
  steadfast: "Steadfast",
  redx: "RedX",
  paperfly: "Paperfly",
  other: "Other / Manual",
};

/** Authoritative, server-only order data a provider adapter needs to create a shipment — never client-submitted, always re-read from the DB by the caller. Never includes `wholesalePrice`, admin notes, or customer email. */
export interface ShipmentOrderInput {
  orderNumber: string;
  recipientName: string;
  /** Normalized `01XXXXXXXXX` form — see `src/utils/phone.ts`. Provider-specific reformatting happens inside each adapter, never at the call site. */
  recipientPhone: string;
  address: {
    division: string;
    district: string;
    upazila: string;
    addressLine: string;
    landmark: string | null;
  };
  /** Amount to collect on delivery — 0 for an already-paid order (see CLAUDE.md's "COD amount" note). */
  codAmountBdt: number;
  items: { title: string; quantity: number }[];
  /** Sum of `Product.shippingWeightGrams` across all items — `null` if any item is missing a weight, which callers must treat as a hard block on API creation (see CLAUDE.md's "Weight" note). Never a fabricated default. */
  totalWeightGrams: number | null;
  /**
   * Pathao-only: pre-resolved city/zone/area IDs from `CourierLocationMapping`, looked up by the
   * service layer (`src/services/courier.ts`) before ever calling `createShipment` — never
   * resolved by guessing inside the adapter. `null` when no verified mapping exists for this
   * address, which the service layer treats as a hard block for Pathao specifically (see
   * CLAUDE.md's "Pathao location mapping" note); ignored entirely by every other provider.
   */
  pathaoLocation: { cityId: string; zoneId: string; areaId: string } | null;
}

export type CreateShipmentResult =
  | {
      status: "created";
      consignmentId: string;
      trackingId: string;
      trackingUrl: string | null;
      externalOrderId: string | null;
      /** Provider's own raw status string for the just-created consignment, if it returned one (e.g. Pathao's `order_status: "Pending"`) — diagnostic only, never persisted as Renvura order state. Optional since not every provider's response includes one. */
      rawProviderStatus?: string;
      /** Provider's own reported courier operational delivery fee, if returned (e.g. Pathao's `delivery_fee`) — diagnostic only. Never Renvura's customer-facing delivery fee; never persisted or used in checkout pricing. */
      courierDeliveryFeeBdt?: number;
    }
  | { status: "failed"; error: string }
  | { status: "not_configured" };

export type ShipmentStatusResult =
  | { status: "ok"; normalizedStatus: NormalizedCourierStatus; rawStatusCode: string | null }
  | { status: "failed"; error: string }
  | { status: "not_configured" };

export type CancelShipmentResult = { status: "cancelled" } | { status: "unsupported" } | { status: "failed"; error: string } | { status: "not_configured" };

/**
 * One adapter per courier. Every method must be safe to call speculatively (never throw) — callers
 * always branch on the returned `status` discriminant. `createShipment`/`getShipmentStatus` must
 * never mutate Renvura's `Order`/`Product` documents themselves; the caller (`src/services/courier.ts`)
 * owns all persistence, matching this codebase's existing "server module returns a result, caller
 * persists" convention (see `sendOrderConfirmationEmail`/`sendMetaCapiPurchase`).
 */
export interface CourierProvider {
  readonly id: CourierProviderId;
  /** Whether this provider has a real adapter capable of API calls at all (true for pathao/steadfast; false for redx/paperfly/manual/other, which are label-only). Distinct from `isConfigured()` — an API-capable provider can still be unconfigured. */
  readonly apiCapable: boolean;
  /** Whether real credentials are present in the environment right now. Cheap, synchronous, no network call. */
  isConfigured(): boolean;
  createShipment(order: ShipmentOrderInput): Promise<CreateShipmentResult>;
  getShipmentStatus(consignmentId: string): Promise<ShipmentStatusResult>;
  /** `null` when the provider doesn't expose a stable public tracking URL pattern — never fabricate one. */
  getTrackingUrl(consignmentId: string): string | null;
}
