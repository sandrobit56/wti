/**
 * File:        lib/game.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-20
 * Version:     v1.1 — stomachPersona(): what you ate → the persona card shown at game over
 * Description: Pure rules of „კუჭის ჩელენჯი" (the 3-lane game section). No DOM, rng
 *   injected → unit-tested. The component only moves things and calls these.
 *
 *   Ecosystem ties (why the game lives in this app, not beside it):
 *   - the ORDER TICKET is 3 dishes from the user's current wheel (= their filters);
 *   - dishes of the user's persona score double;
 *   - game over → the 3 most-eaten dishes become dish tags (popup: versions,
 *     places, delivery) — "let your stomach choose", like the wheel.
 */
import { DISHES, type Dish } from "./catalog.ts";
import type { Rng } from "./spin.ts";
import { PERSONAS } from "./personas.ts";
import { PERSONA_IDS, type PersonaId } from "./quiz.ts";

export const LANES = 3;
export const ROUND_S = 60;
export const LIVES = 3;
export const TICKET_SIZE = 3;
export const TICKET_BONUS = 3;

const BY_SLUG = new Map(DISHES.map((d) => [d.slug, d]));

export type Spawn = { kind: "dish"; slug: string } | { kind: "chili" };

/** 3 distinct dishes from the wheel; topped up from the catalog if the wheel is short. */
export function makeTicket(wheelSlugs: string[], rng: Rng): string[] {
  for (const s of wheelSlugs) if (!BY_SLUG.has(s)) throw new Error(`makeTicket: unknown dish ${s}`);
  const pool = [...new Set(wheelSlugs)];
  const out: string[] = [];
  while (out.length < TICKET_SIZE && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const rest = DISHES.map((d) => d.slug).filter((s) => !out.includes(s));
  while (out.length < TICKET_SIZE) out.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
  return out;
}

/**
 * What enters next. Chili share grows 15% → 35% over the round (difficulty);
 * a dish still missing from the ticket comes 30% of the time so the ticket is
 * always reachable; otherwise any catalog dish.
 */
export function pickSpawn(rng: Rng, ticketLeft: string[], progress: number): Spawn {
  const p = Math.min(1, Math.max(0, progress));
  if (rng() < 0.15 + 0.2 * p) return { kind: "chili" };
  if (ticketLeft.length && rng() < 0.3) return { kind: "dish", slug: ticketLeft[Math.floor(rng() * ticketLeft.length)] };
  return { kind: "dish", slug: DISHES[Math.floor(rng() * DISHES.length)].slug };
}

/** Points for eating one dish: 1, ×2 for the persona's dishes, +3 when it stamps the ticket. */
export function points(slug: string, stampsTicket: boolean, personaMatches: ((d: Dish) => boolean) | null): number {
  const d = BY_SLUG.get(slug);
  if (!d) throw new Error(`points: unknown dish ${slug}`);
  const base = personaMatches && personaMatches(d) ? 2 : 1;
  return base + (stampsTicket ? TICKET_BONUS : 0);
}

/** Most-eaten first; ties keep eating order. */
export function topEaten(eaten: string[], n = 3): string[] {
  const count = new Map<string, number>();
  for (const s of eaten) count.set(s, (count.get(s) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([s]) => s);
}

/** Speed (px/s) and seconds between spawns at a point of the round. */
export function pace(progress: number, reduceMotion: boolean): { speed: number; gap: number } {
  const p = Math.min(1, Math.max(0, progress));
  const k = reduceMotion ? 0.7 : 1;
  return { speed: (240 + 200 * p) * k, gap: (0.85 - 0.4 * p) / k };
}

/** How many catalogue dishes each persona's rule covers (its breadth). */
const BREADTH = new Map(PERSONA_IDS.map((id) => [id, DISHES.filter((d) => PERSONAS[id].matches(d)).length]));

/**
 * "შენმა კუჭმა გამოავლინა": which persona fits what was eaten.
 * Raw counts would always crown the broad catch-alls (გემოს მაძიებელი matches every
 * non-Georgian dish), so each persona scores matches / √breadth — a narrow persona
 * that fits beats a wide one that merely includes. Ties → first listed. Nothing eaten → null.
 */
export function stomachPersona(eaten: string[]): PersonaId | null {
  if (!eaten.length) return null;
  const dishes = eaten.map((s) => { const d = BY_SLUG.get(s); if (!d) throw new Error(`stomachPersona: unknown dish ${s}`); return d; });
  let best: PersonaId | null = null, top = 0;
  for (const id of PERSONA_IDS) {
    const score = dishes.filter((d) => PERSONAS[id].matches(d)).length / Math.sqrt(BREADTH.get(id)!);
    if (score > top) { top = score; best = id; }
  }
  return best;
}
