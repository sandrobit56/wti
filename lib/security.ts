/**
 * File:        lib/security.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v1.0
 * Description: Small, testable security helpers shared by client and API routes.
 *   coarse()      — GPS → ~110 m grid before it is stored, put in a URL or sent to
 *                   Google. Enough for "places within 1 km", useless for finding a
 *                   home address. Applied once, at the source (geolocation callback).
 *   isSameOrigin()— API routes that spend money (Google) only answer our own pages.
 *   rateLimiter() — per-IP sliding window, in memory per server instance. A guard
 *                   against one noisy client, NOT the spending cap (Google quota is).
 *   clientIp()    — first hop of x-forwarded-for (set by Vercel's edge).
 */

export type LatLng = { lat: number; lng: number };

/** 3 decimals ≈ 110 m (latitude), ≈ 85 m (longitude at Tbilisi). */
export const COARSE_DECIMALS = 3;

export function coarse(p: LatLng): LatLng {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) throw new Error("coarse: bad coordinates");
  const f = 10 ** COARSE_DECIMALS;
  return { lat: Math.round(p.lat * f) / f, lng: Math.round(p.lng * f) / f };
}

/**
 * True when the request comes from our own page. Browsers send `Sec-Fetch-Site`
 * on every fetch; older ones send `Origin` on cross-site requests. A script on
 * another site therefore cannot use our paid endpoint. (A server-side script can
 * forge headers — the per-IP limit and Google's daily quota cover that.)
 */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin GETs from old browsers carry no Origin
  return new URL(origin).host === new URL(request.url).host;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export function rateLimiter(perMinute: number) {
  const hits = new Map<string, number[]>();
  return function tooMany(key: string, now = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear(); // bounded memory
    return recent.length > perMinute;
  };
}
