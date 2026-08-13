import { createHash } from "node:crypto";

import { normalizeBdPhone } from "@/utils/phone";

/**
 * Server-only. Meta CAPI's `user_data` fields (`em`, `ph`) must be SHA-256 hashes of normalized
 * values, never raw email/phone — see CLAUDE.md's Phase 11 section. Importing `node:crypto` here
 * is deliberate: it makes this module impossible to bundle into a Client Component (Next.js build
 * fails loudly instead of silently shipping hashing logic — or worse, raw PII — to the browser).
 */

/** Meta's documented normalization for email: lowercase + trim, nothing else altered. */
export function normalizeEmailForHashing(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Meta's documented normalization for phone: digits only, country code included, no leading `+`.
 * Reuses `normalizeBdPhone` (already the single source of truth for BD phone shape in this
 * codebase) to validate/normalize to local `01XXXXXXXXX` form first, then converts to the
 * `8801XXXXXXXXX` form Meta expects. Returns `null` for anything that isn't a real BD mobile
 * number — never sent to Meta guessed/unvalidated.
 */
export function normalizePhoneForMeta(phone: string): string | null {
  const local = normalizeBdPhone(phone);
  if (!local) return null;
  return `880${local.slice(1)}`;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Hashes an already-normalized value for a Meta `user_data` field. Returns `null` for `null`/empty input — Meta fields are simply omitted rather than sent as a hash of an empty string. */
export function hashForMeta(normalizedValue: string | null | undefined): string | null {
  if (!normalizedValue) return null;
  return sha256Hex(normalizedValue);
}
