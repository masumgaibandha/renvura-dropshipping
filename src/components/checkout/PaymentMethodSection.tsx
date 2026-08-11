import { isPaymentMethodConfigured, manualPaymentMethods, paymentMethodLabels } from "@/config/payment";
import type { PaymentMethod } from "@/types/order";

interface PaymentMethodSectionProps {
  method: PaymentMethod;
  transactionId: string;
  onMethodChange: (method: PaymentMethod) => void;
  onTransactionIdChange: (value: string) => void;
  transactionIdError?: string;
}

const PAYMENT_METHODS: PaymentMethod[] = ["cash_on_delivery", "bkash", "nagad", "rocket"];

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * There is no payment API yet — manual methods only collect a Transaction
 * ID and land in `pending_verification`; this UI never claims automatic
 * verification. A method with no configured public number (see
 * `src/config/payment.ts`) is shown disabled rather than with a blank/
 * fabricated number.
 */
export function PaymentMethodSection({ method, transactionId, onMethodChange, onTransactionIdChange, transactionIdError }: PaymentMethodSectionProps) {
  const isManual = method !== "cash_on_delivery";
  const manualConfig = isManual ? manualPaymentMethods[method] : null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-h3 text-foreground">Payment Method</h2>

      <div className="mt-4 flex flex-col gap-2">
        {PAYMENT_METHODS.map((option) => {
          const configured = isPaymentMethodConfigured(option);
          return (
            <label
              key={option}
              className={`flex items-center gap-3 rounded-lg border p-3 text-small transition-colors ${
                method === option ? "border-accent bg-accent/5" : "border-border"
              } ${configured ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
            >
              <input
                type="radio"
                name="payment-method"
                value={option}
                checked={method === option}
                disabled={!configured}
                onChange={() => onMethodChange(option)}
                className="size-4 accent-accent"
              />
              <span className="font-medium text-foreground">{paymentMethodLabels[option]}</span>
              {!configured && <span className="ml-auto text-xs text-foreground/70">Temporarily unavailable</span>}
            </label>
          );
        })}
      </div>

      {method === "cash_on_delivery" ? (
        <p className="mt-4 text-small text-foreground/70">Pay in cash when your order is delivered.</p>
      ) : manualConfig?.number ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-surface-soft p-4">
          <p className="text-small text-foreground">
            Send the order total to this {manualConfig.label} number, then enter the Transaction ID below:
          </p>
          <p className="text-body font-semibold tabular-nums text-foreground">{manualConfig.number}</p>
          <p className="text-xs text-foreground/70">
            Your payment will be marked as <strong>awaiting verification</strong> until confirmed manually — there is no automatic gateway yet.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="checkout-transaction-id" className="text-small font-medium text-foreground">
              Transaction ID
            </label>
            <input
              id="checkout-transaction-id"
              type="text"
              required
              value={transactionId}
              onChange={(event) => onTransactionIdChange(event.target.value)}
              className={inputClass}
            />
            {transactionIdError && <p className="text-xs text-red-600">{transactionIdError}</p>}
          </div>
        </div>
      ) : null}
    </section>
  );
}
