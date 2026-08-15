import { connectToDatabase } from "@/lib/db";
import { getConfiguredPathaoStoreId } from "@/lib/courier/config";
import { MAX_ITEM_WEIGHT_KG as PATHAO_MAX_ITEM_WEIGHT_KG } from "@/lib/courier/providers/pathao";
import { getPathaoProductReadiness } from "@/lib/courier/readiness";
import { getProvider, isProviderApiEnabled } from "@/lib/courier/registry";
import { COURIER_PROVIDER_LABELS } from "@/lib/courier/types";
import type { ShipmentOrderInput } from "@/lib/courier/types";
import { mapWebhookEventToNormalizedStatus, type PathaoWebhookPayload } from "@/lib/courier/webhook";
import { CourierLocationMappingModel } from "@/models/CourierLocationMapping";
import { OrderModel } from "@/models/Order";
import { recordAuditLog } from "@/services/audit-log";
import { findOrderByOrderNumber } from "@/services/orders";
import { getProductBySlug } from "@/services/products";
import { ORDER_STATUS_LABELS, type CourierProviderId, type NormalizedCourierStatus, type OrderStatus } from "@/types/order";

/**
 * Courier data-access + orchestration layer (Phase 13). Mirrors `src/services/inventory.ts`'s
 * role: the one place that turns a provider adapter's result into a persisted `Order.courier`
 * update. Never touches `orderStatus`, `Product.inventory.stock`, or `payment.status` — those
 * effects stay entirely inside the existing Phase 12 lifecycle (`src/actions/admin/orders.ts`),
 * per CLAUDE.md's "COD payment safety"/"Inventory safety" notes for this phase.
 */

type OrderRecord = NonNullable<Awaited<ReturnType<typeof findOrderByOrderNumber>>>;

/** Shipment creation is only offered at `confirmed`/`processing`/`supplier_submitted` — never before an order is confirmed genuine, never after it's already marked `shipped` (see CLAUDE.md's "Shipment creation eligibility" note: creating a consignment is not the same fact as the order having physically shipped). */
const SHIPMENT_ELIGIBLE_STATUSES: OrderStatus[] = ["confirmed", "processing", "supplier_submitted"];

export function isOrderEligibleForShipmentCreation(orderStatus: OrderStatus): boolean {
  return SHIPMENT_ELIGIBLE_STATUSES.includes(orderStatus);
}

/** Best-effort precision lookup, not a shipment-creation precondition (see the Phase 13 correction above) — `null` just means Pathao resolves the address itself. */
async function resolvePathaoLocation(address: { division: string; district: string; upazila: string }) {
  await connectToDatabase();
  const mapping = await CourierLocationMappingModel.findOne({
    provider: "pathao",
    renvuraDivision: address.division,
    renvuraDistrict: address.district,
    renvuraUpazila: address.upazila,
  }).lean<{ providerCityId: string; providerZoneId: string; providerAreaId: string } | null>();
  if (!mapping) return null;
  return { cityId: mapping.providerCityId, zoneId: mapping.providerZoneId, areaId: mapping.providerAreaId };
}

/** Sums `Product.inventory.shippingWeightGrams` across every line item — `null` (a hard block, never a fabricated default) the moment any item is missing a weight. See CLAUDE.md's "Weight" note. */
async function computeTotalWeightGrams(items: OrderRecord["items"]): Promise<number | null> {
  let total = 0;
  for (const item of items) {
    const product = await getProductBySlug(item.slug);
    const weight = product?.inventory.shippingWeightGrams ?? null;
    if (weight === null) return null;
    total += weight * item.quantity;
  }
  return total;
}

type BuildInputResult = { ok: true; value: ShipmentOrderInput } | { ok: false; error: string };

