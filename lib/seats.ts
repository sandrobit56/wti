/**
 * File:        lib/seats.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: Group mode ("ვინ რას შეჭამს"): up to 5 diners sit evenly around the lazy-susan.
 *              When the table stops, each diner gets the slice in front of them — one spin,
 *              everyone served. Pure math, no React.
 */
export const MAX_DINERS = 5;

/** Seat angles, degrees clockwise from 12 o'clock. Alone you sit at the top (the fork).
 *  A group sits along the BACK arc of the table (−120°…+120°): in the 3/4 view the front edge
 *  faces the viewer, so nobody sits there and blocks the plate. Spacing ≥ 60° → with 8 slices
 *  (45° each) two diners never face the same slice. */
const ARCS: Record<number, number[]> = { 1: [0], 2: [-60, 60], 3: [-90, 0, 90], 4: [-120, -40, 40, 120], 5: [-120, -60, 0, 60, 120] };
export function seatAngles(count: number): number[] {
  const a = ARCS[count];
  if (!a) throw new Error(`seatAngles: bad count ${count}`);
  return a;
}

/** Which slice is in front of a seat, for a wheel of n slices turned `rotation` degrees clockwise. */
export function sliceAt(rotation: number, seatDeg: number, n: number): number {
  if (n < 1) throw new Error("sliceAt: empty wheel");
  const a = 360 / n;
  const local = (((seatDeg - rotation) % 360) + 360) % 360; // seat position in the plate's own frame
  return Math.floor(local / a) % n;
}

// ── Eating together ────────────────────────────────────────────────────────────
// A group should be able to eat at ONE place (or order from one). We only know venue
// *types* per dish (catalog `venue.cats`, the same signal the venue matcher uses), so
// "one place" = the venue type shared by most of the group's dishes.

type VenueDish = { slug: string; venue: { cats: string[] } };

/** The venue type that serves the most of these dishes, and how many it covers. */
export function sharedVenue(dishes: VenueDish[]): { cat: string | null; covered: number } {
  const count = new Map<string, number>();
  for (const d of dishes) for (const c of new Set(d.venue.cats)) count.set(c, (count.get(c) ?? 0) + 1);
  let cat: string | null = null, covered = dishes.length > 0 ? 1 : 0;
  for (const [c, n] of count) if (n > covered) { cat = c; covered = n; }
  return { cat, covered };
}

/** Slices in front of each seat when slice `winner` is turned to the top (diner 0). */
export function seatsFor(winner: number, n: number, diners: number): number[] {
  const a = 360 / n, centre = winner * a + a / 2;
  return seatAngles(diners).map((deg) => Math.floor((((centre + deg) % 360) + 360) % 360 / a) % n);
}

/** Of all winners that could come up, the ones that seat the most diners at one venue type. */
export function bestWinners(wheel: VenueDish[], diners: number): { winners: number[]; covered: number } {
  let best: number[] = [], covered = -1;
  for (let w = 0; w < wheel.length; w++) {
    const c = sharedVenue(seatsFor(w, wheel.length, diners).map((i) => wheel[i])).covered;
    if (c > covered) { covered = c; best = [w]; } else if (c === covered) best.push(w);
  }
  return { winners: best, covered };
}

/** Georgian label for a venue type, as in "ყველა ერთად — ქართულ რესტორანში". */
const VENUE_LABEL: Record<string, string> = {
  georgian: "ქართულ რესტორანში", bakery: "საცხობში", barbecue: "მწვადის სახლში", grill: "გრილ-ბარში",
  meat_restaurant: "ხორცის რესტორანში", steakhouse: "სტეიკჰაუსში", japanese: "იაპონურ რესტორანში",
  sushi: "სუშის ბარში", ramen: "რამენის ბარში", korean: "კორეულ რესტორანში", chinese: "ჩინურ რესტორანში",
  southeast_asian: "აზიურ რესტორანში", thai: "ტაილანდურ რესტორანში", vietnamese: "ვიეტნამურ რესტორანში",
  pizza: "პიცერიაში", italian: "იტალიურ რესტორანში", turkish: "თურქულ რესტორანში", kebab: "ქაბაბის სახლში",
  lebanese: "ლიბანურ რესტორანში", burger: "ბურგერის ბარში", american: "ამერიკულ დაინერში",
  breakfast: "საუზმის კაფეში", brunch: "ბრანჩის კაფეში", dessert: "დესერტების კაფეში", health: "ჯანსაღ კაფეში",
  mexican: "მექსიკურ რესტორანში", seafood: "თევზის რესტორანში", russian: "რუსულ კაფეში", soup: "წვნიანების კაფეში",
};
export const venueLabel = (cat: string | null): string => (cat && VENUE_LABEL[cat]) || "ერთ ადგილას";

/** Group mode: swap the dishes in front of diners who can't eat at the shared venue type for
 *  other allowed dishes of that type (not already on the wheel). The wheel's diversity cap is
 *  for a solo spin; a group needs one table. Returns a new wheel; never touches other slices. */
export function fillSeats<T extends VenueDish>(wheel: T[], seats: number[], cat: string, candidates: T[], rng: () => number): T[] {
  const out = [...wheel];
  const used = new Set(out.map((d) => d.slug));
  for (const i of seats) {
    if (out[i].venue.cats.includes(cat)) continue;
    const pool = candidates.filter((d) => d.venue.cats.includes(cat) && !used.has(d.slug));
    if (pool.length === 0) break; // nothing left that fits — keep what we have
    const pick = pool[Math.floor(rng() * pool.length)];
    used.delete(out[i].slug); used.add(pick.slug); out[i] = pick;
  }
  return out;
}
