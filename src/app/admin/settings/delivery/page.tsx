import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { getStoreSettings } from "@/services/settings";

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
    </div>
  );
}
