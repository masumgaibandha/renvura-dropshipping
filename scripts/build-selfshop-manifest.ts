import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import mongoose from "mongoose";

import { loadEnvLocal } from "./load-env";

/**
 * Reusable bulk manifest builder CLI (Phase 18). Classifies a batch of normalized SelfShop product
 * data and produces a Phase-17-compatible manifest plus an exception report — never writes to
 * MongoDB (the optional catalog read below is read-only, used only to enrich potential-duplicate
 * detection against titles already in the database).
 *
 * Usage:
 *   npm run selfshop:build-manifest -- <input.json> <output.json>
 *
 * <input.json> is a JSON array of `SelfShopRawProduct` (see src/lib/selfshop-import/types.ts) —
 * normalized data a human/Claude read off SelfShop's logged-in pages, never invented.
 * <output.json> receives the qualified, Phase-17-compatible manifest (IMPORTABLE +
 * IMPORTABLE_WITH_WARNINGS only). An exception report (everything else, plus potential duplicates
 * and any processing errors) is written alongside it as <output>.exceptions.json.
 */

async function main() {
  loadEnvLocal();

  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    console.error("Usage: tsx scripts/build-selfshop-manifest.ts <input.json> <output.json>");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(resolve(process.cwd(), inputPath), "utf8"));
  if (!Array.isArray(raw)) {
    console.error("RESULT", JSON.stringify({ ok: false, reason: "Input must be a JSON array of SelfShopRawProduct." }));
    process.exit(1);
  }

  // Best-effort, read-only catalog-title fetch for cross-catalog potential-duplicate detection.
  // Never writes; if it fails for any reason, proceed with in-batch comparison only.
  let existingCatalogTitles: { slug: string; title: string }[] = [];
  try {
    const uri = process.env.MONGODB_URI;
    if (uri) {
      await mongoose.connect(uri, process.env.MONGODB_DB_NAME ? { dbName: process.env.MONGODB_DB_NAME } : undefined);
      const { ProductModel } = await import("../src/models/Product");
      existingCatalogTitles = await ProductModel.find().select({ slug: 1, title: 1 }).lean();
      await mongoose.disconnect();
    }
  } catch {
    existingCatalogTitles = [];
    try {
      await mongoose.disconnect();
    } catch {
      // already disconnected
    }
  }

  const { buildSelfShopManifest } = await import("../src/lib/selfshop-import/manifestBuilder");
  const result = buildSelfShopManifest(raw, existingCatalogTitles);

  writeFileSync(resolve(process.cwd(), outputPath), JSON.stringify(result.qualified, null, 2));
  const exceptionsPath = outputPath.replace(/\.json$/, ".exceptions.json");
  writeFileSync(
    resolve(process.cwd(), exceptionsPath),
    JSON.stringify({ exceptions: result.exceptions, potentialDuplicates: result.potentialDuplicates, exactDuplicatesWithinBatch: result.exactDuplicatesWithinBatch, processingErrors: result.summary.processingErrors }, null, 2),
  );

  console.log(
    "RESULT",
    JSON.stringify(
      {
        ok: true,
        totalInput: result.summary.totalInput,
        qualifiedCount: result.qualified.length,
        byStatus: result.summary.byStatus,
        potentialDuplicateCount: result.potentialDuplicates.length,
        exactDuplicatesWithinBatch: result.exactDuplicatesWithinBatch,
        processingErrors: result.summary.processingErrors,
        manifestWritten: outputPath,
        exceptionsWritten: exceptionsPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("RESULT", JSON.stringify({ ok: false, stage: "exception", reason: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
