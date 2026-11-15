/**
 * File:        lib/spin.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v2.0 — location: only dishes with a venue in the radius; GEL price bands
 * Description: Pure spin logic. The winner is decided HERE, before any animation;
 *              the wheel only travels to it. Randomness is injected (rng) so tests
 *              are deterministic.
 *
 *   weight = baseWeight × timeOfDay × tasteChips(×1.5 each) — clamped to 0.1…5
 *   hard filters (budget, diet, "not today") remove a dish entirely.
 */
import { priceBand, type Dish, type MealTime } from "./catalog.ts";

export type Taste = "spicy" | "light" | "georgian" | "sweet" | "fast";
export type Diet = "vegetarian" | "vegan";

export type Filters = {
  priceMax: 1 | 2 | 3;
  tastes: Taste[];
  diet: Diet[];
};

export const DEFAULT_FILTERS: Filters = { priceMax: 3, tastes: [], diet: [] };

export type SpinContext = {
  filters: Filters;
  now: Date;
  excluded: string[];          // slugs hidden for 24h ("დღეს არა")
  random: boolean;             // "შემთხვევით": ignores filters and weights; location + "not today" still apply
  available: Set<string> | null; // slugs with ≥1 venue in the chosen radius; null = no place chosen (whole city)
};

export type Rng = () => number; // [0, 1)

export const WHEEL_SIZE = 8;
export const MIN_WHEEL = 3;

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
};

/** Hard filters: true = the dish may appear on the wheel. */
export function isAllowed(d: Dish, ctx: SpinContext): boolean {
  if (ctx.excluded.includes(d.slug)) return false;
  if (ctx.available && !ctx.available.has(d.slug)) return false;
  if (ctx.random) return true;
  const f = ctx.filters;
  if (priceBand(d) > f.priceMax) return false;
  if (f.diet.includes("vegan") && !d.vegan) return false;
  if (f.diet.includes("vegetarian") && !d.vegetarian) return false;
  return true;
}

/** Soft preferences. Only called for allowed dishes. */
export function weightOf(d: Dish, ctx: SpinContext): number {
  if (ctx.random) return 1;
  const slot = mealTimeAt(ctx.now);
  let w: number = d.baseWeight;
  if (!d.meals.includes(slot)) w *= 0.3;
  else if (slot === "საუზმე" || slot === "ღამე") w *= 2;
  for (const t of ctx.filters.tastes) if (TASTE_MATCH[t](d)) w *= 1.5;
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
  while (wheel.length < Math.min(WHEEL_SIZE, pool.length)) {
    const i = weightedIndex(weights, rng);
    wheel.push(pool[i]);
    wheelWeights.push(weights[i]);
    pool.splice(i, 1);
    weights.splice(i, 1);
  }
  return { wheel, winnerIndex: weightedIndex(wheelWeights, rng), matching };
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
export function targetRotation(current: number, index: number, count: number, turns = 5): number {
  const a = 360 / count;
  const sliceCenter = index * a + a / 2;
  const wanted = (360 - sliceCenter) % 360;
  const base = current - (((current % 360) + 360) % 360);
  return base + turns * 360 + wanted;
}
