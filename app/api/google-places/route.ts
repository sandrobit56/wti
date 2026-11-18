/**
 * File:        app/api/google-places/route.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-17
 * Version:     v1.1 — same-origin only; shared limiter (lib/security.ts)
 * Description: GET /api/google-places?q=ხინკალი&lat=41.71&lng=44.75&r=2
 *              &cat=<dish category>&cuisine=<dish cuisine>   → { places: GooglePlace[] }   (live Google Maps data, never stored)
 *              The paid key stays here on the server. Spend is capped by the daily
 *              quota in Google Cloud; this route adds a per-IP limit so one bot
 *              cannot burn the whole day's quota.
 *              429 { error: "quota" } → the UI falls back to our own venue list.
 */
import { QuotaError, RESTAURANT_ONLY, placesQuery, searchPlaces } from "@/lib/google.ts";
import { RADII_KM } from "@/lib/places.ts";
import { clientIp, isSameOrigin, rateLimiter } from "@/lib/security.ts";

const tooMany = rateLimiter(5); // per IP per minute

export async function GET(request: Request) {
  // Paid endpoint: only our own pages may call it (stops other sites using our key).
  if (!isSameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const p = new URL(request.url).searchParams;
  const term = (p.get("q") ?? "").trim();
  const lat = Number(p.get("lat")), lng = Number(p.get("lng")), r = Number(p.get("r"));
  if (!term || term.length > 80) return Response.json({ error: "q required (≤80 chars)" }, { status: 400 });
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Response.json({ error: "bad lat/lng" }, { status: 400 });
  if (!(RADII_KM as readonly number[]).includes(r) && r !== 10) return Response.json({ error: "bad r" }, { status: 400 });

  if (tooMany(clientIp(request))) return Response.json({ error: "rate" }, { status: 429 });

  try {
    const cat = p.get("cat") ?? "", cuisine = (p.get("cuisine") ?? "").slice(0, 30);
    const places = await searchPlaces(process.env.GOOGLE_PLACES_API_KEY ?? "", placesQuery(term, cat, cuisine), { lat, lng }, r, RESTAURANT_ONLY.has(cat));
    return Response.json({ places }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof QuotaError) return Response.json({ error: "quota" }, { status: 429 });
    // Google's reason (key restricted, API disabled…) → Vercel → Logs only, not to the public
    console.error("[google-places]", e instanceof Error ? e.message : e);
    return Response.json({ error: "google" }, { status: 502 });
  }
}
