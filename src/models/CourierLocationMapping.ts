import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Phase 13 — maps Renvura's structured Bangladesh address (division/district/upazila, from
 * `src/data/bangladesh-locations.ts`) to a courier's own location ID system. Only Pathao accepts
 * these today (Steadfast accepts a plain address string, see
 * `src/lib/courier/providers/steadfast.ts`) — kept provider-neutral in shape so a future
 * API-integrated provider with the same ID-based requirement doesn't need a new model.
 * Deliberately starts empty: the official Cities/zones/areas lookup endpoints ARE implemented
 * (`getPathaoCities()`/`getPathaoZones()`/`getPathaoAreas()` in `src/lib/courier/providers/
 * pathao.ts`, live-verified against Pathao's sandbox), but nothing populates this table
 * automatically — resolving and persisting a mapping is a deliberate one-time step for a specific
 * address (see how the pickup store's own Gaibandha/Saghata/Bonarpara IDs were resolved this way),
 * not a bulk sync of Pathao's entire location tree. A missing row is **not** a shipment-creation
 * blocker — Pathao's officially verified Create Order contract documents
 * `recipient_city`/`recipient_zone`/`recipient_area` as optional, auto-resolved from
 * `recipient_address` when omitted (see `src/services/courier.ts`'s `resolvePathaoLocation()`).
 * A verified mapping, once this table is populated, is sent for precision only, never guessed.
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
