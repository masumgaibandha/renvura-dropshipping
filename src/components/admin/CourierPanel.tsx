"use client";

import { useState, useTransition } from "react";

import { adminCreateShipment, adminRefreshCourierStatus, adminSetManualCourierTracking } from "@/actions/admin/courier";
import { COURIER_PROVIDER_LABELS, NORMALIZED_STATUS_LABELS } from "@/lib/courier/types";
import type { PathaoEnv } from "@/lib/courier/config";
import type { PathaoShipmentReadiness } from "@/services/courier";
import type { CourierProviderId, OrderCourier } from "@/types/order";

const inputClass = "h-9 w-full rounded-lg border border-border bg-background px-2 text-small text-foreground";

const PROVIDER_OPTIONS: { value: CourierProviderId; label: string }[] = [
  { value: "pathao", label: COURIER_PROVIDER_LABELS.pathao },
  { value: "steadfast", label: COURIER_PROVIDER_LABELS.steadfast },
  { value: "redx", label: COURIER_PROVIDER_LABELS.redx },
  { value: "paperfly", label: COURIER_PROVIDER_LABELS.paperfly },
  { value: "other", label: COURIER_PROVIDER_LABELS.other },
];

/** The only two providers with a real (though unverified/disabled-by-default) adapter — see `src/lib/courier/registry.ts`. RedX/Paperfly/Other are manual-only by design, not because they're "unconfigured." */
const API_CAPABLE_PROVIDERS: CourierProviderId[] = ["pathao", "steadfast"];

interface CourierPanelProps {
  orderNumber: string;
  courier: OrderCourier;
  /** Server-computed (env-dependent) — a Client Component can't check `process.env` credentials itself. `true` only for a provider with a real adapter *and* configured credentials right now. */
  apiEnabledProviders: Partial<Record<CourierProviderId, boolean>>;
  /** Whether the order's current status allows creating a shipment (`confirmed`/`processing`/`supplier_submitted`) — see `isOrderEligibleForShipmentCreation`. */
  eligibleForCreation: boolean;
  /** Server-computed, read-only pre-flight check (Phase 15) — see `getPathaoShipmentReadiness()`. Purely a display convenience; `adminCreateShipment`'s own server-side checks remain authoritative regardless of what this shows. */
  pathaoReadiness: PathaoShipmentReadiness;
  /** Non-secret provider-mode indicator only (`"sandbox"` | `"production"`) — never credentials/tokens. */
  pathaoEnv: PathaoEnv;
}

/**
 * Admin courier section for `/admin/orders/[orderNumber]` (Phase 13) — separate from
 * `OrderStatusActions`'s own quick manual-entry fields at the `shipped` transition (unchanged from
 * Phase 12). This panel is the richer, standalone workflow: pick a provider, either create a real
 * API shipment (only ever offered when that provider is both API-capable and currently configured)
 * or record manual tracking info, independent of the order's status transition itself. See
 * CLAUDE.md's "Shipment creation eligibility" note for why this is deliberately decoupled from
 * "Mark Shipped."
 */
