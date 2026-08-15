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
    // Phase 13: parcel weight for courier API shipment creation (Pathao/Steadfast both require a
    // weight). `null` for every product today — the source screenshots this catalog was extracted
    // from never captured a verified physical weight, and this codebase's own rule is to never
    // invent a number the source data doesn't support (see CLAUDE.md's "Weight" note). Real API
    // shipment creation for a product with `shippingWeightGrams: null` is a hard block, not a
    // fallback to a guessed default — see `src/services/courier.ts`.
    shippingWeightGrams: { type: Number, default: null, min: 0 },
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

/**
 * Provenance back to `resources/products/` for catalog entries that were
 * extracted from supplier screenshots (Phase 2/10 migration) — see
 * `ProductSourceProvenance` in `src/types/product.ts`. Optional and absent
 * for any product created directly through the admin (Phase 10+), which
 * has no supplier-screenshot source to trace back to.
 */
const sourceProvenanceSchema = new Schema(
  {
    sourceFolder: { type: String, required: true },
    sourceScreenshot: { type: String, required: true },
    sourceImages: { type: [String], default: [] },
    sourceMarketplace: { type: String, required: true },
    sourceSellerId: { type: String, default: null },
    verifiedAt: { type: String, required: true },
    dataQualityNotes: { type: [String], default: undefined },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    // Deliberately equal to `slug` (never a separate generated id) — the
    // 21 migrated catalog products already have `id === slug` everywhere
    // (localStorage carts/wishlists persist this value as `productId`), so
    // keeping `id` derived from `slug` rather than introducing a Mongo
    // ObjectId-based id preserves every existing client-side reference.
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

    // Phase 10: admin-controlled homepage placement — never set by any
    // storefront/customer-facing code path, only /admin/homepage.
    featured: { type: Boolean, default: false, required: true, index: true },

    source: { type: sourceProvenanceSchema, default: undefined },
  },
  { timestamps: true },
);

// sku is optional (many source products have no confirmed SKU yet), so the
// index must be sparse to avoid collisions between multiple null values.
productSchema.index({ sku: 1 }, { sparse: true });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ status: 1, featured: 1 });

export type ProductDocument = InferSchemaType<typeof productSchema>;

export const ProductModel: Model<ProductDocument> =
  models.Product ?? model<ProductDocument>("Product", productSchema);
