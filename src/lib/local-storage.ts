/**
 * Safe localStorage read/write for guest cart/wishlist persistence. Never
 * throws, never trusts stored shape blindly — a caller-supplied type guard
 * decides whether parsed JSON is usable; anything else (corrupt JSON,
 * wrong shape, storage unavailable) falls back to `null` rather than
 * crashing the app or feeding bad data into state.
 */

export function readJSON<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full, disabled, or unavailable (e.g. private browsing) — fail silently;
    // the cart/wishlist simply won't persist for this session.
  }
}
