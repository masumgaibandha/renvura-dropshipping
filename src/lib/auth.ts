import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { MongoClient } from "mongodb";

import { sendAccountEmail } from "@/lib/email-provider";
import { normalizeBdPhone } from "@/utils/phone";

/**
 * Every origin, beyond `baseURL` itself, that a real sign-up/sign-in
 * request can legitimately arrive from. Better Auth always trusts
 * `baseURL`'s own origin automatically (http://localhost:3000 in dev,
 * whatever `BETTER_AUTH_URL` resolves to in production) — this only adds
 * the apex/`www` pair, since a browser's `Origin` header is scheme+host
 * exact, so `https://www.renvura.com` is a genuinely different origin from
 * `https://renvura.com`, not a variant of it.
 *
 * Kept as an explicit, reviewed, version-controlled list rather than a
 * second Vercel dashboard env var (Better Auth also supports
 * `BETTER_AUTH_TRUSTED_ORIGINS`, but that's one more setting someone has to
 * remember to keep correct) — and as a deliberate safety net: if
 * `BETTER_AUTH_URL` is ever left unset or wrong in an environment, requests
 * to the real production domain still pass the origin check instead of
 * failing closed with "Invalid origin." Always including this list is safe
 * even outside production: it's purely additive (a local dev browser never
 * sends `Origin: https://renvura.com`), never a wildcard, and never
 * sourced from user input — see CLAUDE.md's "Authentication & customer
 * account rules" for the full production-origin story.
 */
const PRODUCTION_TRUSTED_ORIGINS = ["https://renvura.com", "https://www.renvura.com"];

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
 * Rejects `/email-otp/reset-password` when the submitted new password is
 * identical to the account's current one — Better Auth 1.6.26 has no
 * built-in option for this (confirmed by reading both
 * `node_modules/better-auth/dist/plugins/email-otp/routes.mjs`'s
 * `resetPasswordEmailOTP` and `node_modules/better-auth/dist/api/routes/update-user.mjs`'s
 * session-based `changePassword` — neither compares the new password
 * against the old one). Implemented as a top-level `hooks.before`
 * middleware (a first-class, documented Better Auth extension point, not a
 * fork) rather than a `databaseHooks.account.update` hook, because by the
 * time any database hook fires the plaintext password has already been
 * hashed away — only a request-level "before" hook still has the raw
 * `ctx.body.password` to compare. Reuses `ctx.context.password.verify` —
 * Better Auth's own password-verification primitive (the exact same
 * function `changePassword` itself uses) — never a second hashing scheme,
 * never a plaintext DB comparison, never logs a password.
 *
 * Runs *before* Better Auth's own route handler, so throwing here means
 * `atomicVerifyOTP` never runs either — the OTP is never consumed by a
 * rejected same-password attempt, so the customer can immediately retry
 * with a different password using the same code rather than requesting a
 * fresh email. This does mean the check runs even before the OTP itself is
 * validated; that's an accepted tradeoff, not a new weakness — `/sign-in/email`
 * (rate-limited the same way) already lets anyone test a guessed password
 * against an account's real credential and get an equivalent yes/no
 * signal, so this doesn't introduce a new oracle class, just another
 * already-rate-limited instance of the one that already exists.
 */
const rejectSamePasswordOnReset = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/email-otp/reset-password") {
    return;
  }

  const body = ctx.body as { email?: unknown; password?: unknown } | undefined;
  if (typeof body?.email !== "string" || typeof body?.password !== "string") {
    return;
  }

  const user = await ctx.context.internalAdapter.findUserByEmail(body.email.toLowerCase(), { includeAccounts: true });
  const credentialAccount = user?.accounts?.find((account) => account.providerId === "credential");
  if (!credentialAccount?.password) {
    return;
  }

  const isSameAsCurrentPassword = await ctx.context.password.verify({ hash: credentialAccount.password, password: body.password });
  if (isSameAsCurrentPassword) {
    throw APIError.from("BAD_REQUEST", {
      code: "SAME_AS_CURRENT_PASSWORD",
      message: "Your new password cannot be the same as your current password.",
    });
  }
});

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
 *
 * `requireEmailVerification` (Phase 10.5) blocks sign-in for unverified
 * accounts with a distinct `EMAIL_NOT_VERIFIED` error and skips
 * `autoSignIn` at signup — verification itself goes through the
 * `email-otp` plugin below (6-digit code, not a link), which also backs
 * `/forgot-password` and `/reset-password`. No custom verification-token
 * storage was written — Better Auth's own `verification` collection
 * (Mongo-backed, survives across serverless invocations) is the only
 * store. See CLAUDE.md's "Email verification & password reset (Phase
 * 10.5)" section for the full design, including why existing pre-Phase-
 * 10.5 accounts are never retroactively marked verified.
 */
export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: PRODUCTION_TRUSTED_ORIGINS,
  emailAndPassword: {
    enabled: true,
    // No-op once `requireEmailVerification` is on (Better Auth's own sign-up handler skips
    // auto-sign-in whenever that flag is set) — kept `true` for clarity/documentation intent.
    autoSignIn: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    // `/email-otp/verify-email` (the `email-otp` plugin below) creates a session itself on
    // success when this is set — see CLAUDE.md's "Email verification & password reset (Phase
    // 10.5)" section.
    autoSignInAfterVerification: true,
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
  hooks: {
    before: rejectSamePasswordOnReset,
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
  plugins: [
    emailOTP({
      // Better Auth's default link-based email verification is swapped for OTP end to end —
      // signup, resend-on-login, and password reset all use the same 6-digit-code UX.
      // `overrideDefaultEmailVerification: true` routes signup's own `requireEmailVerification`
      // send (core `sign-up.mjs`) through this OTP sender, so `sendVerificationOnSignUp` is left
      // unset here — with the override on, that option's hook is unreachable (see the plugin's
      // own `hooks.after[0].matcher`, which explicitly requires `!overrideDefaultEmailVerification`)
      // and setting it would just be dead config.
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 5 * 60,
      allowedAttempts: 3,
      storeOTP: "hashed",
      sendVerificationOTP: async ({ email, otp, type }) => {
        await sendAccountEmail({ to: email, otp, type });
      },
    }),
    nextCookies(), // must stay last — see Better Auth's own plugin-ordering guidance
  ],
});
