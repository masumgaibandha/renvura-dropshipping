import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Phase 13 — maps Renvura's structured Bangladesh address (division/district/upazila, from
 * `src/data/bangladesh-locations.ts`) to a courier's own location ID system. Only Pathao needs
 * this today (its create-order API requires numeric city/zone/area IDs; Steadfast accepts a plain
 * address string, see `src/lib/courier/providers/steadfast.ts`) — kept provider-neutral in shape
 * so a future API-integrated provider with the same ID-based requirement doesn't need a new model.
 * Deliberately starts empty: this project has no verified Pathao location-list data (see CLAUDE.md's
 * Phase 13 section — Pathao's docs aren't publicly reachable), so no mapping is ever guessed. A
 * missing row for a given (provider, division, district, upazila) is a hard block on API shipment
 * creation for that provider, surfaced to admin as a precise "location mapping required" message
 * (see `src/services/courier.ts`), never a generic error and never a guessed ID.
 */
const courierLocationMappingSchema = new Schema(
  {
    provider: { type: String, enum: ["pathao"], required: true, index: true },
    renvuraDivision: { type: String, required: true, trim: true },
    renvuraDistrict: { type: String, required: true, trim: true },
    renvuraUpazila: { type: String, required: true, trim: true },
    providerCityId: { type: String, required: true },
    providerZoneId: { type: String, required: true },
    providerAreaId: { type: String, required: true },
    /** Set by whoever confirmed this mapping is correct against the provider's own location list — an operational sanity record, not enforced at read time. */
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

courierLocationMappingSchema.index({ provider: 1, renvuraDivision: 1, renvuraDistrict: 1, renvuraUpazila: 1 }, { unique: true });

export type CourierLocationMappingDocument = InferSchemaType<typeof courierLocationMappingSchema>;

export const CourierLocationMappingModel: Model<CourierLocationMappingDocument> =
  models.CourierLocationMapping ?? model<CourierLocationMappingDocument>("CourierLocationMapping", courierLocationMappingSchema);
