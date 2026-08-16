import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";

/**
 * Two-database connection helper for `scripts/migrate-catalog-to-production.ts` (Phase 22).
 *
 * Both connections share the exact same underlying `MONGODB_URI` (read once from `.env.local`) —
 * the sandbox/production split is made by explicitly overriding `dbName` per connection in code,
 * never by relying on whatever `.env.local`'s own `MONGODB_DB_NAME` currently happens to say. This
 * is deliberate: `.env.local`'s `MONGODB_DB_NAME` is operator-editable (it was pointed at
 * `renvura_sandbox` for Phases 16–21, then repointed at `renvura` for Phase 22's production work),
 * so trusting it at runtime would make which database a connection actually lands on depend on
 * whatever that file said *at the moment this script happened to run* — exactly the kind of
 * ambiguity a production-write tool must never have. Hardcoding `dbName: "renvura_sandbox"` and
 * `dbName: "renvura"` here means the source/destination assignment is fixed by the code itself,
 * not by file state, and each connection still independently asserts its resolved database name
 * matches before returning — defense in depth on top of the explicit override.
 *
 * Never logs, prints, or otherwise exposes the URI itself — only the resolved database name.
 */

const EXPECTED_SANDBOX_DB = "renvura_sandbox";
const EXPECTED_PRODUCTION_DB = "renvura";

function readMongoUri(): string {
  let contents: string;
  try {
    contents = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    throw new Error(".env.local not found");
  }
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== "MONGODB_URI") continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value;
  }
  throw new Error("MONGODB_URI not found in .env.local");
}

export interface MigrationDbHandle {
  connection: mongoose.Connection;
  databaseName: string;
}

async function connectWithDbName(dbName: string, expected: string): Promise<MigrationDbHandle> {
  const uri = readMongoUri();
  const connection = await mongoose.createConnection(uri, { dbName }).asPromise();
  const databaseName = connection.db?.databaseName ?? "";
  if (databaseName !== expected) {
    await connection.close();
    throw new Error(`Connection with dbName override "${dbName}" resolved to unexpected database "${databaseName}" (expected "${expected}") — refusing to proceed.`);
  }
  return { connection, databaseName };
}

/** Opens a dedicated connection explicitly overridden to `renvura_sandbox`, regardless of what `.env.local`'s own `MONGODB_DB_NAME` currently says. */
export async function connectSandbox(): Promise<MigrationDbHandle> {
  return connectWithDbName(EXPECTED_SANDBOX_DB, EXPECTED_SANDBOX_DB);
}

/** Opens a dedicated connection explicitly overridden to production `renvura`, regardless of what `.env.local`'s own `MONGODB_DB_NAME` currently says. */
export async function connectProduction(): Promise<MigrationDbHandle> {
  return connectWithDbName(EXPECTED_PRODUCTION_DB, EXPECTED_PRODUCTION_DB);
}
