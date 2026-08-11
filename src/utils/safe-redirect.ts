/** Redirect-target safety. Server-safe, no browser APIs. */

/**
 * Only accepts a same-origin, relative path (e.g. `/account/orders`) —
 * rejects absolute URLs, protocol-relative URLs (`//evil.com`), and
 * anything else that could send a user off-site after login. A
 * `callbackURL` query param is untrusted input like any other.
 */
export function getSafeRedirectPath(value: string | null | undefined, fallback = "/account"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return fallback;
  return value;
}