export function CourierPanel({ orderNumber, courier, apiEnabledProviders, eligibleForCreation, pathaoReadiness, pathaoEnv }: CourierPanelProps) {
  const [providerId, setProviderId] = useState<CourierProviderId | "">(courier.providerId ?? "");
  const [trackingId, setTrackingId] = useState(courier.trackingId ?? "");
  const [trackingUrl, setTrackingUrl] = useState(courier.trackingUrl ?? "");
  const [consignmentId, setConsignmentId] = useState(courier.consignmentId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isApiEnabled = providerId !== "" && Boolean(apiEnabledProviders[providerId]);
  const alreadyCreated = courier.creationStatus === "created";
  const isCreating = courier.creationStatus === "creating";

  function handleCreateShipment() {
    if (!providerId) {
      setError("Select a courier provider first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await adminCreateShipment(orderNumber, providerId);
      if (!result.ok) setError(result.error);
    });
  }

  function handleRefreshStatus() {
    setError(null);
    startTransition(async () => {
      const result = await adminRefreshCourierStatus(orderNumber);
      if (!result.ok) setError(result.error);
    });
  }

  function handleSaveManualTracking() {
    if (!providerId) {
      setError("Select a courier provider first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await adminSetManualCourierTracking(orderNumber, {
        providerId,
        trackingId: trackingId.trim() || null,
        trackingUrl: trackingUrl.trim() || null,
        consignmentId: consignmentId.trim() || null,
      });
      if (!result.ok) setError(result.error);
    });
  }

  const isPathaoSelected = providerId === "pathao";
  const pathaoBlocked = isPathaoSelected && !pathaoReadiness.ready && !alreadyCreated;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body font-semibold text-foreground">Courier</h2>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground/70">
          Pathao: {pathaoEnv === "production" ? "Production" : "Sandbox"}
        </span>
      </div>

      {isPathaoSelected && !alreadyCreated && (
        <div
          className={`mt-3 rounded-lg border p-3 text-small ${pathaoReadiness.ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}
        >
          <p className="font-semibold">{pathaoReadiness.ready ? "READY FOR PATHAO" : "BLOCKED"}</p>
          {!pathaoReadiness.ready && (
            <ul className="mt-1.5 list-disc pl-4 text-xs">
              {pathaoReadiness.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          {pathaoReadiness.totalWeightGrams !== null && (
            <p className="mt-1.5 text-xs opacity-80">Calculated parcel weight: {(pathaoReadiness.totalWeightGrams / 1000).toFixed(2)}kg</p>
          )}
        </div>
      )}

      {alreadyCreated ? (
        <div className="mt-3 flex flex-col gap-3">
          <dl className="flex flex-col gap-1.5 text-small">
            <Row label="Provider" value={courier.provider ?? "—"} />
            <Row label="Mode" value="API" />
            <Row label="Consignment ID" value={courier.consignmentId ?? "—"} />
            <Row label="Tracking ID" value={courier.trackingId ?? "—"} />
            <Row label="Status" value={NORMALIZED_STATUS_LABELS[courier.normalizedStatus]} />
            <Row label="Last synced" value={courier.lastSyncedAt ? new Date(courier.lastSyncedAt).toLocaleString("en-GB") : "Never"} />
          </dl>
          <button type="button" onClick={handleRefreshStatus} disabled={isPending} className="h-8 self-start rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-surface-soft disabled:opacity-50">
            {isPending ? "Refreshing…" : "Refresh Status"}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {courier.creationStatus === "failed" && courier.creationError && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-small text-red-700">Last attempt failed: {courier.creationError}</p>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select value={providerId} onChange={(event) => setProviderId(event.target.value as CourierProviderId | "")} className={inputClass}>
              <option value="">Select courier…</option>
              {PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {providerId && API_CAPABLE_PROVIDERS.includes(providerId) && !isApiEnabled && (
            <p className="rounded-lg border border-border bg-surface-soft px-3 py-2 text-xs font-medium text-foreground/70">Not configured / API unavailable — manual tracking entry only.</p>
          )}

          {providerId && isApiEnabled ? (
            <button
              type="button"
              onClick={handleCreateShipment}
              disabled={isPending || isCreating || !eligibleForCreation || pathaoBlocked}
              title={pathaoBlocked ? pathaoReadiness.reasons.join(" ") : undefined}
              className="h-9 self-start rounded-lg bg-accent px-4 text-small font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {isCreating ? "Creating…" : "Create Shipment"}
            </button>
          ) : (
            providerId && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input placeholder="Tracking ID" value={trackingId} onChange={(event) => setTrackingId(event.target.value)} className={inputClass} />
                <input placeholder="Tracking URL" value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} className={inputClass} />
                <input placeholder="Consignment ID" value={consignmentId} onChange={(event) => setConsignmentId(event.target.value)} className={inputClass} />
              </div>
            )
          )}

          {providerId && !isApiEnabled && (
            <button type="button" onClick={handleSaveManualTracking} disabled={isPending} className="h-9 self-start rounded-lg border border-border px-4 text-small font-medium text-foreground hover:bg-surface-soft disabled:opacity-50">
              {isPending ? "Saving…" : "Save Tracking Info"}
            </button>
          )}

          {!eligibleForCreation && isApiEnabled && !isPathaoSelected && (
            <p className="text-xs text-foreground/70">Shipment creation is only available while the order is confirmed or processing.</p>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-small text-red-700">{error}</p>}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-foreground/70">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}
