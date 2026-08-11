"use client";

import { useState, type FormEvent } from "react";

import { BangladeshAddressFields, type BangladeshAddressValue } from "@/components/ui/BangladeshAddressFields";
import type { Address } from "@/types/address";

export interface AddressFormSubmitValue extends BangladeshAddressValue {
  label: string;
  recipientName: string;
  phone: string;
  isDefault: boolean;
}

export interface AddressActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

interface AddressFormProps {
  initialAddress?: Address;
  onSubmit: (value: AddressFormSubmitValue) => Promise<AddressActionResult>;
  onCancel: () => void;
  submitLabel: string;
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const labelClass = "text-small font-medium text-foreground";

/** Create/edit form for a saved address — composes the same `BangladeshAddressFields` checkout uses, plus label/recipient/phone/default fields. */
export function AddressForm({ initialAddress, onSubmit, onCancel, submitLabel }: AddressFormProps) {
  const [location, setLocation] = useState<BangladeshAddressValue>({
    division: initialAddress?.division ?? "",
    district: initialAddress?.district ?? "",
    upazila: initialAddress?.upazila ?? "",
    addressLine: initialAddress?.addressLine ?? "",
    landmark: initialAddress?.landmark ?? "",
    notes: initialAddress?.notes ?? "",
  });
  const [label, setLabel] = useState(initialAddress?.label ?? "");
  const [recipientName, setRecipientName] = useState(initialAddress?.recipientName ?? "");
  const [phone, setPhone] = useState(initialAddress?.phone ?? "");
  const [isDefault, setIsDefault] = useState(initialAddress?.isDefault ?? false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const result = await onSubmit({ ...location, label, recipientName, phone, isDefault });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setFieldErrors(result.fieldErrors ?? {});
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-soft p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="address-label" className={labelClass}>
            Label
          </label>
          <input
            id="address-label"
            type="text"
            required
            placeholder="Home, Office"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className={inputClass}
          />
          {fieldErrors.label && <p className="text-xs text-red-600">{fieldErrors.label}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="address-recipient" className={labelClass}>
            Recipient Name
          </label>
          <input
            id="address-recipient"
            type="text"
            required
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            className={inputClass}
          />
          {fieldErrors.recipientName && <p className="text-xs text-red-600">{fieldErrors.recipientName}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="address-phone" className={labelClass}>
          Mobile Number
        </label>
        <input
          id="address-phone"
          type="tel"
          required
          placeholder="01XXXXXXXXX"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={inputClass}
        />
        {fieldErrors.phone && <p className="text-xs text-red-600">{fieldErrors.phone}</p>}
      </div>

      <BangladeshAddressFields
        value={location}
        onChange={setLocation}
        errors={{
          division: fieldErrors.division,
          district: fieldErrors.district,
          upazila: fieldErrors.upazila,
          addressLine: fieldErrors.addressLine,
          landmark: fieldErrors.landmark,
          notes: fieldErrors.notes,
        }}
      />

      <label className="flex items-center gap-2 text-small text-foreground">
        <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} className="size-4 accent-accent" />
        Set as default address
      </label>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-small text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 items-center justify-center rounded-full bg-accent px-6 text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-11 items-center justify-center rounded-full border border-border px-6 text-small font-medium text-foreground transition-colors hover:border-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
