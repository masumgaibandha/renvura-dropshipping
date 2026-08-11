/**
 * Tiny in-memory fixed-window rate limiter for Server Actions.
 *
 * IMPORTANT — process-local only: the bucket `Map` lives in one server
 * process, so it does not coordinate across multiple serverless instances
 * and resets on redeploy/cold start. It's real protection against a single
 * client hammering one warm instance, not a substitute for a distributed
 * limiter (Upstash Redis, Vercel's Web Application Firewall, etc.) in
 * production — add one of those before relying on this for real abuse
 * protection at scale.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

const buckets = new Map<string, RateLimitEntry>();

/** Returns `true` if the call is allowed, `false` if `key` has exceeded `limit` within the current window. */
export function checkRateLimit(key: string, { limit, windowMs }: RateLimitOptions): boolean {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}
