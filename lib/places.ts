/**
 * File:        lib/places.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v2.0 — per-dish venue counts for a radius; Wolt district pages
 * Description: Location + venue matching + outbound links.
 *   - Venues come from Overture Maps Places (data/venues.json, built by
 *     scripts/import-venues.py). Each record keeps its source + license.
 *   - Google Maps is reached ONLY through Maps URLs (free, no API key, nothing
 *     stored) — that is our legal "every restaurant in town" path.
 *   - Delivery apps have no public API; we link to their Tbilisi pages, no scraping.
 */
import type { Dish } from "./catalog.ts";

export type LatLng = { lat: number; lng: number };

export type Venue = {
  id: string;            // Overture GERS id
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  cats: string[];        // Overture taxonomy ids (primary, alternates, hierarchy)
  website: string | null;
  source: string;        // e.g. "meta", "Foursquare"
  license: string;       // e.g. "CDLA-Permissive-2.0"
};

export type VenueFile = { release: string | null; generatedAt: string | null; venues: Venue[] };

/** Approximate neighborhood centers (±500 m — fine for a 1–5 km radius). */
/**
 * Approximate neighborhood centers (±500 m — fine for a 1–5 km radius).
 * `wolt` = Wolt's district slug, seen on wolt.com/…/geo/tbilisi/district/<slug> pages.
 */
export const NEIGHBORHOODS: { name: string; center: LatLng; wolt: string | null }[] = [
  { name: "ვაკე", center: { lat: 41.7095, lng: 44.756 }, wolt: "vake" },
  { name: "საბურთალო", center: { lat: 41.727, lng: 44.752 }, wolt: "saburtalo" },
  { name: "ვერა", center: { lat: 41.706, lng: 44.783 }, wolt: "vake" },
  { name: "სოლოლაკი", center: { lat: 41.69, lng: 44.798 }, wolt: "sololaki" },
  { name: "ძველი თბილისი", center: { lat: 41.691, lng: 44.808 }, wolt: "old-tbilisi" },
  { name: "ჩუღურეთი", center: { lat: 41.71, lng: 44.798 }, wolt: "chugureti" },
  { name: "დიდუბე", center: { lat: 41.74, lng: 44.779 }, wolt: "didube" },
  { name: "დიღომი", center: { lat: 41.77, lng: 44.74 }, wolt: null },
  { name: "ნაძალადევი", center: { lat: 41.755, lng: 44.79 }, wolt: "nadzaladevi" },
  { name: "გლდანი", center: { lat: 41.795, lng: 44.815 }, wolt: "gldani" },
  { name: "ისანი", center: { lat: 41.69, lng: 44.84 }, wolt: "isani" },
  { name: "ვარკეთილი", center: { lat: 41.69, lng: 44.88 }, wolt: "varketili" },
];

export const RADII_KM = [1, 2, 5] as const;
export type RadiusKm = (typeof RADII_KM)[number];

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type VenueMatch = Venue & { distanceKm: number; byName: boolean };

function serves(v: Venue, dish: Dish): { byName: boolean } | null {
  const lower = v.name.toLowerCase();
  const byName = dish.venue.names.some((n) => lower.includes(n.toLowerCase()));
  const byCat = v.cats.some((c) => dish.venue.cats.some((k) => c.includes(k)));
  return byName || byCat ? { byName } : null;
}

/** Number of venues within the radius per dish slug (dishes with 0 are omitted). */
export function countByDish(venues: Venue[], dishes: Dish[], origin: LatLng, radiusKm: number): { counts: Record<string, number>; venuesInRadius: number } {
  const near = venues.filter((v) => distanceKm(origin, v) <= radiusKm);
  const counts: Record<string, number> = {};
  for (const d of dishes) {
    const n = near.reduce((acc, v) => acc + (serves(v, d) ? 1 : 0), 0);
    if (n > 0) counts[d.slug] = n;
  }
  return { counts, venuesInRadius: near.length };
}

/**
 * Venues within `radiusKm` that probably serve `dish`.
 * A name hit ("Khinkali House") ranks above a category hit ("georgian_restaurant"),
 * then nearer first. Category matching is a heuristic — the UI says "probably".
 */
export function matchVenues(venues: Venue[], dish: Dish, origin: LatLng, radiusKm: number, limit = 6): VenueMatch[] {
  const out: VenueMatch[] = [];
  for (const v of venues) {
    const d = distanceKm(origin, v);
    if (d > radiusKm) continue;
    const hit = serves(v, dish);
    if (hit) out.push({ ...v, distanceKm: d, byName: hit.byName });
  }
  out.sort((a, b) => Number(b.byName) - Number(a.byName) || a.distanceKm - b.distanceKm);
  return out.slice(0, limit);
}

/** Google Maps URL (documented "Maps URLs", api=1, no key). */
export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapsVenueUrl(v: Venue): string {
  return mapsSearchUrl(`${v.name}, ${v.address ?? "თბილისი"}`);
}

export function mapsDirectionsUrl(v: Venue): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${v.lat}%2C${v.lng}`;
}

export type DeliveryLink = { id: "wolt" | "glovo" | "bolt"; name: string; url: string; dot: string };

/**
 * Delivery apps publish no search deep-link format, so we open the closest page
 * that exists: Wolt's district restaurant list (city list without a district),
 * Glovo's Tbilisi restaurant list, Bolt Food's Georgia page.
 * District pages verified 2026-11-15: vake, saburtalo, gldani, old-tbilisi,
 * sololaki, chugureti, didube, isani, varketili (nadzaladevi listed by Wolt).
 */
export function deliveryLinks(woltDistrict: string | null): DeliveryLink[] {
  const wolt = woltDistrict
    ? `https://wolt.com/ka/geo/tbilisi/district/${woltDistrict}`
    : "https://wolt.com/ka/geo/tbilisi/restaurants";
  return [
    { id: "wolt", name: "Wolt", url: wolt, dot: "#009de0" },
    { id: "glovo", name: "Glovo", url: "https://glovoapp.com/ge/en/tbilisi/restaurants_1/", dot: "#ffc244" },
    { id: "bolt", name: "Bolt Food", url: "https://bolt.eu/ka-ge/food/", dot: "#34d186" },
  ];
}
