import type { PaymentMethod } from "@/types/order";

/**
 * Manual mobile payment numbers — read once from env so they live in
 * exactly one place rather than being hardcoded across components (mirrors
 * `brand.ts`'s config pattern). These are intentionally `NEXT_PUBLIC_*`:
 * the customer must see the number to send a manual payment to it, so it's
 * public by design, not a secret. If a number isn't configured, the
 * checkout UI must disable that method rather than show a blank/fabricated
 * number — see `isPaymentMethodConfigured`.
 */
export const manualPaymentMethods = {
  bkash: { label: "bKash", number: process.env.NEXT_PUBLIC_BKASH_NUMBER ?? null },
  nagad: { label: "Nagad", number: process.env.NEXT_PUBLIC_NAGAD_NUMBER ?? null },
  rocket: { label: "Rocket", number: process.env.NEXT_PUBLIC_ROCKET_NUMBER ?? null },
} as const;

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash_on_delivery: "Cash on Delivery",
  bkash: manualPaymentMethods.bkash.label,
  nagad: manualPaymentMethods.nagad.label,
  rocket: manualPaymentMethods.rocket.label,
};

/** `cash_on_delivery` needs no configured number, so it's always available. */
export function isPaymentMethodConfigured(method: PaymentMethod): boolean {
  if (method === "cash_on_delivery") return true;
  return manualPaymentMethods[method].number !== null;
}
