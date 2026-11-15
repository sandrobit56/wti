/**
 * File:        app/api/venues/route.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0
 * Description: GET /api/venues?dish=khinkali&lat=41.71&lng=44.75&r=2
 *              Returns nearby venues that probably serve the dish. The full
 *              dataset stays on the server (thousands of rows), the client gets ≤6.
 *              Bad input → 400 (fail fast, no guessing).
 */
import { DISHES } from "@/lib/catalog.ts";
import { matchVenues, RADII_KM, type VenueFile } from "@/lib/places.ts";
import data from "@/data/venues.json";

const file = data as VenueFile;

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const dish = DISHES.find((d) => d.slug === q.get("dish"));
  const lat = Number(q.get("lat"));
  const lng = Number(q.get("lng"));
  const r = Number(q.get("r"));

  if (!dish) return Response.json({ error: "unknown dish" }, { status: 400 });
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return Response.json({ error: "bad lat/lng" }, { status: 400 });
  }
  if (!(RADII_KM as readonly number[]).includes(r)) {
    return Response.json({ error: `r must be one of ${RADII_KM.join(", ")}` }, { status: 400 });
  }

  return Response.json({
    datasetReady: file.venues.length > 0,
    generatedAt: file.generatedAt,
    venues: matchVenues(file.venues, dish, { lat, lng }, r),
  });
}
