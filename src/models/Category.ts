import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    parentSlug: { type: String, default: null, index: true },
    // Phase 10: admin activate/deactivate. Inactive categories are hidden
    // from storefront navigation/filters but existing products keep their
    // category reference (deactivating is not the same as deleting).
    isActive: { type: Boolean, default: true, required: true, index: true },
    // Admin-controlled ordering for homepage category highlights (Phase 10).
    displayOrder: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
);

export type CategoryDocument = InferSchemaType<typeof categorySchema>;

export const CategoryModel: Model<CategoryDocument> =
  models.Category ?? model<CategoryDocument>("Category", categorySchema);
