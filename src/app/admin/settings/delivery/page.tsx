import { PathaoProductionDiagnostic } from "@/components/admin/PathaoProductionDiagnostic";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import {
  getPathaoEnv,
  isPathaoApiEnabled,
  isPathaoConfigured,
  isPathaoCredentialsConfigured,
  isPathaoProductionStoreConfigured,
  isSteadfastApiEnabled,
  isSteadfastConfigured,
  isSteadfastCredentialsConfigured,
} from "@/lib/courier/config";
import { getStoreSettings } from "@/services/settings";

/**
 * Cheap, synchronous env-presence checks only — never a live API call on every page load (see
 * CLAUDE.md's "Provider health" note), never displays a secret value. Shows the two-part gate
 * explicitly (credentials present vs. explicitly enabled) rather than one collapsed "configured"
 * state — real API shipment creation requires both, and a human should be able to see which half
 * is missing without guessing.
 */
function CourierProviderHealth() {
  const pathaoEnv = getPathaoEnv();
  const rows = [
    {
      label: "Pathao",
      credentials: isPathaoCredentialsConfigured(),
      enabled: isPathaoApiEnabled(),
      apiEnabled: isPathaoConfigured(),
      env: pathaoEnv === "production" ? "Production" : "Sandbox",
      // Only meaningful (and only shown) in production — sandbox is allowed to auto-discover a
      // store; production is not. See `isPathaoProductionStoreConfigured()`'s doc comment.
      productionStoreConfigured: pathaoEnv === "production" ? isPathaoProductionStoreConfigured() : null,
    },
    { label: "Steadfast", credentials: isSteadfastCredentialsConfigured(), enabled: isSteadfastApiEnabled(), apiEnabled: isSteadfastConfigured(), env: null, productionStoreConfigured: null },
  ];
  return (
    <div className="max-w-2xl rounded-xl border border-border bg-surface p-5">
      <h2 className="text-body font-semibold text-foreground">Courier Providers</h2>
      <p className="mt-1 text-small text-foreground/70">
        Real API shipment creation requires both credentials and an explicit enable flag — Pathao&apos;s adapter is officially verified
        against sandbox; Steadfast&apos;s remains unverified, see CLAUDE.md.
      </p>
      <div className="mt-3 flex flex-col gap-4 text-small">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{row.label}</p>
              {row.env && (
                <span
                  className={
                    row.env === "Production"
                      ? "rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                      : "rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground/70"
                  }
                >
                  {row.env === "Production" ? "⚠ Production (live)" : row.env}
                </span>
              )}
            </div>
            <dl className="mt-1 flex flex-col gap-1">
              <StatusRow label="Credentials" ok={row.credentials} />
              <StatusRow label="Enabled" ok={row.enabled} />
              {row.productionStoreConfigured !== null && <StatusRow label="Production store configured" ok={row.productionStoreConfigured} />}
              <StatusRow label="API shipment creation" ok={row.apiEnabled} okLabel="Available" notOkLabel="Not configured / API unavailable" />
            </dl>
          </div>
        ))}
      </div>

      <PathaoProductionDiagnostic />
    </div>
  );
}

function StatusRow({ label, ok, okLabel = "Yes", notOkLabel = "No" }: { label: string; ok: boolean; okLabel?: string; notOkLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-foreground/70">{label}</dt>
      <dd className={ok ? "font-medium text-emerald-600" : "font-medium text-foreground/50"}>{ok ? okLabel : notOkLabel}</dd>
    </div>
  );
}

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-small text-foreground/70">
          Store details and delivery fees. Changes apply to checkout immediately — there is no separate &quot;publish&quot; step.
        </p>
      </div>

      <div className="max-w-2xl rounded-xl border border-border bg-surface p-5">
        <StoreSettingsForm settings={settings} />
      </div>

      <CourierProviderHealth />
    </div>
  );
}
