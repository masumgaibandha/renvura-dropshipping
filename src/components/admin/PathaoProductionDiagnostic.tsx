"use client";

import { useState, useTransition } from "react";

import { adminCheckPathaoProductionConnection, type AdminPathaoProductionConnectionResult } from "@/actions/admin/courier";
import type { PathaoAuthFailureCategory } from "@/lib/courier/providers/pathao";

const CATEGORY_LABELS: Record<PathaoAuthFailureCategory, string> = {
  invalid_client: "Invalid client (client_id/client_secret likely wrong)",
  invalid_credentials: "Invalid username/password",
  missing_or_invalid_field: "Missing or invalid required field",
  malformed_request: "Malformed request",
  network_error: "Network/connection error (no HTTP response received)",
  unrecognized: "Unrecognized — see Pathao message above",
};

/**
 * Admin-only, read-only Pathao production connectivity check (Phase 17) — `/admin/settings/delivery`
 * only, gated by the same admin-only layout every other page under `/admin/*` already enforces.
 * The Server Action it calls (`adminCheckPathaoProductionConnection`) independently re-checks
 * `requireAdmin()` itself, so this component never assumes the layout already ran. Never sends or
 * receives a credential/token value — only the sanitized summary shape `checkPathaoProductionConnection()`
 * already returns.
 */
export function PathaoProductionDiagnostic() {
  const [result, setResult] = useState<AdminPathaoProductionConnectionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCheck() {
    startTransition(async () => {
      const response = await adminCheckPathaoProductionConnection();
      setResult(response);
    });
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <button
        type="button"
        onClick={handleCheck}
        disabled={isPending}
        className="h-9 rounded-lg border border-border px-4 text-small font-medium text-foreground hover:bg-surface-soft disabled:opacity-50"
      >
        {isPending ? "Checking…" : "Verify Pathao Production Connection"}
      </button>
      <p className="mt-1.5 text-xs text-foreground/60">
        Read-only — authenticates against Pathao&apos;s live API and lists stores only. Never creates, updates, or deletes
        anything, and never requires Pathao shipment creation to be enabled.
      </p>

      {result && (
        <div className="mt-3 rounded-lg border border-border bg-surface-soft p-3 text-small">
          <ResultBody result={result} />
        </div>
      )}
    </div>
  );
}

function ResultBody({ result }: { result: AdminPathaoProductionConnectionResult }) {
  if (result.outcome === "unauthorized") {
    return <p className="text-red-700">Not authorized.</p>;
  }

  const envLabel = result.resolvedEnv === "production" ? "Production" : "Sandbox";

  if (result.outcome === "wrong_env") {
    return (
      <p className="text-amber-800">
        <span className="font-semibold">Skipped — no API call made.</span> Resolved environment is <strong>{envLabel}</strong>, not
        Production. This check only ever runs against Pathao&apos;s live production API; set <code>PATHAO_ENV=production</code>{" "}
        first.
      </p>
    );
  }

  if (result.outcome === "not_configured") {
    return (
      <p className="text-amber-800">
        Resolved environment: <strong>{envLabel}</strong>. Pathao credentials are not fully configured — no API call was made.
      </p>
    );
  }

  if (result.outcome === "auth_failed") {
    const d = result.details;
    return (
      <div className="text-red-700">
        <p className="font-semibold">Authentication failed.</p>
        <p className="mt-1 text-xs">{result.error}</p>
        {d && (
          <dl className="mt-2 flex flex-col gap-1 text-xs text-red-800">
            <Row label="HTTP status" value={d.httpStatus !== null ? String(d.httpStatus) : "—"} />
            <Row label="Pathao message" value={d.pathaoMessage ?? "—"} />
            <Row label="Pathao error code" value={d.pathaoErrorCode ?? "—"} />
            <Row label="Validation fields" value={d.validationFields.length > 0 ? d.validationFields.join(", ") : "—"} />
            <Row label="Best-effort category" value={CATEGORY_LABELS[d.category]} />
          </dl>
        )}
        <p className="mt-2 text-[11px] italic text-red-700/70">
          Category is a best-effort read of Pathao&apos;s own response text — not an officially confirmed error vocabulary. No
          submitted credential value is ever included here.
        </p>
      </div>
    );
  }

  if (result.outcome === "stores_failed") {
    return (
      <div className="text-red-700">
        <p className="font-semibold">Authenticated, but the store list request failed.</p>
        <p className="mt-1 text-xs">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold text-emerald-700">Connected successfully — Production.</p>
      <p>Total stores returned: {result.storeCount}</p>
      <p>
        Expected store <code>{result.expectedStoreId}</code>:{" "}
        {!result.expectedStoreFound ? (
          <span className="font-medium text-red-700">not found among returned stores</span>
        ) : result.expectedStoreActive ? (
          <span className="font-medium text-emerald-700">found and active</span>
        ) : (
          <span className="font-medium text-amber-800">found, but not active</span>
        )}
      </p>

      {result.activeStores.length > 0 && (
        <div className="mt-1 overflow-x-auto">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="border-b border-border text-left text-foreground/70">
                <th className="py-1 pr-3 font-medium">Store ID</th>
                <th className="py-1 pr-3 font-medium">Store Name</th>
                <th className="py-1 pr-3 font-medium">City ID</th>
                <th className="py-1 pr-3 font-medium">Zone ID</th>
                <th className="py-1 pr-3 font-medium">Default</th>
                <th className="py-1 font-medium">Default Return</th>
              </tr>
            </thead>
            <tbody>
              {result.activeStores.map((store) => (
                <tr key={store.storeId} className="border-b border-border/60 last:border-0">
                  <td className="py-1 pr-3 text-foreground">{store.storeId}</td>
                  <td className="py-1 pr-3 text-foreground">{store.storeName}</td>
                  <td className="py-1 pr-3 text-foreground/70">{store.cityId}</td>
                  <td className="py-1 pr-3 text-foreground/70">{store.zoneId}</td>
                  <td className="py-1 pr-3 text-foreground/70">{store.isDefaultStore ? "Yes" : "—"}</td>
                  <td className="py-1 text-foreground/70">{store.isDefaultReturnStore ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="opacity-80">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
