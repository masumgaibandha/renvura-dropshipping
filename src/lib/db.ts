import mongoose, { type Mongoose } from "mongoose";

/**
 * MongoDB Atlas connection helper — required env: `MONGODB_URI` (never sent
 * to the client, never logged). `MONGODB_DB_NAME` is optional.
 *
 * The connection is cached on `globalThis` rather than a plain module-level
 * variable: in dev, Next.js hot-reloads route modules on every edit, which
 * would otherwise open a fresh connection per edit; in serverless
 * production, the same module instance is frequently reused across
 * invocations, and reusing one connection instead of reconnecting per
 * request is the standard, documented Mongoose-on-serverless pattern.
 */

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  var __renvuraMongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = globalThis.__renvuraMongooseCache ?? { conn: null, promise: null };
globalThis.__renvuraMongooseCache = cache;

export async function connectToDatabase(): Promise<Mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not set — add it to your environment before any code path that touches the database.");
    }

    const dbName = process.env.MONGODB_DB_NAME;
    cache.promise = mongoose.connect(uri, dbName ? { dbName } : undefined);
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Let the next call retry a fresh connection attempt instead of caching a failed promise forever.
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}
