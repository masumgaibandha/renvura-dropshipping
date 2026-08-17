"use client";

import { clsx } from "clsx";

import type { Address } from "@/types/address";

interface SavedAddressSelectorProps {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (address: Address) => void;
  onUseNewAddress: () => void;
}

/** Shown instead of `DeliveryAddressSection` when a logged-in customer has saved addresses — never forces address saving, "Enter a new address" always falls back to the manual form. */
export function SavedAddressSelector({ addresses, selectedId, onSelect, onUseNewAddress }: SavedAddressSelectorProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-h3 text-foreground">Delivery Address</h2>
      <div className="mt-4 flex flex-col gap-2">
        {addresses.map((address) => (
          <label
            key={address.id}
            className={clsx(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-small transition-colors",
              selectedId === address.id ? "border-accent bg-accent/5" : "border-border",
            )}
          >
            <input
              type="radio"
              name="saved-address"
              checked={selectedId === address.id}
              onChange={() => onSelect(address)}
              className="mt-1 size-4 accent-accent"
            />
            <div>
              <p className="font-medium text-foreground">
                {address.label} {address.isDefault && <span className="text-xs text-accent">(Default)</span>}
              </p>
              <p className="text-foreground/70">
                {address.recipientName} · {address.phone}
              </p>
              <p className="text-foreground/70">
                {address.addressLine}, {address.upazila}, {address.district}, {address.division}
              </p>
            </div>
          </label>
        ))}
      </div>
      <button type="button" onClick={onUseNewAddress} className="mt-4 text-small font-medium text-accent hover:underline">
        + Enter a new address
      </button>
    </section>
  );
}
