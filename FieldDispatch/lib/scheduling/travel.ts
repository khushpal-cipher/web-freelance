export type LatLng = { lat: number; lng: number };

const AVG_SPEED_KMH = 35; // urban/suburban service-vehicle average
const FIXED_OVERHEAD_MINS = 3; // parking, load tools — small constant buffer

// ponytail: in-memory cache, resets on redeploy/restart. Fine for a single-instance
// demo; swap for Redis if this ever runs multi-instance.
const cache = new Map<string, { mins: number; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function cacheKey(a: LatLng, b: LatLng) {
  const r = (n: number) => n.toFixed(4);
  return `${r(a.lat)},${r(a.lng)}|${r(b.lat)},${r(b.lng)}`;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function estimateMinutes(a: LatLng, b: LatLng): number {
  const km = haversineKm(a, b);
  return Math.round((km / AVG_SPEED_KMH) * 60 + FIXED_OVERHEAD_MINS);
}

async function fetchOrsMinutes(a: LatLng, b: LatLng): Promise<number | null> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openrouteservice.org/v2/matrix/driving-car", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations: [
          [a.lng, a.lat],
          [b.lng, b.lat],
        ],
        sources: [0],
        destinations: [1],
        metrics: ["duration"],
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const seconds = data?.durations?.[0]?.[0];
    if (typeof seconds !== "number") return null;
    return Math.round(seconds / 60);
  } catch {
    return null; // network error, timeout, malformed response — fall back below
  }
}

/**
 * Travel time in minutes between two points. Uses OpenRouteService when
 * ORS_API_KEY is configured; otherwise (or on API failure) falls back to a
 * haversine-distance estimate so the app always returns a usable number.
 */
export async function getTravelMinutes(a: LatLng, b: LatLng): Promise<number> {
  if (a.lat === b.lat && a.lng === b.lng) return 0;

  const key = cacheKey(a, b);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.mins;

  const mins = (await fetchOrsMinutes(a, b)) ?? estimateMinutes(a, b);
  cache.set(key, { mins, expiresAt: Date.now() + CACHE_TTL_MS });
  return mins;
}
