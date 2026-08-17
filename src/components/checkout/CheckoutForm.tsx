"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";

import { createOrder } from "@/actions/orders";
import { useCart } from "@/contexts/CartContext";
import { cartItemToAnalyticsItem, itemsValue } from "@/lib/analytics/mapping";
import { trackGaBeginCheckout } from "@/lib/analytics/ga4-client";
import { trackMetaInitiateCheckout } from "@/lib/analytics/meta-client";
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
  const hasFiredInitiateCheckout = useRef(false);

  // Fires once, only once the customer has genuinely reached checkout with a real cart — never on
  // a background/preload render, and never again on re-renders (form field edits, etc.).
  useEffect(() => {
    if (!isHydrated || items.length === 0 || hasFiredInitiateCheckout.current) return;
    hasFiredInitiateCheckout.current = true;
    const analyticsItems = items.map(cartItemToAnalyticsItem);
    trackMetaInitiateCheckout({ items: analyticsItems, value: itemsValue(analyticsItems) });
    trackGaBeginCheckout({ items: analyticsItems, value: itemsValue(analyticsItems) });
  }, [isHydrated, items]);

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
      {/*
        IMPORTANT: `min-w-0` on both direct grid children is required, not optional decoration.
        CSS Grid items default to `min-width: auto` — their minimum size is computed from their
        content's own min-content width, walking the *entire* subtree, and this is a genuinely
        different mechanism from flexbox's identical-sounding gotcha: a `min-w-0` deep inside a
        nested flex row (like `OrderSummary`'s `<div className="min-w-0 flex-1">` around each
        item's truncated title) only fixes sizing *within that flex context* — it does not stop
        the outer CSS Grid item from still reporting that same nowrap/truncated text's full
        un-wrapped width as its own min-content contribution. Below the `lg:` breakpoint (where
        `grid-template-columns` isn't set), the grid falls back to a single implicit auto-sized
        column holding both children — without `min-w-0` here, that column (and the whole page)
        was measured ballooning to ~900px+ at narrow widths because of `OrderSummary`'s truncated
        item titles, even though every relevant descendant already had `min-w-0`/`truncate`
        correctly applied. Root-caused via runtime DOM measurement (an injected same-origin
        iframe at real narrow widths); confirmed fixed the same way — do not remove.
      */}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 flex flex-col gap-6">
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

        <div className="min-w-0 flex flex-col gap-4">
          <OrderSummary items={items} subtotal={subtotal} district={address.district} deliveryFees={deliveryFees} />

          {formError && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-small text-red-700">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex h-13 w-full items-center justify-center rounded-full bg-accent text-body font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Placing Order…" : "Place Order"}
          </button>
          <p className="-mt-2 text-center text-xs text-foreground/60">Cash on Delivery available — pay when your order arrives.</p>
        </div>
      </div>
    </form>
  );
}
