/**
 * File:        lib/spin.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-16
 * Version:     v5.0 — taste chips are hard filters (OR); displayName() for honest labels;
 *              v4.0 — variant-aware: a type passes hard filters if one of its
 *              real variants does; pickVariants() chooses 4–5 for the popup
 * Description: Pure spin logic. The winner is decided HERE, before any animation;
 *              the wheel only travels to it. Randomness is injected (rng) so tests
 *              are deterministic.
 *
 *   weight = baseWeight × timeOfDay × tasteChips(×1.5 each) × persona(×1.6)
 *            × quiz prefs × mood × memory — clamped to 0.1…5
 *   hard filters (budget, diet, location, "not today", "never") remove a dish entirely.
 *   diversity: one wheel holds ≤3 dishes of a cuisine and ≤2 of a category,
 *              relaxed only when the pool is too small to fill 8 slices.
 */
import { DISHES, priceBand, type Dish, type MealTime } from "./catalog.ts";
import { PERSONA_BOOST, PERSONAS } from "./personas.ts";
import { variantsOf, type Variant } from "./variants.ts";
import type { PersonaId } from "./quiz.ts";

export type Taste = "spicy" | "light" | "georgian" | "sweet" | "fast" | "healthy";
/** One-tap, momentary mode above the wheel (not saved). */
export type Mood = "hungry" | "light" | "new";
/** A past winner, for "don't repeat yourself". */
export type Win = { slug: string; at: number };
export type Diet = "vegetarian" | "vegan";

export type Filters = {
  priceMax: 1 | 2 | 3;
  tastes: Taste[];
  diet: Diet[];
};

export const DEFAULT_FILTERS: Filters = { priceMax: 3, tastes: [], diet: [] };

/** Soft preferences that come from the quiz (not visible as filter controls). */
export type Prefs = {
  persona: PersonaId | null;
  spiceAvoid: boolean;   // q4d "ცხარე არ მიყვარს": very hot dishes ×0.3
  lenten: boolean;       // q5a: vegan / lenten dishes ×1.5
  novelty: boolean;      // q2d: everything base weight 2, non-Georgian ×1.3
};

export const NO_PREFS: Prefs = { persona: null, spiceAvoid: false, lenten: false, novelty: false };

export type SpinContext = {
  filters: Filters;
  now: Date;
  excluded: string[];          // slugs hidden: "დღეს არა" (24h) + "არ მიყვარს" (until restored)
  random: boolean;             // "შემთხვევით": ignores filters and weights; location + "not today" still apply
  available: Set<string> | null; // slugs with ≥1 venue in the chosen radius; null = no place chosen (whole city)
  prefs: Prefs;
  mood: Mood | null;
  history: Win[];              // past winners, oldest first
};

export type Rng = () => number; // [0, 1)

export const WHEEL_SIZE = 8;
export const MIN_WHEEL = 3;
export const CUISINE_CAP = 3;
export const CATEGORY_CAP = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

export function mealTimeAt(d: Date): MealTime {
  const h = d.getHours();
  if (h >= 7 && h < 11) return "საუზმე";
  if (h >= 11 && h < 17) return "სადილი";
  if (h >= 17 && h < 23) return "ვახშამი";
  return "ღამე";
}

const TASTE_MATCH: Record<Taste, (d: Dish) => boolean> = {
  spicy: (d) => d.spicy >= 1,
  light: (d) => d.heaviness === "მსუბუქი",
  georgian: (d) => d.cuisine === "ქართული",
  sweet: (d) => d.category === "დესერტი" || d.tags.includes("brunch"),
  fast: (d) => d.tags.includes("fast"),
  healthy: (d) => d.tags.includes("healthy"),
};

export const TASTE_LABEL: Record<Taste, string> = {
  spicy: "ცხარე", light: "მსუბუქი", georgian: "ქართული", sweet: "ტკბილი", fast: "სწრაფი", healthy: "ჯანსაღი",
};

const MOOD_WEIGHT: Record<Mood, (d: Dish, ctx: SpinContext) => number> = {
  hungry: (d) => (d.heaviness === "მძიმე" ? 1.6 : d.heaviness === "მსუბუქი" ? 0.5 : 1),
  light: (d) => (d.heaviness === "მსუბუქი" ? 1.6 : d.heaviness === "მძიმე" ? 0.5 : 1),
  new: (d, ctx) => (ctx.history.some((w) => w.slug === d.slug) ? 0.4 : 1.8),
};

/** Recent winners come back rarely: last 3 spins ×0.3, anything won in the last 3 days ×0.5. */
function memoryWeight(d: Dish, ctx: SpinContext): number {
  if (ctx.history.slice(-3).some((w) => w.slug === d.slug)) return 0.3;
  const since = ctx.now.getTime() - 3 * DAY_MS;
  if (ctx.history.some((w) => w.slug === d.slug && w.at >= since)) return 0.5;
  return 1;
}