/** Builds the authoritative payload a provider adapter needs, re-reading everything from the DB — never trusts a client-submitted order/product snapshot (see CLAUDE.md's "Shipment payload" note). Returns a precise, provider-specific error (never a generic one) when a real precondition is missing. */
async function buildShipmentOrderInput(order: OrderRecord, providerId: CourierProviderId): Promise<BuildInputResult> {
  const totalWeightGrams = await computeTotalWeightGrams(order.items);
  if (totalWeightGrams === null) {
    return { ok: false, error: "One or more items in this order are missing a shipping weight. Set a shipping weight on each product in /admin/products before creating this shipment." };
  }

  // Phase 13 correction: Pathao's officially verified Create Order contract documents
  // recipient_city/recipient_zone/recipient_area as OPTIONAL — Pathao resolves them from
  // recipient_address when omitted. A missing CourierLocationMapping entry is therefore no longer
  // a hard block; verified IDs are sent when available (for precision), and simply omitted
  // otherwise — never null/0/guessed. See CLAUDE.md's "Pathao location mapping" note.
  const pathaoLocation: ShipmentOrderInput["pathaoLocation"] = providerId === "pathao" ? await resolvePathaoLocation(order.shippingAddress) : null;

  // Already-verified manual payments (paid) collect nothing further on delivery; COD/unverified
  // orders collect the full total. See CLAUDE.md's "COD amount" note — never taken from client input.
  const codAmountBdt = order.payment.status === "paid" ? 0 : order.pricing.total;

  return {
    ok: true,
    value: {
      orderNumber: order.orderNumber,
      recipientName: order.customer.name,
      recipientPhone: order.customer.phone,
      address: {
        division: order.shippingAddress.division,
        district: order.shippingAddress.district,
        upazila: order.shippingAddress.upazila,
        addressLine: order.shippingAddress.addressLine,
        landmark: order.shippingAddress.landmark ?? null,
      },
      codAmountBdt,
      items: order.items.map((item) => ({ title: item.titleSnapshot, quantity: item.quantity })),
      totalWeightGrams,
      pathaoLocation,
    },
  };
}

export type CreateShipmentForOrderResult =
  | { ok: true; consignmentId: string; trackingId: string; trackingUrl: string | null }
  | { ok: false; error: string };

/**
 * Idempotent shipment creation. A `courier.creationStatus` compare-and-swap (`not_created`/`failed`
 * → `creating`) is claimed atomically before any network call — a double-click or retried request
 * can only ever win that claim once, so at most one consignment is ever created per order (see
 * CLAUDE.md's "Idempotent shipment creation" note). If the claim fails because a creation is
 * already `creating`/`created`, this returns the existing state instead of calling the provider
 * again — never a blind retry on an ambiguous prior attempt.
 */
