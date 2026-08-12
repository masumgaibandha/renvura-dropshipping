import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Singleton store configuration (Phase 10). Exactly one document ever
 * exists, keyed by the fixed `singletonKey: "store"` — `getStoreSettings()`
 * in `src/services/settings.ts` upserts it into existence on first read
 * rather than requiring a separate seed step. Only operational fields the
 * business actually wants live-editable through /admin/settings live here;
 * secrets (API keys, `BETTER_AUTH_SECRET`, `MONGODB_URI`) are deliberately
 * never migrated from env vars into this collection — see CLAUDE.md's
 * "don't migrate environment secrets into DB" rule. Manual payment numbers
 * (`NEXT_PUBLIC_BKASH_NUMBER` etc.) also stay env-only, not duplicated
 * here, so there's exactly one source for them, not two that could drift.
 */
const storeSettingsSchema = new Schema(
  {
    singletonKey: { type: String, required: true, unique: true, default: "store" },

    storeName: { type: String, required: true, default: "Renvura" },
    supportEmail: { type: String, default: null },
    supportPhone: { type: String, default: null },

    insideDhakaDeliveryFee: { type: Number, required: true, min: 0 },
    outsideDhakaDeliveryFee: { type: Number, required: true, min: 0 },

    lowStockThreshold: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

export type StoreSettingsDocument = InferSchemaType<typeof storeSettingsSchema>;

export const StoreSettingsModel: Model<StoreSettingsDocument> =
  models.StoreSettings ?? model<StoreSettingsDocument>("StoreSettings", storeSettingsSchema);
