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
import { VARIANTS } from "./variants.ts";
import { PERSONAS } from "./personas.ts";
import { applyQuiz, scoreQuiz, PERSONA_IDS } from "./quiz.ts";
import { CATEGORY_CAP, CUISINE_CAP, DEFAULT_FILTERS, normalizeFilters, NO_PREFS, SpinError, countMatching, displayName, explain, pickVariants, mealTimeAt, seeded, spin, targetRotation, weightOf, type SpinContext } from "./spin.ts";
import { matchVenues, distanceKm, countByDish, mapsSearchUrl, type Venue } from "./places.ts";
import { embedSearchUrl, parsePlaces, placesQuery, TBILISI } from "./google.ts";

const ctx = (over: Partial<SpinContext> = {}): SpinContext => ({
  filters: DEFAULT_FILTERS, now: new Date("2026-11-15T13:00:00"), excluded: [], random: false, available: null, prefs: NO_PREFS, mood: null, history: [], ...over,
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
  const c = ctx({ filters: { ...DEFAULT_FILTERS, priceMax: 1, diet: ["vegan"] } });
  for (let s = 0; s < 100; s++) {
    for (const d of spin(DISHES, c, seeded(s)).wheel) {
      const vs = pickVariants(d, c, seeded(s));
      assert.ok(vs.length > 0, d.slug);
      for (const v of vs) { assert.ok(v.vegan, v.slug); assert.ok(priceBand(v) <= 1, v.slug); }
    }
  }
});