export async function createShipmentForOrder(orderNumber: string, providerId: CourierProviderId): Promise<CreateShipmentForOrderResult> {
  await connectToDatabase();

  const order = await findOrderByOrderNumber(orderNumber);
  if (!order) return { ok: false, error: "Order not found." };
  if (!isOrderEligibleForShipmentCreation(order.orderStatus)) {
    return { ok: false, error: `Cannot create a shipment for an order in status "${order.orderStatus}".` };
  }
  if (!isProviderApiEnabled(providerId)) {
    return { ok: false, error: `${COURIER_PROVIDER_LABELS[providerId]} is not configured for API shipment creation.` };
  }

  const claimed = await OrderModel.findOneAndUpdate(
    { orderNumber, "courier.creationStatus": { $in: ["not_created", "failed"] } },
    {
      $set: {
        "courier.creationStatus": "creating",
        "courier.providerId": providerId,
        "courier.provider": COURIER_PROVIDER_LABELS[providerId],
        "courier.mode": "api",
        "courier.creationError": null,
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!claimed) {
    const current = await findOrderByOrderNumber(orderNumber);
    if (current?.courier?.creationStatus === "created" && current.courier.consignmentId) {
      return { ok: true, consignmentId: current.courier.consignmentId, trackingId: current.courier.trackingId ?? current.courier.consignmentId, trackingUrl: current.courier.trackingUrl };
    }
    return { ok: false, error: "A shipment creation attempt is already in progress for this order — wait for it to finish, then refresh." };
  }

  const inputResult = await buildShipmentOrderInput(order, providerId);
  if (!inputResult.ok) {
    await OrderModel.updateOne({ orderNumber }, { $set: { "courier.creationStatus": "failed", "courier.creationError": inputResult.error } });
    return { ok: false, error: inputResult.error };
  }

  const provider = getProvider(providerId);
  const result = await provider.createShipment(inputResult.value);

  if (result.status !== "created") {
    const error = result.status === "not_configured" ? `${COURIER_PROVIDER_LABELS[providerId]} is not configured.` : result.error;
    await OrderModel.updateOne({ orderNumber }, { $set: { "courier.creationStatus": "failed", "courier.creationError": error } });
    return { ok: false, error };
  }

  const trackingUrl = result.trackingUrl ?? provider.getTrackingUrl(result.consignmentId);
  await OrderModel.updateOne(
    { orderNumber },
    {
      $set: {
        "courier.creationStatus": "created",
        "courier.creationError": null,
        "courier.consignmentId": result.consignmentId,
        "courier.trackingId": result.trackingId,
        "courier.trackingUrl": trackingUrl,
        "courier.externalOrderId": result.externalOrderId,
        "courier.shipmentCreatedAt": new Date(),
        "courier.normalizedStatus": "pending",
      },
    },
  );

  return { ok: true, consignmentId: result.consignmentId, trackingId: result.trackingId, trackingUrl };
}

export type RefreshShipmentStatusResult = { ok: true; normalizedStatus: NormalizedCourierStatus } | { ok: false; error: string };

/**
 * Read-only status sync — updates `courier.normalizedStatus`/`rawStatusCode`/`lastSyncedAt` only.
 * Deliberately never transitions `orderStatus`/inventory/payment itself in this first
 * implementation (see CLAUDE.md's "Safe status synchronization" note) — staff still drive those
 * through the existing, already-validated Phase 12 `OrderStatusActions` transitions. This keeps
 * every one of Phase 12's safety guarantees (CAS, exactly-once inventory, exactly-once COD-paid)
 * intact without teaching a webhook/refresh path to re-implement them.
 */
export async function refreshShipmentStatus(orderNumber: string): Promise<RefreshShipmentStatusResult> {
  await connectToDatabase();
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order) return { ok: false, error: "Order not found." };

  const courier = order.courier;
  if (!courier?.providerId || !courier.consignmentId || courier.mode !== "api") {
    return { ok: false, error: "This order has no API-created shipment to refresh." };
  }

  const provider = getProvider(courier.providerId);
  const result = await provider.getShipmentStatus(courier.consignmentId);
  if (result.status !== "ok") {
    return { ok: false, error: result.status === "not_configured" ? `${COURIER_PROVIDER_LABELS[courier.providerId]} is not configured.` : result.error };
  }

  await OrderModel.updateOne(
    { orderNumber },
    { $set: { "courier.normalizedStatus": result.normalizedStatus, "courier.rawStatusCode": result.rawStatusCode, "courier.lastSyncedAt": new Date() } },
  );
  return { ok: true, normalizedStatus: result.normalizedStatus };
}

export type SetManualCourierTrackingResult = { ok: true } | { ok: false; error: string };

/**
 * Lets staff record/edit courier tracking info at `confirmed`/`processing` time (before the
 * `shipped` transition) or correct it later — independent of `adminUpdateOrderStatus`'s own
 * shipped-time courier fields, which remain the quick-entry path at the moment of that specific
 * transition. Refuses to overwrite an API-created shipment's identifiers (`creationStatus ===
 * "created"`) — those came from the courier itself and must be corrected at the courier's own
 * dashboard, not silently overwritten here.
 */
export async function setManualCourierTracking(
  orderNumber: string,
  input: { providerId: CourierProviderId; trackingId?: string | null; trackingUrl?: string | null; consignmentId?: string | null },
): Promise<SetManualCourierTrackingResult> {
  await connectToDatabase();
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.courier?.creationStatus === "created") {
    return { ok: false, error: "This order already has an API-created shipment — edit tracking details from the courier's own dashboard instead." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setFields: Record<string, any> = {
    "courier.providerId": input.providerId,
    "courier.provider": COURIER_PROVIDER_LABELS[input.providerId],
    "courier.mode": "manual",
  };
  if (input.trackingId !== undefined) setFields["courier.trackingId"] = input.trackingId;
  if (input.trackingUrl !== undefined) setFields["courier.trackingUrl"] = input.trackingUrl;
  if (input.consignmentId !== undefined) setFields["courier.consignmentId"] = input.consignmentId;

  await OrderModel.updateOne({ orderNumber }, { $set: setFields });
  return { ok: true };
}

type WebhookOrderLookup = {
  orderNumber: string;
  courier: {
    consignmentId: string | null;
    externalOrderId: string | null;
    normalizedStatus: NormalizedCourierStatus;
    rawStatusCode: string | null;
  } | null;
};

export type ProcessPathaoWebhookOutcome = "order_not_found" | "merchant_order_id_mismatch" | "store_id_mismatch" | "unknown_event_acknowledged" | "updated";

export interface ProcessPathaoWebhookResult {
  outcome: ProcessPathaoWebhookOutcome;
  orderNumber: string | null;
  normalizedStatusChanged: boolean;
}

/**
 * Persists a Pathao webhook event (Phase 14) — the DB-touching counterpart to
 * `src/lib/courier/webhook.ts`'s pure parsing/verification. The route handler must have already
 * verified `X-PATHAO-Signature` and parsed the payload before calling this; this function trusts
 * its input and focuses on safe order-matching + a strict mutation boundary.
 *
 * Looks up the order by `courier.consignmentId` (scoped to `providerId: "pathao"`) — never by
 * `merchant_order_id`/`store_id` alone, both of which are used only as secondary consistency
 * checks. A mismatch on either STOPS mutation for that webhook (an audit entry records the
 * mismatch; the order is left untouched) rather than trusting a payload that disagrees with what
 * Renvura itself created the shipment with.
 *
 * Mutation boundary: only `courier.rawStatusCode`/`courier.normalizedStatus`/`courier.lastSyncedAt`
 * are ever written here — never `orderStatus`, inventory, payment, or analytics. Staff still drive
 * the real order lifecycle through the existing Phase 12 `OrderStatusActions` transitions; a
 * webhook is a courier-metadata signal, not a trigger for business-state changes (matching
 * `refreshShipmentStatus()`'s existing "safe status synchronization" boundary above).
 *
 * Naturally idempotent: every write is a `$set` of the same field values a repeated identical
 * delivery would produce again, so no separate webhook-event-dedup collection was built for this
 * (see CLAUDE.md's Phase 14 webhook note) — a deliberate choice, not an oversight.
 */
export async function processPathaoWebhookEvent(payload: PathaoWebhookPayload): Promise<ProcessPathaoWebhookResult> {
  await connectToDatabase();

  const order = await OrderModel.findOne({ "courier.providerId": "pathao", "courier.consignmentId": payload.consignmentId })
    .select({ orderNumber: 1, courier: 1 })
    .lean<WebhookOrderLookup | null>();

  if (!order) {
    return { outcome: "order_not_found", orderNumber: null, normalizedStatusChanged: false };
  }

  if (payload.merchantOrderId && order.courier?.externalOrderId && payload.merchantOrderId !== order.courier.externalOrderId) {
    await recordAuditLog({
      adminUserId: "system",
      action: "courier.webhook_mismatch",
      entityType: "order",
      entityId: order.orderNumber,
      before: null,
      after: {
        reason: "merchant_order_id_mismatch",
        event: payload.event,
        receivedMerchantOrderId: payload.merchantOrderId,
        expectedExternalOrderId: order.courier.externalOrderId,
      },
    });
    return { outcome: "merchant_order_id_mismatch", orderNumber: order.orderNumber, normalizedStatusChanged: false };
  }

  const configuredStoreId = getConfiguredPathaoStoreId();
  if (payload.storeId !== null && configuredStoreId !== null && String(payload.storeId) !== configuredStoreId) {
    await recordAuditLog({
      adminUserId: "system",
      action: "courier.webhook_mismatch",
      entityType: "order",
      entityId: order.orderNumber,
      before: null,
      after: { reason: "store_id_mismatch", event: payload.event, receivedStoreId: payload.storeId, configuredStoreId },
    });
    return { outcome: "store_id_mismatch", orderNumber: order.orderNumber, normalizedStatusChanged: false };
  }

  const mappedStatus = mapWebhookEventToNormalizedStatus(payload.event);
  const previousNormalizedStatus = order.courier?.normalizedStatus ?? "unknown";

  const setFields: Record<string, unknown> = {
    "courier.rawStatusCode": payload.event,
    "courier.lastSyncedAt": new Date(),
  };
  // See mapWebhookEventToNormalizedStatus's doc comment: an unrecognized event leaves
  // normalizedStatus untouched rather than downgrading it to "unknown".
  if (mappedStatus !== null) {
    setFields["courier.normalizedStatus"] = mappedStatus;
  }
  await OrderModel.updateOne({ orderNumber: order.orderNumber }, { $set: setFields });

  await recordAuditLog({
    adminUserId: "system",
    action: "courier.webhook_received",
    entityType: "order",
    entityId: order.orderNumber,
    before: { normalizedStatus: previousNormalizedStatus, rawStatusCode: order.courier?.rawStatusCode ?? null },
    after: { normalizedStatus: mappedStatus ?? previousNormalizedStatus, rawStatusCode: payload.event, event: payload.event, statusMapped: mappedStatus !== null },
  });

  if (mappedStatus === null) {
    return { outcome: "unknown_event_acknowledged", orderNumber: order.orderNumber, normalizedStatusChanged: false };
  }
  return { outcome: "updated", orderNumber: order.orderNumber, normalizedStatusChanged: mappedStatus !== previousNormalizedStatus };
}

export interface PathaoShipmentReadiness {
  ready: boolean;
  /** Human-readable, admin-facing reasons — empty when `ready`. Never a raw stack trace/error object. */
  reasons: string[];
  statusEligible: boolean;
  alreadyCreated: boolean;
  providerConfigured: boolean;
  missingWeightProductCount: number;
  /** Real, unmodified sum of each line item's stored weight × quantity — `null` whenever any item is missing a usable weight, mirroring `buildShipmentOrderInput`'s own `computeTotalWeightGrams`. Never the Pathao-request-floored value (see `providers/pathao.ts`). */
  totalWeightGrams: number | null;
}

/**
 * Read-only pre-flight readiness check for the admin courier UI (Phase 15) — deliberately mirrors
 * every real precondition `createShipmentForOrder()`/`providers/pathao.ts`'s `createShipment()`
 * already enforce (order status, not-already-created, provider configured, per-item weight,
 * Pathao's 10kg maximum), but never mutates anything and never calls Pathao's API. This exists so
 * an admin can see *why* "Create Shipment" would fail before clicking it, not only after — the
 * server-side checks in `createShipmentForOrder` remain the sole authoritative gate; this can
 * never be more permissive than that function, only used to explain it in advance.
 */
export async function getPathaoShipmentReadiness(order: OrderRecord): Promise<PathaoShipmentReadiness> {
  const reasons: string[] = [];

  const statusEligible = isOrderEligibleForShipmentCreation(order.orderStatus);
  if (!statusEligible) {
    reasons.push(`Order status must be Confirmed or Processing (currently ${ORDER_STATUS_LABELS[order.orderStatus]}).`);
  }

  const alreadyCreated = order.courier?.creationStatus === "created";
  if (alreadyCreated) {
    reasons.push("A Pathao shipment has already been created for this order.");
  }

  const providerConfigured = isProviderApiEnabled("pathao");
  if (!providerConfigured) {
    reasons.push("Pathao is not configured for API shipment creation.");
  }

  let missingWeightProductCount = 0;
  let summedWeightGrams = 0;
  for (const item of order.items) {
    const product = await getProductBySlug(item.slug);
    const weight = product?.inventory.shippingWeightGrams ?? null;
    if (getPathaoProductReadiness(weight) !== "ready") {
      missingWeightProductCount += 1;
    } else {
      summedWeightGrams += (weight as number) * item.quantity;
    }
  }
  if (missingWeightProductCount > 0) {
    reasons.push(`${missingWeightProductCount} product${missingWeightProductCount === 1 ? "" : "s"} missing shipping weight.`);
  }

  const totalWeightGrams = missingWeightProductCount > 0 ? null : summedWeightGrams;
  if (totalWeightGrams !== null) {
    const totalKg = totalWeightGrams / 1000;
    if (totalKg > PATHAO_MAX_ITEM_WEIGHT_KG) {
      reasons.push(`Parcel weight ${totalKg.toFixed(2)}kg exceeds Pathao's ${PATHAO_MAX_ITEM_WEIGHT_KG}kg maximum.`);
    }
  }

  return {
    ready: reasons.length === 0,
    reasons,
    statusEligible,
    alreadyCreated,
    providerConfigured,
    missingWeightProductCount,
    totalWeightGrams,
  };
}
