import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    parentSlug: { type: String, default: null, index: true },
  },
  { timestamps: true },
);

export type CategoryDocument = InferSchemaType<typeof categorySchema>;

export const CategoryModel: Model<CategoryDocument> =
  models.Category ?? model<CategoryDocument>("Category", categorySchema);
