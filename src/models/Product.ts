import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const pricingSchema = new Schema(
  {
    currency: { type: String, enum: ["BDT"], default: "BDT", required: true },
    wholesalePrice: { type: Number, default: null, min: 0 },
    regularPrice: { type: Number, default: null, min: 0 },
    sellingPrice: { type: Number, default: null, min: 0 },
    discountPercentage: { type: Number, default: null, min: 0, max: 100 },
  },
  { _id: false },
);

const bulkPriceTierSchema = new Schema(
  {
    minQuantity: { type: Number, required: true, min: 1 },
    maxQuantity: { type: Number, default: null },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const mediaSchema = new Schema(
  {
    thumbnail: { type: String, default: null },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
  },
  { _id: false },
);

const inventorySchema = new Schema(
  {
    stock: { type: Number, default: null, min: 0 },
    unit: { type: String, default: null },
    status: {
      type: String,
      enum: ["in_stock", "out_of_stock", "unknown"],
      default: "unknown",
      required: true,
    },
  },
  { _id: false },
);

const variantSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    sku: { type: String, default: null },
    price: { type: Number, default: null, min: 0 },
    attributes: { type: Map, of: String, default: undefined },
  },
  { _id: false },
);

const specificationSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

const seoSchema = new Schema(
  {
    metaTitle: { type: String, default: null },
    metaDescription: { type: String, default: null },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    shortDescription: { type: String, default: null },
    description: { type: String, default: null },

    category: { type: String, required: true, index: true },
    subcategory: { type: String, default: null, index: true },

    brand: { type: String, default: null, index: true },
    model: { type: String, default: null },
    sku: { type: String, default: null },

    pricing: { type: pricingSchema, required: true },
    bulkPricing: { type: [bulkPriceTierSchema], default: undefined },

    media: { type: mediaSchema, required: true },
    inventory: { type: inventorySchema, required: true },

    variants: { type: [variantSchema], default: undefined },
    features: { type: [String], default: undefined },
    specifications: { type: [specificationSchema], default: undefined },

    seo: { type: seoSchema, default: undefined },
    status: {
      type: String,
      enum: ["draft", "active", "inactive"],
      default: "draft",
      required: true,
      index: true,
    },
    tags: { type: [String], default: undefined, index: true },
  },
  { timestamps: true },
);

// sku is optional (many source products have no confirmed SKU yet), so the
// index must be sparse to avoid collisions between multiple null values.
productSchema.index({ sku: 1 }, { sparse: true });
productSchema.index({ category: 1, subcategory: 1 });

export type ProductDocument = InferSchemaType<typeof productSchema>;

export const ProductModel: Model<ProductDocument> =
  models.Product ?? model<ProductDocument>("Product", productSchema);
