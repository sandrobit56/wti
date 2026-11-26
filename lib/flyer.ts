/**
 * File:        lib/flyer.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-27
 * Version:     v2.0 — score + combo: dishes in a row multiply the points (×1…×5), chili breaks
 *              the chain (and costs a life). Gives a reason to replay: beat your best.
 *              v1.0
 * Description: "სუფრის მფრინავი" — game rules, no React, no canvas.
 *              The mascot flies over a turning supra. A supra has courses (salads → hot dishes →
 *              grill → sweets); each course floats its own dishes in, and the tamada raises a
 *              toast between courses. Catch the course's dishes to finish it; chili costs a life.
 *              Finish all four = the supra is done. What you ate reveals your stomach's persona.
 *              Technique from yakudoo's "The Aviator" (fly, collect, avoid); story is ours.
 */
export type Course = { name: string; toast: string; dishes: string[]; need: number };

export const COURSES: readonly Course[] = [
  { name: "სალათები", toast: "გაუმარჯოს მასპინძელს!", dishes: ["pkhali", "georgian-salad", "badrijani", "lobio"], need: 5 },
  { name: "ცხელი", toast: "გაუმარჯოს სტუმრებს!", dishes: ["khinkali", "khachapuri", "kharcho", "chakapuli"], need: 7 },
  { name: "მწვადი", toast: "გაუმარჯოს მეგობრობას!", dishes: ["mtsvadi", "kupati", "shkmeruli", "ojakhuri"], need: 7 },
  { name: "ტკბილეული", toast: "სუფრა დასრულდა — გაუმარჯოს ყველას!", dishes: ["georgian-sweets", "cake", "ice-cream"], need: 5 },
];
export const LIVES = 3;

export type Rng = () => number;
export type Spawn = { kind: "dish"; slug: string } | { kind: "chili" };

/** Later courses bring more chili and a faster table. */
export function chiliChance(course: number): number { return 0.18 + course * 0.06; }
export function speedOf(course: number): number { return 260 + course * 55; }          // px per second
export function gapOf(course: number): number { return Math.max(0.55, 1.05 - course * 0.13); } // seconds between items

export function spawn(course: number, rng: Rng): Spawn {
  const c = COURSES[course];
  if (!c) throw new Error(`spawn: no course ${course}`);
  if (rng() < chiliChance(course)) return { kind: "chili" };
  return { kind: "dish", slug: c.dishes[Math.floor(rng() * c.dishes.length)] };
}

export type State = { course: number; got: number; lives: number; eaten: string[]; score: number; combo: number; phase: "play" | "toast" | "won" | "lost" };
export const START: State = { course: 0, got: 0, lives: LIVES, eaten: [], score: 0, combo: 0, phase: "play" };
export const POINTS = 10, COMBO_MAX = 5;

/** Apply one catch. Finishing a course → "toast" (or "won" after the last); last life → "lost". */
export function onCatch(s: State, item: Spawn): State {
  if (s.phase !== "play") return s;
  if (item.kind === "chili") {
    const lives = s.lives - 1;
    return { ...s, lives, combo: 0, phase: lives <= 0 ? "lost" : "play" };
  }
  const got = s.got + 1;
  const eaten = [...s.eaten, item.slug];
  const combo = Math.min(COMBO_MAX, s.combo + 1);
  const score = s.score + POINTS * combo;
  if (got < COURSES[s.course].need) return { ...s, got, eaten, combo, score };
  return { ...s, got, eaten, combo, score, phase: s.course === COURSES.length - 1 ? "won" : "toast" };
}

/** After the toast: next course, counter reset. */
export function nextCourse(s: State): State {
  if (s.phase !== "toast") throw new Error(`nextCourse: phase is ${s.phase}`);
  return { ...s, course: s.course + 1, got: 0, phase: "play" };
}

/** Circle overlap test (mascot vs item), centres and radii in the same units. */
export function hits(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy <= (ar + br) * (ar + br);
}
