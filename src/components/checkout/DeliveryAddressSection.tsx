import { bangladeshDivisionNames, getDistrictsForDivision, getUpazilasForDistrict } from "@/data/bangladesh-locations";

export interface DeliveryAddressValue {
  division: string;
  district: string;
  upazila: string;
  addressLine: string;
  landmark: string;
  notes: string;
}

interface DeliveryAddressSectionProps {
  value: DeliveryAddressValue;
  onChange: (value: DeliveryAddressValue) => void;
  errors: Partial<Record<keyof DeliveryAddressValue, string>>;
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "text-small font-medium text-foreground";

/**
 * Division → District → Upazila/Thana are dependent selects backed by the
 * verified hierarchy in `src/data/bangladesh-locations.ts` (8 divisions, 64
 * districts, 544 upazila/thana entries — see that file's doc comment for
 * sourcing; Dhaka district's 55 entries include its 5 rural upazilas plus
 * the 50 Dhaka Metropolitan Police thanas). District/Upazila reset
 * whenever their parent changes, and stay disabled until a parent is
 * picked, so a stale combination can never be submitted from the UI —
 * `order-schema.ts` re-validates the combination server-side regardless,
 * since a client can submit whatever it wants. Area/Village/Road/House
 * stays free text — that level of detail isn't in any administrative
 * dataset. Delivery fee is computed server-side from `district` — see
 * `src/utils/delivery.ts`.
 */
export function DeliveryAddressSection({ value, onChange, errors }: DeliveryAddressSectionProps) {
  const districts = value.division ? getDistrictsForDivision(value.division) : [];
  const upazilas = value.division && value.district ? getUpazilasForDistrict(value.division, value.district) : [];

  function handleDivisionChange(division: string) {
    onChange({ ...value, division, district: "", upazila: "" });
  }

  function handleDistrictChange(district: string) {
    onChange({ ...value, district, upazila: "" });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-h3 text-foreground">Delivery Address</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="checkout-division" className={labelClass}>
            Division
          </label>
          <select
            id="checkout-division"
            required
            value={value.division}
            onChange={(event) => handleDivisionChange(event.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Select division
            </option>
            {bangladeshDivisionNames.map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>
          {errors.division && <p className="text-xs text-red-600">{errors.division}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="checkout-district" className={labelClass}>
            District
          </label>
          <select
            id="checkout-district"
            required
            disabled={!value.division}
            value={value.district}
            onChange={(event) => handleDistrictChange(event.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Select district
            </option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
          {errors.district && <p className="text-xs text-red-600">{errors.district}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="checkout-upazila" className={labelClass}>
            Upazila / Thana
          </label>
          <select
            id="checkout-upazila"
            required
            disabled={!value.district}
            value={value.upazila}
            onChange={(event) => onChange({ ...value, upazila: event.target.value })}
            className={inputClass}
          >
            <option value="" disabled>
              Select upazila / thana
            </option>
            {upazilas.map((upazila) => (
              <option key={upazila} value={upazila}>
                {upazila}
              </option>
            ))}
          </select>
          {errors.upazila && <p className="text-xs text-red-600">{errors.upazila}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="checkout-landmark" className={labelClass}>
            Landmark <span className="font-normal text-foreground/70">(optional)</span>
          </label>
          <input
            id="checkout-landmark"
            type="text"
            value={value.landmark}
            onChange={(event) => onChange({ ...value, landmark: event.target.value })}
            className={inputClass}
          />
          {errors.landmark && <p className="text-xs text-red-600">{errors.landmark}</p>}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="checkout-address-line" className={labelClass}>
            Area / Village / Road / House
          </label>
          <input
            id="checkout-address-line"
            type="text"
            required
            value={value.addressLine}
            onChange={(event) => onChange({ ...value, addressLine: event.target.value })}
            className={inputClass}
          />
          {errors.addressLine && <p className="text-xs text-red-600">{errors.addressLine}</p>}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="checkout-notes" className={labelClass}>
            Delivery Notes <span className="font-normal text-foreground/70">(optional)</span>
          </label>
          <textarea
            id="checkout-notes"
            rows={2}
            value={value.notes}
            onChange={(event) => onChange({ ...value, notes: event.target.value })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
          {errors.notes && <p className="text-xs text-red-600">{errors.notes}</p>}
        </div>
      </div>

      <p className="mt-3 text-xs text-foreground/70">Delivery fee calculated based on delivery location.</p>
    </section>
  );
}