test("too strict filters fail fast instead of spinning a tiny wheel", () => {
  const c = ctx({ filters: { ...DEFAULT_FILTERS, priceMax: 1, diet: ["vegan"] }, available: new Set(["steak", "sushi", "khinkali"]) });
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

test("taste chips are HARD filters: every wheel dish + every popup version fits a chosen taste", () => {
  for (const tastes of [["spicy"], ["healthy"], ["light"], ["spicy", "sweet"]] as const) {
    const c = ctx({ filters: { ...DEFAULT_FILTERS, tastes: [...tastes] } });
    for (let s = 0; s < 40; s++) {
      for (const d of spin(DISHES, c, seeded(s)).wheel) {
        const vs = pickVariants(d, c, seeded(s));
        assert.ok(vs.length > 0, `${tastes} ${d.slug}`);
        for (const v of vs) {
          const ok = tastes.some((t) => t === "spicy" ? v.spicy >= 1 : t === "healthy" ? v.healthy : t === "light" ? v.heaviness === "მსუბუქი" : d.category === "დესერტი" || d.tags.includes("brunch"));
          assert.ok(ok, `${tastes}: ${v.slug} does not fit`);
        }
      }
    }
  }
});

test("displayName is honest: vegetarian sees the version name, not the meat type", () => {
  const mtsvadi = DISHES.find((d) => d.slug === "mtsvadi")!;
  const veg = ctx({ filters: { ...DEFAULT_FILTERS, diet: ["vegetarian"] } });
  assert.equal(displayName(mtsvadi, veg), "სოკოს მწვადი");
  assert.equal(displayName(mtsvadi, ctx()), "მწვადი");
  const pkhali = DISHES.find((d) => d.slug === "pkhali")!;
  assert.equal(displayName(pkhali, veg), pkhali.name);
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

test("budget ₾: types with no cheap version disappear; kept types show only cheap versions", () => {
  const c = ctx({ filters: { ...DEFAULT_FILTERS, priceMax: 1 } });
  const n = countMatching(DISHES, c);
  assert.ok(n >= 10 && n < DISHES.length - 5, `₾ keeps ${n}`);
  for (let s = 0; s < 50; s++) {
    const r = spin(DISHES, c, seeded(s));
    for (const d of r.wheel) {
      assert.ok(!["steak", "seafood", "risotto"].includes(d.slug), d.slug);
      for (const v of pickVariants(d, c, seeded(s))) assert.ok(priceBand(v) === 1, v.slug);
    }
  }
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

test("persona boost ×1.6 for matching dishes only", () => {
  const sushi = DISHES.find((d) => d.slug === "sushi")!;
  const khinkali = DISHES.find((d) => d.slug === "khinkali")!;
  const prefs = { ...NO_PREFS, persona: "sushi" as const };
  assert.equal(weightOf(sushi, ctx({ prefs })), weightOf(sushi, ctx()) * 1.6);
  assert.equal(weightOf(khinkali, ctx({ prefs })), weightOf(khinkali, ctx()));
});

test("every persona matches at least 3 dishes (its wheel can show its taste)", () => {
  for (const id of PERSONA_IDS) {
    const n = DISHES.filter(PERSONAS[id].matches).length;
    assert.ok(n >= 3, `${id} matches only ${n}`);
  }
});

test("applyQuiz: vegetarian + ₾ + spicy pre-fill the panel; spice-avoid stays a soft pref", () => {
  const veg = applyQuiz(scoreQuiz(["q1a", "q2b", "q3c", "q4a", "q5b", "q6a", "q7d"]));
  assert.deepEqual(veg.filters, { ...DEFAULT_FILTERS, priceMax: 1, tastes: ["spicy"], diet: ["vegetarian"] });
  assert.notEqual(veg.prefs.persona, "mtsvadi");
  const mild = applyQuiz(scoreQuiz(["q1b", "q2d", "q3b", "q4d", "q5d", "q6c", "q7b"]));
  assert.equal(mild.prefs.spiceAvoid, true);
  assert.equal(mild.prefs.novelty, true);
  assert.deepEqual(mild.filters.tastes, ["light"]);
  const ostri = DISHES.find((d) => d.slug === "ostri")!;
  assert.ok(weightOf(ostri, ctx({ prefs: mild.prefs })) < weightOf(ostri, ctx()));
});

test("diversity: ≤3 per cuisine and ≤2 per category on every full wheel", () => {
  for (let s = 0; s < 300; s++) {
    const w = spin(DISHES, ctx(), seeded(s)).wheel;
    const by = (k: (d: (typeof w)[number]) => string) => w.reduce<Record<string, number>>((m, d) => ((m[k(d)] = (m[k(d)] ?? 0) + 1), m), {});
    assert.ok(Math.max(...Object.values(by((d) => d.cuisine))) <= CUISINE_CAP, `cuisine cap, seed ${s}`);
    assert.ok(Math.max(...Object.values(by((d) => d.category))) <= CATEGORY_CAP, `category cap, seed ${s}`);
  }
});

test("diversity yields when the pool is small (vegan ₾ still fills the wheel)", () => {
  const r = spin(DISHES, ctx({ filters: { ...DEFAULT_FILTERS, priceMax: 1, diet: ["vegan"] } }), seeded(3));
  assert.equal(r.wheel.length, Math.min(8, r.matching));
});

test("memory: last 3 winners ×0.3, won within 3 days ×0.5, older = full weight", () => {
  const now = new Date("2026-11-16T13:00:00");
  const pasta = DISHES.find((d) => d.slug === "pasta")!;
  const base = weightOf(pasta, ctx({ now }));
  const recent = [{ slug: "pasta", at: now.getTime() - 60_000 }];
  assert.equal(weightOf(pasta, ctx({ now, history: recent })), base * 0.3);
  const twoDays = [{ slug: "pasta", at: now.getTime() - 2 * 864e5 }, { slug: "a", at: 1 }, { slug: "b", at: 2 }, { slug: "c", at: 3 }];
  assert.equal(weightOf(pasta, ctx({ now, history: twoDays })), base * 0.5);
  const old = [{ slug: "pasta", at: now.getTime() - 9 * 864e5 }, { slug: "a", at: 1 }, { slug: "b", at: 2 }, { slug: "c", at: 3 }];
  assert.equal(weightOf(pasta, ctx({ now, history: old })), base);
});

test("the same dish rarely wins twice in a row once memory is on", () => {
  let repeats = 0, last: string | null = null;
  const history: { slug: string; at: number }[] = [];
  const now = new Date("2026-11-16T13:00:00");
  for (let s = 0; s < 400; s++) {
    const r = spin(DISHES, ctx({ now, history: [...history] }), seeded(s));
    const win = r.wheel[r.winnerIndex].slug;
    if (win === last) repeats++;
    last = win; history.push({ slug: win, at: now.getTime() });
  }
  assert.ok(repeats < 8, `repeats: ${repeats}/400`);
});

test("mood shifts weights the right way", () => {
  const salad = DISHES.find((d) => d.slug === "salad-bowl")!;
  const ojakhuri = DISHES.find((d) => d.slug === "ojakhuri")!;
  assert.ok(weightOf(ojakhuri, ctx({ mood: "hungry" })) > weightOf(ojakhuri, ctx()));
  assert.ok(weightOf(salad, ctx({ mood: "hungry" })) < weightOf(salad, ctx()));
  assert.ok(weightOf(salad, ctx({ mood: "light" })) > weightOf(salad, ctx()));
  const healthy = ctx({ filters: { ...DEFAULT_FILTERS, tastes: ["healthy"] } });
  assert.equal(countMatching([ojakhuri], healthy), 0, "ojakhuri has no healthy version → off the wheel");
  assert.equal(countMatching([salad], healthy), 1);
  assert.ok(DISHES.filter((d) => d.tags.includes("healthy")).length >= 10);
});

test("explain gives personal reasons first and ≤3 of them", () => {
  const sushi = DISHES.find((d) => d.slug === "sushi")!;
  const c = ctx({ prefs: { ...NO_PREFS, persona: "sushi" }, mood: "light", filters: { ...DEFAULT_FILTERS, tastes: ["healthy", "light"] } });
  const why = explain(sushi, c, "ჩხირების ოსტატი");
  assert.equal(why[0], "შენი პერსონის კერძია — ჩხირების ოსტატი");
  assert.ok(why.length <= 3);
  assert.deepEqual(explain(sushi, ctx({ random: true }), null), ["სრულიად შემთხვევით"]);
});

test("variants: every type has 1–20, vegan khinkali exists, popup gets ≤5 unique matching versions", () => {
  for (const d of DISHES) {
    const n = VARIANTS.filter((v) => v.type === d.slug).length;
    assert.ok(n >= 1 && n <= 20, `${d.slug}: ${n}`);
  }
  const khinkali = DISHES.find((d) => d.slug === "khinkali")!;
  const vegan = ctx({ filters: { ...DEFAULT_FILTERS, diet: ["vegan"] } });
  assert.ok(countMatching([khinkali], vegan) === 1, "khinkali stays on a vegan wheel via mushroom/potato");
  const vs = pickVariants(khinkali, vegan, seeded(1));
  assert.ok(vs.length >= 2 && vs.every((v) => v.vegan));
  const pizza = DISHES.find((d) => d.slug === "pizza")!;
  const five = pickVariants(pizza, ctx(), seeded(2));
  assert.equal(five.length, 5);
  assert.equal(new Set(five.map((v) => v.slug)).size, 5);
  const steak = DISHES.find((d) => d.slug === "steak")!;
  assert.equal(pickVariants(steak, ctx(), seeded(3)).length, 5, "6 versions → 5 shown, not 3");
});

test("healthy chip pulls healthy variants forward", () => {
  const sushi = DISHES.find((d) => d.slug === "sushi")!;
  const c = ctx({ filters: { ...DEFAULT_FILTERS, tastes: ["healthy"] } });
  let healthy = 0, plain = 0;
  for (let s = 0; s < 300; s++) {
    healthy += pickVariants(sushi, c, seeded(s), 1)[0].healthy ? 1 : 0;
    plain += pickVariants(sushi, ctx(), seeded(s), 1)[0].healthy ? 1 : 0;
  }
  assert.ok(healthy > plain * 1.2, `${healthy} vs ${plain}`);
});

test("every Google Maps search is pinned to Tbilisi, Georgia (no London results)", () => {
  const q = (u: string) => decodeURIComponent(new URL(u).searchParams.get("query")!);
  assert.equal(q(mapsSearchUrl("ფიშ ენდ ჩიფსი")), "ფიშ ენდ ჩიფსი, Tbilisi, Georgia");
  assert.equal(q(mapsSearchUrl("ხინკალი", "ვაკე")), "ხინკალი, ვაკე, Tbilisi, Georgia");
  assert.throws(() => mapsSearchUrl("  "));
});

test("Google: embed URL pinned to Tbilisi; parsePlaces drops non-Tbilisi and incomplete results", () => {
  const u = new URL(embedSearchUrl("k", "ხინკალი", "ვაკე", { lat: 41.71, lng: 44.756 }));
  assert.equal(u.searchParams.get("q"), "ხინკალი, ვაკე, Tbilisi, Georgia");
  assert.equal(u.searchParams.get("region"), "GE");
  assert.throws(() => embedSearchUrl("", "x", null, TBILISI));
  const raw = { places: [
    { id: "a", displayName: { text: "Far" }, googleMapsUri: "u", location: { latitude: 41.73, longitude: 44.78 } },
    { id: "b", displayName: { text: "Near" }, googleMapsUri: "u", location: { latitude: 41.694, longitude: 44.802 } },
    { id: "c", displayName: { text: "London" }, googleMapsUri: "u", location: { latitude: 51.5, longitude: -0.12 } },
    { id: "d", displayName: { text: "No location" }, googleMapsUri: "u" },
  ] };
  assert.deepEqual(parsePlaces(raw, TBILISI).map((p) => p.name), ["Near", "Far"]);
});

test("Google query: meal dishes get the cuisine, pastry/street food stay as typed", () => {
  assert.equal(placesQuery("ოჯახური", "კერძი", "ქართული"), "ოჯახური ქართული სამზარეულო");
  assert.equal(placesQuery("ლობიანი", "ცომეული", "ქართული"), "ლობიანი");
});

test("მეტი ფილტრი: cuisine / category / meal are hard filters (OR within a group)", () => {
  const c = ctx({ filters: { ...DEFAULT_FILTERS, cuisines: ["იტალიური", "აზიური"] } });
  for (let s = 1; s <= 30; s++) {
    for (const d of spin(DISHES, c, seeded(s)).wheel) assert.ok(["იტალიური", "აზიური"].includes(d.cuisine), d.slug);
  }
  const soup = ctx({ filters: { ...DEFAULT_FILTERS, categories: ["წვნიანი"] } });
  for (let s = 1; s <= 10; s++) for (const d of spin(DISHES, soup, seeded(s)).wheel) assert.equal(d.category, "წვნიანი");
  const bf = ctx({ filters: { ...DEFAULT_FILTERS, meals: ["საუზმე"] } });
  for (let s = 1; s <= 10; s++) for (const d of spin(DISHES, bf, seeded(s)).wheel) assert.ok(d.meals.includes("საუზმე"), d.slug);
});

test("normalizeFilters fills groups missing from older saved filters", () => {
  const f = normalizeFilters({ priceMax: 2, tastes: ["spicy"], diet: [] });
  assert.deepEqual([f.cuisines, f.categories, f.meals], [[], [], []]);
  assert.equal(f.priceMax, 2);
});