/** Hard filters on one real variant (budget + diet). */
/**
 * Taste chips are HARD filters (user testing: "the wheel ignores my filters").
 * Several chips = OR: a version passes if it matches at least one chosen taste.
 * spicy / light / healthy are judged on the version itself; georgian / sweet / fast on its type.
 */
const DISH_BY_SLUG = new Map(DISHES.map((d) => [d.slug, d]));

const VARIANT_TASTE: Record<Taste, (v: Variant, d: Dish) => boolean> = {
  spicy: (v) => v.spicy >= 1,
  light: (v) => v.heaviness === "მსუბუქი",
  healthy: (v) => v.healthy,
  georgian: (_v, d) => TASTE_MATCH.georgian(d),
  sweet: (_v, d) => TASTE_MATCH.sweet(d),
  fast: (_v, d) => TASTE_MATCH.fast(d),
};

export function variantAllowed(v: Variant, f: Filters, d: Dish = DISH_BY_SLUG.get(v.type)!): boolean {
  if (priceBand(v) > f.priceMax) return false;
  if (f.diet.includes("vegan") && !v.vegan) return false;
  if (f.diet.includes("vegetarian") && !v.vegetarian) return false;
  if (f.tastes.length && !f.tastes.some((t) => VARIANT_TASTE[t](v, d))) return false;
  return true;
}

/** The versions of a dish type that pass the current hard filters. */
export function allowedVariants(d: Dish, ctx: SpinContext): Variant[] {
  return variantsOf(d.slug).filter((v) => ctx.random || variantAllowed(v, ctx.filters, d));
}

/**
 * Honest name for the slice/popup: the type name when the type itself fits the
 * filters, otherwise the first fitting version ("სოკოს მწვადი", not "მწვადი", for a
 * vegetarian) — so nobody is offered a dish that, as named, breaks their filter.
 */
export function displayName(d: Dish, ctx: SpinContext): string {
  if (ctx.random) return d.name;
  const f = ctx.filters;
  const typeFits = (!f.diet.includes("vegan") || d.vegan) && (!f.diet.includes("vegetarian") || d.vegetarian)
    && (!f.tastes.length || f.tastes.some((t) => TASTE_MATCH[t](d)));
  if (typeFits) return d.name;
  const v = allowedVariants(d, ctx)[0];
  return v ? v.name : d.name;
}

/** Hard filters: a dish TYPE may appear if at least one of its variants passes. */
export function isAllowed(d: Dish, ctx: SpinContext): boolean {
  if (ctx.excluded.includes(d.slug)) return false;
  if (ctx.available && !ctx.available.has(d.slug)) return false;
  if (ctx.random) return true;
  return variantsOf(d.slug).some((v) => variantAllowed(v, ctx.filters, d));
}

/**
 * The 4–5 versions shown in the popup for the winning type: only variants that
 * pass the hard filters, weighted by taste chips, mood and quiz prefs, no repeats.
 */
export function pickVariants(d: Dish, ctx: SpinContext, rng: Rng, n = 5): Variant[] {
  const pool = allowedVariants(d, ctx);
  const w = pool.map((v) => {
    if (ctx.random) return 1;
    let x = 1;
    const t = ctx.filters.tastes;
    if (t.includes("spicy") && v.spicy >= 1) x *= 1.5;
    if (t.includes("light") && v.heaviness === "მსუბუქი") x *= 1.5;
    if (t.includes("healthy") && v.healthy) x *= 1.5;
    if (ctx.mood === "hungry") x *= v.heaviness === "მძიმე" ? 1.6 : v.heaviness === "მსუბუქი" ? 0.5 : 1;
    if (ctx.mood === "light") x *= v.heaviness === "მსუბუქი" ? 1.6 : v.heaviness === "მძიმე" ? 0.5 : 1;
    if (ctx.prefs.spiceAvoid && v.spicy === 2) x *= 0.3;
    if (ctx.prefs.lenten && v.vegan) x *= 1.5;
    return x;
  });
  const out: Variant[] = [];
  const want = Math.min(n, pool.length); // fixed up front — pool shrinks as we pick
  while (out.length < want) {
    const i = weightedIndex(w, rng);
    out.push(pool[i]);
    pool.splice(i, 1);
    w.splice(i, 1);
  }
  return out;
}

