import { BangladeshAddressFields, type BangladeshAddressValue } from "@/components/ui/BangladeshAddressFields";

export type DeliveryAddressValue = BangladeshAddressValue;

interface DeliveryAddressSectionProps {
  value: DeliveryAddressValue;
  onChange: (value: DeliveryAddressValue) => void;
  errors: Partial<Record<keyof DeliveryAddressValue, string>>;
}

/**
 * Checkout-specific wrapper around the shared `BangladeshAddressFields`
 * (Division → District → Upazila/Thana dependent selects, backed by
 * `src/data/bangladesh-locations.ts` — 8 divisions, 64 districts, 544
 * upazila/thana entries including Dhaka's 50 metropolitan thanas; see that
 * file's doc comment for sourcing) — adds the checkout-only heading and
 * delivery-fee note. `src/components/account/AddressForm.tsx` composes the
 * same shared fields for the saved-address book, with its own framing.
 * `order-schema.ts` re-validates the combination server-side regardless,
 * since a client can submit whatever it wants. Delivery fee is computed
 * server-side from `district` — see `src/utils/delivery.ts`.
 */
export function DeliveryAddressSection({ value, onChange, errors }: DeliveryAddressSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-h3 text-foreground">Delivery Address</h2>
      <div className="mt-4">
        <BangladeshAddressFields value={value} onChange={onChange} errors={errors} />
      </div>
      <p className="mt-3 text-xs text-foreground/70">Delivery fee calculated based on delivery location.</p>
    </section>
  );
}
