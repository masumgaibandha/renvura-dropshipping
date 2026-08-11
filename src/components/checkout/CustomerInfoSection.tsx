export interface CustomerInfoValue {
  name: string;
  phone: string;
  email: string;
}

interface CustomerInfoSectionProps {
  value: CustomerInfoValue;
  onChange: (value: CustomerInfoValue) => void;
  errors: Partial<Record<keyof CustomerInfoValue, string>>;
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const labelClass = "text-small font-medium text-foreground";

/** Full name, mobile number (validated/normalized server-side), optional email — never required. */
export function CustomerInfoSection({ value, onChange, errors }: CustomerInfoSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-h3 text-foreground">Customer Information</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="checkout-name" className={labelClass}>
            Full Name
          </label>
          <input
            id="checkout-name"
            type="text"
            required
            autoComplete="name"
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            className={inputClass}
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="checkout-phone" className={labelClass}>
            Mobile Number
          </label>
          <input
            id="checkout-phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            value={value.phone}
            onChange={(event) => onChange({ ...value, phone: event.target.value })}
            className={inputClass}
          />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="checkout-email" className={labelClass}>
            Email <span className="font-normal text-foreground/70">(optional)</span>
          </label>
          <input
            id="checkout-email"
            type="email"
            autoComplete="email"
            value={value.email}
            onChange={(event) => onChange({ ...value, email: event.target.value })}
            className={inputClass}
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
        </div>
      </div>
    </section>
  );
}
