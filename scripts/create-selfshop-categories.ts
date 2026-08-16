import mongoose from "mongoose";
import { loadEnvLocal } from "./load-env";

/**
 * Phase 19 — creates the new Renvura category/subcategory records needed by the expanded
 * `SELFSHOP_CATEGORY_MAP` (see src/lib/selfshop-import/categoryMapping.ts). Idempotent: skips any
 * slug that already exists rather than overwriting it. Hard-guarded to `renvura_sandbox` only —
 * aborts immediately if the resolved database is anything else. Never touches production.
 */

const EXPECTED_SANDBOX_DB = "renvura_sandbox";

const NEW_CATEGORIES: { slug: string; name: string; parentSlug: string | null; displayOrder: number }[] = [
  { slug: "electronics-device", name: "Electronics Devices", parentSlug: "electronics-gadgets", displayOrder: 1 },
  { slug: "fashion", name: "Fashion", parentSlug: null, displayOrder: 2 },
  { slug: "womens-fashion", name: "Women's Fashion", parentSlug: "fashion", displayOrder: 0 },
  { slug: "mens-fashion", name: "Men's Fashion", parentSlug: "fashion", displayOrder: 1 },
  { slug: "watches-bags-jewellery", name: "Watches, Bags & Jewellery", parentSlug: null, displayOrder: 3 },
  { slug: "home-lifestyle", name: "Home & Lifestyle", parentSlug: null, displayOrder: 4 },
  { slug: "home-appliances", name: "Home Appliances", parentSlug: "home-lifestyle", displayOrder: 0 },
  { slug: "gifts", name: "Gifts", parentSlug: "home-lifestyle", displayOrder: 1 },
  { slug: "mother-baby", name: "Mother & Baby", parentSlug: null, displayOrder: 5 },
  { slug: "sports-outdoors", name: "Sports & Outdoors", parentSlug: null, displayOrder: 6 },
  { slug: "automotive", name: "Automotive & Motorbike", parentSlug: null, displayOrder: 7 },
];

async function main() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("RESULT", JSON.stringify({ ok: false, reason: "MONGODB_URI not set" }));
    process.exit(1);
  }

  await mongoose.connect(uri, process.env.MONGODB_DB_NAME ? { dbName: process.env.MONGODB_DB_NAME } : undefined);
  const activeDb = mongoose.connection.db?.databaseName ?? null;
  if (activeDb !== EXPECTED_SANDBOX_DB) {
    console.error("RESULT", JSON.stringify({ ok: false, stage: "db_verify", activeDb, expected: EXPECTED_SANDBOX_DB }));
    await mongoose.disconnect();
    process.exit(1);
  }

  const { CategoryModel } = await import("../src/models/Category");

  const results: { slug: string; outcome: string }[] = [];
  for (const cat of NEW_CATEGORIES) {
    const existing = await CategoryModel.findOne({ slug: cat.slug }).lean();
    if (existing) {
      results.push({ slug: cat.slug, outcome: "ALREADY_EXISTS" });
      continue;
    }
    await CategoryModel.create({
      slug: cat.slug,
      name: cat.name,
      description: null,
      parentSlug: cat.parentSlug,
      isActive: true,
      displayOrder: cat.displayOrder,
    });
    results.push({ slug: cat.slug, outcome: "CREATED" });
  }

  console.log("RESULT", JSON.stringify({ ok: true, activeDb, results }, null, 2));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("RESULT", JSON.stringify({ ok: false, stage: "exception", reason: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
