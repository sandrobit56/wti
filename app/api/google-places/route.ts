/**
 * File:        app/api/google-places/route.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-17
 * Version:     v1.0
 * Description: GET /api/google-places?q=ხინკალი&lat=41.71&lng=44.75&r=2
 *              → { places: GooglePlace[] }   (live Google Maps data, never stored)
 *              The paid key stays here on the server. Spend is capped by the daily
 *              quota in Google Cloud; this route adds a per-IP limit so one bot
 *              cannot burn the whole day's quota.
 *              429 { error: "quota" } → the UI falls back to our own venue list.
 */
import { QuotaError, searchPlaces } from "@/lib/google.ts";
import { RADII_KM } from "@/lib/places.ts";

const PER_IP_PER_MINUTE = 5;
const hits = new Map<string, number[]>(); // per server instance — a guard, not the cap

function tooMany(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // keep memory bounded
  return recent.length > PER_IP_PER_MINUTE;
}

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const term = (p.get("q") ?? "").trim();
  const lat = Number(p.get("lat")), lng = Number(p.get("lng")), r = Number(p.get("r"));
  if (!term || term.length > 80) return Response.json({ error: "q required (≤80 chars)" }, { status: 400 });
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Response.json({ error: "bad lat/lng" }, { status: 400 });
  if (!(RADII_KM as readonly number[]).includes(r) && r !== 10) return Response.json({ error: "bad r" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (tooMany(ip)) return Response.json({ error: "rate" }, { status: 429 });

  try {
    const places = await searchPlaces(process.env.GOOGLE_PLACES_API_KEY ?? "", term, { lat, lng }, r);
    return Response.json({ places }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof QuotaError) return Response.json({ error: "quota" }, { status: 429 });
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[google-places]", detail); // visible in Vercel → Logs
    // Google's message names the cause (API disabled, key restricted…) and never contains the key
    return Response.json({ error: "google", detail }, { status: 502 });
  }
}
