// ponytail: in-memory per-process limiter, fine for a single-instance demo.
// If this ever runs multi-instance, swap the Map for Redis (e.g. Upstash) with the same interface.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

const hits = new Map<string, number[]>();

export function rateLimit(key: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  hits.set(key, timestamps);
  return { ok: timestamps.length <= MAX_REQUESTS, remaining: Math.max(0, MAX_REQUESTS - timestamps.length) };
}

export function rateLimitKeyFromRequest(req: Request): string {
  return req.headers.get("x-forwarded-for") ?? "local";
}
