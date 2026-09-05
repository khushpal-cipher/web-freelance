/**
 * In-memory sliding-window rate limiter, per IP + route key.
 *
 * ponytail: process-local Map, resets on redeploy and doesn't share state
 * across serverless instances. Fine for a single-instance demo; swap for
 * Upstash/Redis if this ever needs to hold under real traffic or run
 * multi-instance.
 */
const buckets = new Map<string, number[]>();

const WINDOW_MS = 60_000;

export function rateLimit(key: string, limit: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { allowed: false, remaining: 0 };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { allowed: true, remaining: limit - hits.length };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
