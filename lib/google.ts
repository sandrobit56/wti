/**
 * File:        lib/google.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-17
 * Version:     v1.0
 * Description: Google Maps Platform — two pieces, nothing else:
 *   1. embedSearchUrl(): Maps Embed API iframe URL (free, unlimited; browser key,
 *      restricted to our domain in Google Cloud).
 *   2. searchPlaces(): Places API (New) Text Search, SERVER ONLY (paid key).
 *      Field mask is kept on the Pro SKU on purpose (id, name, address, location,
 *      Maps link). rating / opening hours would bill as Enterprise.
 *      Google terms: results are shown live and never stored (only place IDs may
 *      be cached), and they are labelled as Google Maps data.
 */
import { distanceKm, MAPS_CITY, type LatLng } from "./places.ts";

/** Tbilisi city center (Freedom Square) — default bias when no neighborhood is chosen. */
export const TBILISI: LatLng = { lat: 41.6934, lng: 44.8015 };
/** Rough Tbilisi bounds. Anything Google returns outside is dropped (no London results). */
const BOUNDS = { south: 41.6, north: 41.86, west: 44.6, east: 45.1 };
export const RESULTS_MAX = 5;
const FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri";

export type GooglePlace = { id: string; name: string; address: string | null; distanceKm: number; mapsUrl: string };

export function embedSearchUrl(key: string, term: string, area: string | null, center: LatLng): string {
  if (!key) throw new Error("embedSearchUrl: missing NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY");
  const q = [term, area, MAPS_CITY].filter(Boolean).join(", ");
  const p = new URLSearchParams({ key, q, center: `${center.lat},${center.lng}`, zoom: area ? "14" : "12", language: "ka", region: "GE" });
  return `https://www.google.com/maps/embed/v1/search?${p}`;
}

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
};

/** Pure: Google response → our shape. Drops anything incomplete or outside Tbilisi. */
export function parsePlaces(json: { places?: RawPlace[] }, origin: LatLng): GooglePlace[] {
  return (json.places ?? [])
    .flatMap((p): GooglePlace[] => {
      const lat = p.location?.latitude, lng = p.location?.longitude;
      if (!p.id || !p.displayName?.text || !p.googleMapsUri || lat == null || lng == null) return [];
      if (lat < BOUNDS.south || lat > BOUNDS.north || lng < BOUNDS.west || lng > BOUNDS.east) return [];
      return [{ id: p.id, name: p.displayName.text, address: p.formattedAddress ?? null, distanceKm: distanceKm(origin, { lat, lng }), mapsUrl: p.googleMapsUri }];
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, RESULTS_MAX);
}

export class QuotaError extends Error {}

export async function searchPlaces(apiKey: string, term: string, origin: LatLng, radiusKm: number): Promise<GooglePlace[]> {
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not set on the server");
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify({
      textQuery: `${term}, ${MAPS_CITY}`,
      languageCode: "ka",
      regionCode: "GE",
      pageSize: 10,
      locationBias: { circle: { center: { latitude: origin.lat, longitude: origin.lng }, radius: Math.min(radiusKm * 1000, 50000) } },
    }),
    cache: "no-store", // Google terms: no storing of Places content
  });
  if (res.status === 429) throw new QuotaError("Google Places daily/minute quota reached");
  if (!res.ok) {
    // Google's ErrorInfo: reason + metadata name the exact cause (API disabled, key restricted, billing…)
    const body = await res.json().catch(() => null);
    const info = body?.error?.details?.find((d: { reason?: string }) => d.reason);
    throw new Error(`Google Places ${res.status} ${info?.reason ?? ""} ${JSON.stringify(info?.metadata ?? {})} ${body?.error?.message ?? ""}`.trim());
  }
  return parsePlaces(await res.json(), origin);
}
