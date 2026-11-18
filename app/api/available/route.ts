/**
 * File:        app/api/available/route.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0
 * Description: GET /api/available?lat=41.71&lng=44.75&r=2
 *              → { counts: { khinkali: 12, … }, venuesInRadius: 214 }
 *              The wheel only offers dishes that appear in `counts`, so changing
 *              the neighborhood or radius visibly changes the wheel.
 */
import { DISHES } from "@/lib/catalog.ts";
import { clientIp, rateLimiter } from "@/lib/security.ts";
import { countByDish, RADII_KM, type VenueFile } from "@/lib/places.ts";
import data from "@/data/venues.json";

const file = data as VenueFile;

const tooMany = rateLimiter(60); // per IP per minute — data is public, this only stops floods

export async function GET(request: Request) {
  if (tooMany(clientIp(request))) return Response.json({ error: "rate" }, { status: 429 });
  const q = new URL(request.url).searchParams;
  const lat = Number(q.get("lat"));
  const lng = Number(q.get("lng"));
  const r = Number(q.get("r"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return Response.json({ error: "bad lat/lng" }, { status: 400 });
  }
  if (!(RADII_KM as readonly number[]).includes(r)) {
    return Response.json({ error: `r must be one of ${RADII_KM.join(", ")}` }, { status: 400 });
  }
  if (file.venues.length === 0) {
    return Response.json({ error: "venue dataset not loaded" }, { status: 503 });
  }
  return Response.json(countByDish(file.venues, DISHES, { lat, lng }, r));
}
