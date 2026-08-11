"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from "@/actions/addresses";
import type { Address } from "@/types/address";
import { AddressForm, type AddressActionResult, type AddressFormSubmitValue } from "./AddressForm";

interface AddressListProps {
  addresses: Address[];
}

/**
 * All mutations go through the real Server Actions in `src/actions/addresses.ts`,
 * which derive the owning user from the session server-side — this component never
 * sends a `userId`. `router.refresh()` after every successful mutation re-fetches
 * the parent Server Component's `addresses` prop rather than duplicating state here.
 */
export function AddressList({ addresses }: AddressListProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(value: AddressFormSubmitValue): Promise<AddressActionResult> {
    const result = await createAddress(value);
    if (result.ok) {
      setIsAdding(false);
      router.refresh();
    }
    return result;
  }

  async function handleUpdate(id: string, value: AddressFormSubmitValue): Promise<AddressActionResult> {
    const result = await updateAddress(id, value);
    if (result.ok) {
      setEditingId(null);
      router.refresh();
    }
    return result;
  }

  async function handleDelete(address: Address) {
    if (!window.confirm(`Delete "${address.label}"?`)) {
      return;
    }
    setDeletingId(address.id);
    await deleteAddress(address.id);
    setDeletingId(null);
    router.refresh();
  }

  async function handleSetDefault(id: string) {
    await setDefaultAddress(id);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {addresses.length === 0 && !isAdding && <p className="text-small text-foreground/70">You have no saved addresses yet.</p>}

      {addresses.map((address) =>
        editingId === address.id ? (
          <AddressForm
            key={address.id}
            initialAddress={address}
            submitLabel="Save Changes"
            onCancel={() => setEditingId(null)}
            onSubmit={(value) => handleUpdate(address.id, value)}
          />
        ) : (
          <div key={address.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{address.label}</p>
              {address.isDefault && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Default</span>}
            </div>
            <p className="mt-1 text-small text-foreground">
              {address.recipientName} · {address.phone}
            </p>
            <p className="text-small text-foreground/70">
              {address.addressLine}, {address.upazila}, {address.district}, {address.division}
            </p>
            {address.landmark && <p className="text-small text-foreground/70">Landmark: {address.landmark}</p>}

            <div className="mt-4 flex flex-wrap gap-4 text-small">
              <button type="button" onClick={() => setEditingId(address.id)} className="font-medium text-accent hover:underline">
                Edit
              </button>
              {!address.isDefault && (
                <button type="button" onClick={() => handleSetDefault(address.id)} className="font-medium text-accent hover:underline">
                  Set as Default
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(address)}
                disabled={deletingId === address.id}
                className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId === address.id ? "Removing…" : "Delete"}
              </button>
            </div>
          </div>
        ),
      )}

      {isAdding ? (
        <AddressForm submitLabel="Add Address" onCancel={() => setIsAdding(false)} onSubmit={handleCreate} />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex h-11 w-full items-center justify-center rounded-full border border-dashed border-border text-small font-medium text-foreground/70 transition-colors hover:border-accent hover:text-accent sm:w-auto sm:px-6"
        >
          + Add New Address
        </button>
      )}
    </div>
  );
}
