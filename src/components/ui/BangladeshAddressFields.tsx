import { bangladeshDivisionNames, getDistrictsForDivision, getUpazilasForDistrict } from "@/data/bangladesh-locations";

export interface BangladeshAddressValue {
  division: string;
  district: string;
  upazila: string;
  addressLine: string;
  landmark: string;
  notes: string;
}

interface BangladeshAddressFieldsProps {
  value: BangladeshAddressValue;
  onChange: (value: BangladeshAddressValue) => void;
  errors: Partial<Record<keyof BangladeshAddressValue, string>>;
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "text-small font-medium text-foreground";

/**
 * The Division → District → Upazila/Thana dependent selects (backed by
 * `src/data/bangladesh-locations.ts`) plus Area/Landmark/Notes — shared
 * between checkout (`DeliveryAddressSection.tsx`) and the saved-address
 * book (`AddressForm.tsx`) so this ~90-line field group exists once, not
 * twice. Each caller supplies its own wrapping heading/copy/section
 * chrome, since "Delivery fee calculated based on delivery location" is
 * checkout-specific framing that doesn't belong here.
 */
export function BangladeshAddressFields({ value, onChange, errors }: BangladeshAddressFieldsProps) {
  const districts = value.division ? getDistrictsForDivision(value.division) : [];
  const upazilas = value.division && value.district ? getUpazilasForDistrict(value.division, value.district) : [];

  function handleDivisionChange(division: string) {
    onChange({ ...value, division, district: "", upazila: "" });
  }

  function handleDistrictChange(district: string) {
    onChange({ ...value, district, upazila: "" });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bd-address-division" className={labelClass}>
          Division
        </label>
        <select
          id="bd-address-division"
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
        <label htmlFor="bd-address-district" className={labelClass}>
          District
        </label>
        <select
          id="bd-address-district"
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
        <label htmlFor="bd-address-upazila" className={labelClass}>
          Upazila / Thana
        </label>
        <select
          id="bd-address-upazila"
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
        <label htmlFor="bd-address-landmark" className={labelClass}>
          Landmark <span className="font-normal text-foreground/70">(optional)</span>
        </label>
        <input
          id="bd-address-landmark"
          type="text"
          value={value.landmark}
          onChange={(event) => onChange({ ...value, landmark: event.target.value })}
          className={inputClass}
        />
        {errors.landmark && <p className="text-xs text-red-600">{errors.landmark}</p>}
      </div>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="bd-address-line" className={labelClass}>
          Area / Village / Road / House
        </label>
        <input
          id="bd-address-line"
          type="text"
          required
          value={value.addressLine}
          onChange={(event) => onChange({ ...value, addressLine: event.target.value })}
          className={inputClass}
        />
        {errors.addressLine && <p className="text-xs text-red-600">{errors.addressLine}</p>}
      </div>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="bd-address-notes" className={labelClass}>
          Delivery Notes <span className="font-normal text-foreground/70">(optional)</span>
        </label>
        <textarea
          id="bd-address-notes"
          rows={2}
          value={value.notes}
          onChange={(event) => onChange({ ...value, notes: event.target.value })}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-small text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        {errors.notes && <p className="text-xs text-red-600">{errors.notes}</p>}
      </div>
    </div>
  );
}
