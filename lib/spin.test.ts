/**
 * File:        lib/spin.test.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0
 * Description: Tests for spin logic and venue matching. Run: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DISHES, priceBand } from "./catalog.ts";
import { DEFAULT_FILTERS, SpinError, countMatching, mealTimeAt, seeded, spin, targetRotation, weightOf, type SpinContext } from "./spin.ts";
import { matchVenues, distanceKm, countByDish, type Venue } from "./places.ts";

const ctx = (over: Partial<SpinContext> = {}): SpinContext => ({
  filters: DEFAULT_FILTERS, now: new Date("2026-11-15T13:00:00"), excluded: [], random: false, available: null, ...over,
});

test("wheel has 8 unique dishes and the winner is on it", () => {
  for (let s = 0; s < 200; s++) {
    const r = spin(DISHES, ctx(), seeded(s));
    assert.equal(r.wheel.length, 8);
    assert.equal(new Set(r.wheel.map((d) => d.slug)).size, 8);
    assert.ok(r.winnerIndex >= 0 && r.winnerIndex < 8);
  }
});

test("hard filters: vegan + ₾ never shows meat or pricey dishes", () => {
  const c = ctx({ filters: { priceMax: 1, tastes: [], diet: ["vegan"] } });
  for (let s = 0; s < 100; s++) {
    for (const d of spin(DISHES, c, seeded(s)).wheel) {
      assert.ok(d.vegan, d.slug);
      assert.ok(priceBand(d) <= 1, d.slug);
    }
  }
});

test("too strict filters fail fast instead of spinning a tiny wheel", () => {
  const c = ctx({ filters: { priceMax: 1, tastes: [], diet: ["vegan"] }, excluded: ["lobiani", "lobio", "pkhali", "falafel", "hummus"] });
  assert.throws(() => spin(DISHES, c, seeded(1)), SpinError);
});

test("'not today' excludes a dish even in random mode", () => {
  for (let s = 0; s < 100; s++) {
    const r = spin(DISHES, ctx({ random: true, excluded: ["khinkali"] }), seeded(s));
    assert.ok(!r.wheel.some((d) => d.slug === "khinkali"));
  }
});

test("time of day: khashi is boosted at 8:00 and damped at 20:00", () => {
  const khashi = DISHES.find((d) => d.slug === "khashi")!;
  const morning = weightOf(khashi, ctx({ now: new Date("2026-11-15T08:00:00") }));
  const evening = weightOf(khashi, ctx({ now: new Date("2026-11-15T20:00:00") }));
  assert.ok(morning > evening * 5, `${morning} vs ${evening}`);
  assert.equal(mealTimeAt(new Date("2026-11-15T23:30:00")), "ღამე");
});

test("taste chip boosts matching dishes ×1.5", () => {
  const ostri = DISHES.find((d) => d.slug === "ostri")!;
  const plain = weightOf(ostri, ctx());
  const spicy = weightOf(ostri, ctx({ filters: { ...DEFAULT_FILTERS, tastes: ["spicy"] } }));
  assert.equal(spicy, plain * 1.5);
});

test("rotation lands the chosen slice under the pointer", () => {
  for (const [i, n] of [[0, 8], [3, 8], [7, 8], [2, 5]]) {
    const rot = targetRotation(1234, i, n);
    const center = (i * 360) / n + 180 / n;
    assert.equal(((center + rot) % 360 + 360) % 360, 0);
    assert.ok(rot > 1234 + 360 * 4);
  }
});

test("venue matching: name hit first, radius respected", () => {
  const khinkali = DISHES.find((d) => d.slug === "khinkali")!;
  const origin = { lat: 41.7095, lng: 44.756 };
  const v = (id: string, name: string, lat: number, cats: string[]): Venue =>
    ({ id, name, lat, lng: 44.756, address: null, cats, website: null, source: "meta", license: "CDLA-Permissive-2.0" });
  const venues = [
    v("a", "Georgian Table", 41.7100, ["georgian_restaurant"]),
    v("b", "Khinkali House", 41.7150, ["restaurant"]),
    v("c", "Far Khinkali", 41.80, ["georgian_restaurant"]),
    v("d", "Pizza Place", 41.7096, ["pizza_restaurant"]),
  ];
  const m = matchVenues(venues, khinkali, origin, 2);
  assert.deepEqual(m.map((x) => x.id), ["b", "a"]);
  assert.ok(distanceKm(origin, venues[2]) > 2);
});

test("real-data quirks: Georgian restaurant tagged middle_eastern is not a falafel place; 'Xinklis Saxli' is khinkali", () => {
  const origin = { lat: 41.7095, lng: 44.756 };
  const base = { lat: 41.71, lng: 44.756, address: null, website: null, source: "meta", license: "CDLA-Permissive-2.0" };
  const venues: Venue[] = [
    { ...base, id: "g", name: "Shemomechama", cats: ["food_and_drink", "georgian_restaurant", "middle_eastern_restaurant", "restaurant"] },
    { ...base, id: "x", name: "Xinklis Saxli Vake", cats: ["food_and_drink", "restaurant"] },
  ];
  const by = (slug: string) => DISHES.find((d) => d.slug === slug)!;
  assert.deepEqual(matchVenues(venues, by("falafel"), origin, 2).map((v) => v.id), []);
  assert.deepEqual(matchVenues(venues, by("shawarma"), origin, 2).map((v) => v.id), []);
  assert.deepEqual(matchVenues(venues, by("khinkali"), origin, 2).map((v) => v.id), ["x", "g"]);
});

test("location: only dishes with a venue in the radius can appear", () => {
  const available = new Set(["sushi", "ramen", "pizza", "burger"]);
  for (let s = 0; s < 50; s++) {
    for (const d of spin(DISHES, ctx({ available }), seeded(s)).wheel) assert.ok(available.has(d.slug), d.slug);
    for (const d of spin(DISHES, ctx({ available, random: true }), seeded(s)).wheel) assert.ok(available.has(d.slug), d.slug);
  }
  assert.equal(countMatching(DISHES, ctx({ available })), 4);
});

test("budget ₾ removes pricey dishes (sushi, steak) and keeps cheap ones", () => {
  const c = ctx({ filters: { ...DEFAULT_FILTERS, priceMax: 1 } });
  const n = countMatching(DISHES, c);
  assert.ok(n >= 10 && n < DISHES.length - 10, `₾ keeps ${n}`);
  for (let s = 0; s < 50; s++) for (const d of spin(DISHES, c, seeded(s)).wheel) assert.ok(!["sushi", "steak", "seafood"].includes(d.slug));
});

test("countByDish counts venues per dish inside the radius only", () => {
  const base = { address: null, website: null, source: "meta", license: "CDLA-Permissive-2.0" };
  const venues: Venue[] = [
    { ...base, id: "1", name: "Sushi Bar", lat: 41.7095, lng: 44.756, cats: ["sushi_restaurant"] },
    { ...base, id: "2", name: "Far Sushi", lat: 41.80, lng: 44.756, cats: ["sushi_restaurant"] },
    { ...base, id: "3", name: "Subway Vake", lat: 41.71, lng: 44.757, cats: ["sandwich_shop"] },
  ];
  const r = countByDish(venues, DISHES, { lat: 41.7095, lng: 44.756 }, 2);
  assert.equal(r.venuesInRadius, 2);
  assert.equal(r.counts["sushi"], 1);
  assert.equal(r.counts["sandwich"], 1);
  assert.equal(r.counts["khinkali"], undefined);
});
