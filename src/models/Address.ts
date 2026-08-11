import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const addressSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    label: { type: String, required: true, trim: true },
    recipientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    division: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    upazila: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    landmark: { type: String, default: null },
    notes: { type: String, default: null },
    isDefault: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

// At most one default address per customer — DB-level defense-in-depth alongside the
// application-level clearOtherDefaults() step in src/services/addresses.ts.
addressSchema.index({ userId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

export type AddressDocument = InferSchemaType<typeof addressSchema>;

export const AddressModel: Model<AddressDocument> = models.Address ?? model<AddressDocument>("Address", addressSchema);
