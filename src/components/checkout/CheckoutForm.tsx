"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { createOrder } from "@/actions/orders";
import { useCart } from "@/contexts/CartContext";
import type { Address } from "@/types/address";
import type { PaymentMethod } from "@/types/order";
import type { DeliveryFeeTable } from "@/utils/delivery";
import { CustomerInfoSection, type CustomerInfoValue } from "./CustomerInfoSection";
import { DeliveryAddressSection, type DeliveryAddressValue } from "./DeliveryAddressSection";
import { OrderSummary } from "./OrderSummary";
import { PaymentMethodSection } from "./PaymentMethodSection";
import { SavedAddressSelector } from "./SavedAddressSelector";

const EMPTY_CUSTOMER: CustomerInfoValue = { name: "", phone: "", email: "" };
const EMPTY_ADDRESS: DeliveryAddressValue = { division: "", district: "", upazila: "", addressLine: "", landmark: "", notes: "" };

function addressToDeliveryValue(address: Address): DeliveryAddressValue {
  return {
    division: address.division,
    district: address.district,
    upazila: address.upazila,
    addressLine: address.addressLine,
    landmark: address.landmark ?? "",
    notes: address.notes ?? "",
  };
}

interface CheckoutFormProps {
  /** From the signed-in customer's profile — prefills Customer Information; absent entirely for guests. */
  initialCustomer?: CustomerInfoValue;
  /** The signed-in customer's saved addresses, if any — never required, never forces saving a new one. */
  savedAddresses?: Address[];
  /** Current admin-editable delivery fees (`/admin/settings/delivery`), fetched server-side — passed down so `OrderSummary`'s live estimate always matches what `createOrder` will actually charge. */
  deliveryFees: DeliveryFeeTable;
}

/**
 * All checkout state lives here; the sections below are controlled,
 * "dumb" components. `items`/`subtotal` from `useCart()` are read for
 * *display* only — `createOrder` re-derives everything price-related
 * server-side from `productId`/`quantity` alone (see
 * `src/actions/order-logic.ts`), so nothing submitted from this form's
 * cart snapshot is ever trusted as a price. Guest checkout is unaffected:
 * with both props absent (the default), this renders identically to
 * before — no login is ever required to place an order.
 */
export function CheckoutForm({ initialCustomer, savedAddresses = [], deliveryFees }: CheckoutFormProps) {
  const { items, subtotal, isHydrated, clearCart } = useCart();
  const router = useRouter();

  const defaultSavedAddress = savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0];

  const [customer, setCustomer] = useState<CustomerInfoValue>(initialCustomer ?? EMPTY_CUSTOMER);
  const [address, setAddress] = useState<DeliveryAddressValue>(defaultSavedAddress ? addressToDeliveryValue(defaultSavedAddress) : EMPTY_ADDRESS);
  const [addressMode, setAddressMode] = useState<"saved" | "new">(savedAddresses.length > 0 ? "saved" : "new");
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(defaultSavedAddress?.id ?? null);
  const [method, setMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [transactionId, setTransactionId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [isPending, startTransition] = useTransition();

  function handleMethodChange(next: PaymentMethod) {
    setMethod(next);
    if (next === "cash_on_delivery") setTransactionId("");
  }

  function handleSelectSavedAddress(saved: Address) {
    setSelectedSavedAddressId(saved.id);
    setAddress(addressToDeliveryValue(saved));
  }

  function handleUseNewAddress() {
    setAddressMode("new");
    setSelectedSavedAddressId(null);
    setAddress(EMPTY_ADDRESS);
  }

  function handleUseSavedAddress() {
    setAddressMode("saved");
    if (defaultSavedAddress) {
      handleSelectSavedAddress(defaultSavedAddress);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createOrder({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        customer,
        shippingAddress: address,
        payment: { method, transactionId },
        idempotencyKey,
      });

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      // Only clear after the server confirms the order — never before.
      clearCart();
      router.push(`/order-success/${result.order.orderNumber}`);
    });
  }

  if (!isHydrated) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-body text-foreground/70">Your cart is empty.</p>
        <Link
          href="/shop"
          className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-small font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <CustomerInfoSection
            value={customer}
            onChange={setCustomer}
            errors={{
              name: fieldErrors["customer.name"],
              phone: fieldErrors["customer.phone"],
              email: fieldErrors["customer.email"],
            }}
          />
          {addressMode === "saved" && savedAddresses.length > 0 ? (
            <SavedAddressSelector
              addresses={savedAddresses}
              selectedId={selectedSavedAddressId}
              onSelect={handleSelectSavedAddress}
              onUseNewAddress={handleUseNewAddress}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {savedAddresses.length > 0 && (
                <button type="button" onClick={handleUseSavedAddress} className="self-end text-small font-medium text-accent hover:underline">
                  ← Use a saved address
                </button>
              )}
              <DeliveryAddressSection
                value={address}
                onChange={setAddress}
                errors={{
                  division: fieldErrors["shippingAddress.division"],
                  district: fieldErrors["shippingAddress.district"],
                  upazila: fieldErrors["shippingAddress.upazila"],
                  addressLine: fieldErrors["shippingAddress.addressLine"],
                  landmark: fieldErrors["shippingAddress.landmark"],
                  notes: fieldErrors["shippingAddress.notes"],
                }}
              />
            </div>
          )}
          <PaymentMethodSection
            method={method}
            transactionId={transactionId}
            onMethodChange={handleMethodChange}
            onTransactionIdChange={setTransactionId}
            transactionIdError={fieldErrors["payment.transactionId"]}
          />
        </div>

        <div className="flex flex-col gap-4">
          <OrderSummary items={items} subtotal={subtotal} district={address.district} deliveryFees={deliveryFees} />

          {formError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-small text-red-700">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex h-12 w-full items-center justify-center rounded-full bg-accent text-small font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Placing Order…" : "Place Order"}
          </button>
        </div>
      </div>
    </form>
  );
}
