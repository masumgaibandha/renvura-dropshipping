/** Bangladesh mobile number handling. Server-safe, no browser APIs. */

const LOCAL_FORMAT = /^01[3-9]\d{8}$/;
const INTL_PLUS_FORMAT = /^\+8801[3-9]\d{8}$/;
const INTL_FORMAT = /^8801[3-9]\d{8}$/;

/**
 * Accepts `01XXXXXXXXX`, `+8801XXXXXXXXX`, or `8801XXXXXXXXX` (ignoring
 * surrounding whitespace/dashes) and normalizes to the local
 * `01XXXXXXXXX` form used everywhere internally (storage, lookup,
 * tracking). Returns `null` for anything that doesn't match a real BD
 * mobile number shape — no fuzzy matching.
 */
export function normalizeBdPhone(input: string): string | null {
  const cleaned = input.replace(/[\s-]/g, "");

  if (LOCAL_FORMAT.test(cleaned)) {
    return cleaned;
  }
  if (INTL_PLUS_FORMAT.test(cleaned)) {
    return `0${cleaned.slice(4)}`;
  }
  if (INTL_FORMAT.test(cleaned)) {
    return `0${cleaned.slice(3)}`;
  }

  return null;
}
