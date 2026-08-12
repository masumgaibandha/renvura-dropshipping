"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { adminUpdateStoreSettings } from "@/actions/admin/settings";
import type { StoreSettings } from "@/services/settings";

export function StoreSettingsForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const [values, setValues] = useState({
    storeName: settings.storeName,
    supportEmail: settings.supportEmail ?? "",
    supportPhone: settings.supportPhone ?? "",
    insideDhakaDeliveryFee: String(settings.insideDhakaDeliveryFee),
    outsideDhakaDeliveryFee: String(settings.outsideDhakaDeliveryFee),
    lowStockThreshold: String(settings.lowStockThreshold),
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const insideDhakaDeliveryFee = Number(values.insideDhakaDeliveryFee);
    const outsideDhakaDeliveryFee = Number(values.outsideDhakaDeliveryFee);
    const lowStockThreshold = Number(values.lowStockThreshold);
    if (![insideDhakaDeliveryFee, outsideDhakaDeliveryFee, lowStockThreshold].every((n) => Number.isFinite(n) && n >= 0)) {
      setError("Fees and threshold must be non-negative numbers.");
      return;
    }

    const payload = {
      storeName: values.storeName.trim(),
      supportEmail: values.supportEmail.trim() || null,
      supportPhone: values.supportPhone.trim() || null,
      insideDhakaDeliveryFee,
      outsideDhakaDeliveryFee,
      lowStockThreshold,
    };

    startTransition(async () => {
      const result = await adminUpdateStoreSettings(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-foreground/70">Store name</span>
        <input value={values.storeName} onChange={(event) => setValues((v) => ({ ...v, storeName: event.target.value }))} required className="h-9 w-full max-w-sm rounded-lg border border-border bg-background px-3 text-small text-foreground" />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-xl">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/70">Support email</span>
          <input value={values.supportEmail} onChange={(event) => setValues((v) => ({ ...v, supportEmail: event.target.value }))} type="email" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/70">Support phone</span>
          <input value={values.supportPhone} onChange={(event) => setValues((v) => ({ ...v, supportPhone: event.target.value }))} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:max-w-xl">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/70">Inside Dhaka fee (৳)</span>
          <input value={values.insideDhakaDeliveryFee} onChange={(event) => setValues((v) => ({ ...v, insideDhakaDeliveryFee: event.target.value }))} inputMode="decimal" required className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/70">Outside Dhaka fee (৳)</span>
          <input value={values.outsideDhakaDeliveryFee} onChange={(event) => setValues((v) => ({ ...v, outsideDhakaDeliveryFee: event.target.value }))} inputMode="decimal" required className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/70">Low-stock threshold</span>
          <input value={values.lowStockThreshold} onChange={(event) => setValues((v) => ({ ...v, lowStockThreshold: event.target.value }))} inputMode="numeric" required className="h-9 w-full rounded-lg border border-border bg-background px-3 text-small text-foreground" />
        </label>
      </div>

      {error && (
        <p role="alert" className="max-w-xl rounded-lg border border-red-200 bg-red-50 p-3 text-small text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="max-w-xl rounded-lg border border-green-200 bg-green-50 p-3 text-small text-green-700">
          Saved. Checkout now uses these delivery fees immediately.
        </p>
      )}

      <div>
        <Button type="submit" variant="primary" isDisabled={isPending}>
          {isPending ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}
