import mongoose from "mongoose";

import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { CategoryModel } from "@/models/Category";
import { ProductModel } from "@/models/Product";

import { loadEnvLocal } from "./load-env";

/**
 * One-time Phase 10 migration: moves the verified catalog from the static
 * `src/data/products.ts` / `src/data/categories.ts` seed data into
 * MongoDB (`ProductModel`/`CategoryModel`), which is what
 * `src/services/products.ts` reads from as of this phase. `src/data/*` stays
 * in the repo as the original, human-verified source-of-truth record (every
 * `source.*` provenance field traces back to `resources/products/`) — this
 * script is how that verified data gets into the database Admin/storefront
 * actually query, not a replacement for it.
 *
 * Upserts by `slug`, and by default never overwrites a product/category
 * that already exists in the DB (so re-running this after an admin has
 * edited stock/price/etc. through /admin doesn't clobber their changes).
 * Pass --force to overwrite existing documents back to the seed values —
 * only intended for pre-launch development, never after go-live.
 *
 * Business-correct status mapping: a product only becomes purchasable
 * ("active") if it already has an approved `sellingPrice`; the one
 * withheld product (`skin1004-centella-ampoule-100ml`, sellingPrice still
 * null) seeds as "draft" so the storefront continues to hide it, matching
 * documented Phase 9 status. Every product also seeds `featured: false` —
 * homepage placement is chosen through /admin/homepage from this phase on,
 * not by array position.
 *
 * Usage: npm run seed:catalog [-- --force]
 */

async function main() {
  loadEnvLocal();
  const force = process.argv.includes("--force");

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local first.");
    process.exit(1);
  }

  await mongoose.connect(uri, process.env.MONGODB_DB_NAME ? { dbName: process.env.MONGODB_DB_NAME } : undefined);

  let categoriesCreated = 0;
  let categoriesSkipped = 0;
  for (const category of categories) {
    const existing = await CategoryModel.findOne({ slug: category.slug });
    if (existing && !force) {
      categoriesSkipped++;
      continue;
    }
    await CategoryModel.findOneAndUpdate(
      { slug: category.slug },
      {
        slug: category.slug,
        name: category.name,
        description: category.description ?? null,
        parentSlug: category.parentSlug ?? null,
        isActive: category.isActive,
        displayOrder: category.displayOrder,
      },
      { upsert: true },
    );
    categoriesCreated++;
  }

  let productsCreated = 0;
  let productsSkipped = 0;
  for (const record of products) {
    const { product, source } = record;

    const existing = await ProductModel.findOne({ slug: product.slug });
    if (existing && !force) {
      productsSkipped++;
      continue;
    }

    const status = product.pricing.sellingPrice !== null ? "active" : "draft";

    await ProductModel.findOneAndUpdate(
      { slug: product.slug },
      {
        slug: product.slug,
        title: product.title,
        shortDescription: product.shortDescription ?? null,
        description: product.description,
        category: product.category,
        subcategory: product.subcategory ?? null,
        brand: product.brand ?? null,
        model: product.model ?? null,
        sku: product.sku,
        pricing: product.pricing,
        bulkPricing: product.bulkPricing,
        media: product.media,
        inventory: product.inventory,
        variants: product.variants,
        features: product.features,
        specifications: product.specifications,
        seo: product.seo,
        status,
        tags: product.tags,
        featured: false,
        source,
      },
      { upsert: true },
    );
    productsCreated++;
  }

  console.log(`Categories: ${categoriesCreated} written, ${categoriesSkipped} skipped (already existed).`);
  console.log(`Products: ${productsCreated} written, ${productsSkipped} skipped (already existed).`);
  if (!force && (categoriesSkipped > 0 || productsSkipped > 0)) {
    console.log("Pass --force to overwrite existing documents with seed values.");
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