/** Soft preferences. Only called for allowed dishes. */
export function weightOf(d: Dish, ctx: SpinContext): number {
  if (ctx.random) return 1;
  const slot = mealTimeAt(ctx.now);
  const p = ctx.prefs;
  let w: number = p.novelty ? 2 : d.baseWeight;
  if (p.persona && PERSONAS[p.persona].matches(d)) w *= PERSONA_BOOST;
  if (p.spiceAvoid && d.spicy === 2) w *= 0.3;
  if (p.lenten && (d.vegan || d.tags.includes("lenten"))) w *= 1.5;
  if (p.novelty && d.cuisine !== "ქართული") w *= 1.3;
  if (!d.meals.includes(slot)) w *= 0.3;
  else if (slot === "საუზმე" || slot === "ღამე") w *= 2;
  if (ctx.mood) w *= MOOD_WEIGHT[ctx.mood](d, ctx);
  w *= memoryWeight(d, ctx);
  return Math.min(5, Math.max(0.1, w));
}

function weightedIndex(weights: number[], rng: Rng): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

export type SpinResult = { wheel: Dish[]; winnerIndex: number; matching: number };

/** How many dishes pass the hard filters — shown under the wheel. */
export function countMatching(dishes: Dish[], ctx: SpinContext): number {
  return dishes.filter((d) => isAllowed(d, ctx)).length;
}

/**
 * Picks up to 8 dishes (weighted, no repeats) and a winner among them (weighted).
 * Throws when fewer than MIN_WHEEL dishes pass the filters — the UI must ask the
 * user to loosen filters instead of spinning a 1-slice wheel.
 */
export function spin(dishes: Dish[], ctx: SpinContext, rng: Rng): SpinResult {
  const pool = dishes.filter((d) => isAllowed(d, ctx));
  const matching = pool.length;
  if (pool.length < MIN_WHEEL) {
    throw new SpinError(`only ${pool.length} dishes match the filters`, pool.length);
  }
  const weights = pool.map((d) => weightOf(d, ctx));
  const wheel: Dish[] = [];
  const wheelWeights: number[] = [];
  const count = (key: (d: Dish) => string, v: string) => wheel.filter((d) => key(d) === v).length;
  const size = Math.min(WHEEL_SIZE, pool.length); // fixed up front: `pool` shrinks as we pick
  while (wheel.length < size) {
    // Diversity caps zero out over-represented candidates; if that leaves nothing, the caps yield.
    const capped = pool.map((d, k) =>
      count((x) => x.cuisine, d.cuisine) >= CUISINE_CAP || count((x) => x.category, d.category) >= CATEGORY_CAP ? 0 : weights[k]);
    const i = weightedIndex(capped.some((w) => w > 0) ? capped : weights, rng);
    wheel.push(pool[i]);
    wheelWeights.push(weights[i]);
    pool.splice(i, 1);
    weights.splice(i, 1);
  }
  return { wheel, winnerIndex: weightedIndex(wheelWeights, rng), matching };
}

/**
 * Up to 3 short reasons why this dish landed — shown in the result popup so the
 * wheel feels like it listened. Ordered by how personal the reason is.
 */
export function explain(d: Dish, ctx: SpinContext, personaName: string | null): string[] {
  if (ctx.random) return ["სრულიად შემთხვევით"];
  const out: string[] = [];
  if (ctx.prefs.persona && personaName && PERSONAS[ctx.prefs.persona].matches(d)) out.push(`შენი პერსონის კერძია — ${personaName}`);
  if (ctx.mood === "hungry" && d.heaviness === "მძიმე") out.push("მგელივით მშიერი ხარ — ეს გაგაძღებს");
  if (ctx.mood === "light" && d.heaviness === "მსუბუქი") out.push("მსუბუქი გინდოდა");
  if (ctx.mood === "new" && !ctx.history.some((w) => w.slug === d.slug)) out.push("ჯერ არ ამოგსვლია");
  const tastes = ctx.filters.tastes.filter((t) => TASTE_MATCH[t](d)).map((t) => TASTE_LABEL[t]);
  if (tastes.length) out.push(`ემთხვევა: ${tastes.join(", ")}`);
  if (ctx.prefs.lenten && (d.vegan || d.tags.includes("lenten"))) out.push("მარხვის კერძია");
  const slot = mealTimeAt(ctx.now);
  if (slot === "საუზმე" && d.meals.includes(slot)) out.push("დილისთვის კარგია");
  if (slot === "ღამე" && d.meals.includes(slot)) out.push("ღამითაც ღიაა მსგავსი ადგილები");
  return out.slice(0, 3);
}

export class SpinError extends Error {
  readonly matching: number;
  constructor(message: string, matching: number) {
    super(message);
    this.matching = matching;
  }
}

/** Seeded RNG for tests (mulberry32). Production uses Math.random. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Final wheel rotation (deg, clockwise) so slice `index` sits under the top pointer.
 * Slice i spans [i·a, (i+1)·a] measured clockwise from 12 o'clock.
 */
export function targetRotation(current: number, index: number, count: number, turns = 7): number {
  const a = 360 / count;
  const sliceCenter = index * a + a / 2;
  const wanted = (360 - sliceCenter) % 360;
  const base = current - (((current % 360) + 360) % 360);
  return base + turns * 360 + wanted;
}
