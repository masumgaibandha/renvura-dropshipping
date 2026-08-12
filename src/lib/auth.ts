import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";

import { normalizeBdPhone } from "@/utils/phone";

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
 * Read-only escape hatch to Better Auth's native `user` collection for
 * server code that needs to query across many users at once (Phase 10:
 * `src/services/customers.ts`'s admin customer list/detail) — Better
 * Auth's own API only fetches one session/user at a time, and there's no
 * Mongoose model for `user` since Better Auth owns that collection.
 * Reuses this same cached client/db rather than opening a second
 * connection. Never used to write — all writes to `user` go through
 * Better Auth's API, except the one deliberate exception in
 * `scripts/promote-admin.ts`.
 */
export const authDb = db;

/**
 * Server-side counterpart to `ProfileForm.tsx`'s client-side phone check —
 * closes the gap where a direct API call (bypassing the UI) could
 * previously store an unnormalized/invalid phone value. Reuses the exact
 * same `normalizeBdPhone` checkout already validates against, so "valid
 * phone" means the same thing everywhere in this app. An empty string is
 * treated as "clear the phone" (allowed, not a format error) — matches
 * `ProfileForm.tsx` sending `phone: ""` when the field is left blank.
 * Returns the object unchanged when `phone` isn't part of this
 * create/update payload at all.
 */
function normalizePhoneField(fields: Record<string, unknown>): Record<string, unknown> {
  if (typeof fields.phone !== "string" || fields.phone.length === 0) {
    return fields;
  }

  const normalized = normalizeBdPhone(fields.phone);
  if (!normalized) {
    throw new APIError("BAD_REQUEST", { message: "Enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX)." });
  }

  return { ...fields, phone: normalized };
}

/**
 * Email + password only for now (per the brief — no social/OTP login),
 * kept extensible: adding a provider later is a `socialProviders` entry
 * here, not an architectural change. `phone` is the one customer field
 * this app needs beyond Better Auth's defaults (id/name/email/emailVerified/
 * image/createdAt/updatedAt) — added via `additionalFields` rather than a
 * separate Customer collection, so it appears automatically on
 * `session.user.phone` with no extra querying. `databaseHooks` enforces BD
 * phone format server-side on both sign-up and profile updates (Phase
 * 9.1) — `normalizePhoneField` below, reusing `normalizeBdPhone` — so a
 * direct API call bypassing `SignupForm.tsx`/`ProfileForm.tsx`'s own
 * client-side checks still can't store an invalid value.
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
      /**
       * `input: false` removes this field from every client-reachable
       * schema (sign-up, `authClient.updateUser()`) entirely — Better Auth
       * generates its request validators from `additionalFields`, so a
       * forged `{ role: "admin" }` in a signup/profile-update payload is
       * rejected before it ever reaches a handler, not just ignored.
       * There is deliberately no Server Action or route that can set this
       * field either — the only way to promote a user is the direct-DB
       * `scripts/promote-admin.ts` (see docs/ARCHITECTURE.md). Defaults to
       * `"customer"` for every sign-up.
       */
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({ data: normalizePhoneField(user) }),
      },
      update: {
        before: async (data) => ({ data: normalizePhoneField(data) }),
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
