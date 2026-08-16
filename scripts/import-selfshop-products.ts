import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import mongoose from "mongoose";

import { loadEnvLocal } from "./load-env";

/**
 * Reusable SelfShop manifest importer (Phase 17) — replaces the one-off, hardcoded pilot script.
 * Takes a manifest file path and imports/reconciles every entry through
 * `src/lib/selfshop-import/importer.ts`. Always targets `renvura_sandbox` (asserted below) — no
 * production migration mode exists yet; that stays a separate, deliberate future action, per this
 * phase's own scope.
 *
 * Usage:
 *   npx tsx scripts/import-selfshop-products.ts data/selfshop-imports/<batch>.json [--dry-run]
 *
 * --dry-run computes and reports every outcome without writing anything (no image downloads, no
 * Mongo writes) — safe to run against real or hypothetical manifests to preview what would happen.
 */

const EXPECTED_SANDBOX_DB = "renvura_sandbox";

async function main() {
  loadEnvLocal();

  const manifestPath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!manifestPath) {
    console.error("Usage: tsx scripts/import-selfshop-products.ts <manifest.json> [--dry-run]");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("RESULT", JSON.stringify({ ok: false, stage: "config", reason: "MONGODB_URI not set" }));
    process.exit(1);
  }

  await mongoose.connect(uri, process.env.MONGODB_DB_NAME ? { dbName: process.env.MONGODB_DB_NAME } : undefined);
  const activeDb = mongoose.connection.db?.databaseName ?? null;

  if (activeDb !== EXPECTED_SANDBOX_DB) {
    console.error(
      "RESULT",
      JSON.stringify({ ok: false, stage: "db_verify", activeDb, expected: EXPECTED_SANDBOX_DB, reason: "No production migration mode exists — this importer only ever targets renvura_sandbox." }),
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const raw = readFileSync(resolve(process.cwd(), manifestPath), "utf8");
  const manifest = JSON.parse(raw);
  if (!Array.isArray(manifest)) {
    console.error("RESULT", JSON.stringify({ ok: false, stage: "manifest_parse", reason: "Manifest must be a JSON array." }));
    await mongoose.disconnect();
    process.exit(1);
  }

  const { importEntry } = await import("../src/lib/selfshop-import/importer");

  const outcomes = [];
  for (const entry of manifest) {
    outcomes.push(await importEntry(entry, { dryRun }));
  }

  console.log("RESULT", JSON.stringify({ ok: true, activeDb, dryRun, manifestPath, count: outcomes.length, outcomes }, null, 2));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("RESULT", JSON.stringify({ ok: false, stage: "exception", reason: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
