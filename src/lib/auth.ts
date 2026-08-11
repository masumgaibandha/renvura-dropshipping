import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";

/**
 * Better Auth has no official Mongoose adapter — only the native MongoDB
 * driver — so this is a second driver instance pointed at the *same*
 * `renvura` database as the Mongoose connection in `src/lib/db.ts`, not a
 * second database. Cached on `globalThis` for the same reason
 * `connectToDatabase()` is: Next.js dev hot-reload would otherwise open a
 * fresh client on every edit.
 */

declare global {
  var __renvuraAuthMongoClient: MongoClient | undefined;
}

function getMongoClient(): MongoClient {
  if (globalThis.__renvuraAuthMongoClient) {
    return globalThis.__renvuraAuthMongoClient;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set — add it to your environment before any code path that touches the database.");
  }

  const client = new MongoClient(uri);
  globalThis.__renvuraAuthMongoClient = client;
  return client;
}

const client = getMongoClient();
const db = client.db(process.env.MONGODB_DB_NAME);

/**
 * Email + password only for now (per the brief — no social/OTP login),
 * kept extensible: adding a provider later is a `socialProviders` entry
 * here, not an architectural change. `phone` is the one customer field
 * this app needs beyond Better Auth's defaults (id/name/email/emailVerified/
 * image/createdAt/updatedAt) — added via `additionalFields` rather than a
 * separate Customer collection, so it appears automatically on
 * `session.user.phone` with no extra querying.
 *
 * Rate limiting is enabled and layered on top of Better Auth's own
 * defaults (100 req/60s globally, already tightened to 3 req/10s for
 * `/sign-in/email` out of the box) with a matching custom rule added for
 * `/sign-up/email`. Like `src/lib/rate-limit.ts`, this is in-memory and
 * process-local — see CLAUDE.md for the same documented production caveat.
 */
export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
      },
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 10, max: 3 },
      "/sign-up/email": { window: 10, max: 3 },
    },
  },
  plugins: [nextCookies()],
});
