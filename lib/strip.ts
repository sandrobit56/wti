/**
 * File:        lib/strip.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-25
 * Version:     v1.0 — replaces per-letter ransom scraps (v7) with one cut strip per phrase
 * Description: Geometry of a paper strip: a whole word or phrase cut out of paper in one
 *              go and taped down. Seeded by the text, so the same words always land with
 *              the same tilt, cut and tape — on the server and in the browser.
 */
import { hash, rng } from "./seed.ts";

export const TONES = ["paper", "ink", "red", "yellow"] as const;
export type Tone = (typeof TONES)[number];

export type StripShape = {
  rot: number;          // tilt in degrees, ±3.5
  clip: string;         // CSS polygon(...) — scissor cut, a few uneven corners per side
  tape: "left" | "right";
  tapeRot: number;      // degrees
};

export function strip(seed: string): StripShape {
  const r = rng(hash(seed));
  const rot = (r() * 2 - 1) * 3.5;
  // 4 points along top and bottom, 2 along each side; long edges get the most wobble
  const top = [0, 30, 65, 100].map((x) => `${x}% ${(r() * 6).toFixed(1)}%`);
  const right = `${(100 - r() * 1.5).toFixed(1)}% 50%`;
  const bottom = [100, 70, 35, 0].map((x) => `${x}% ${(100 - r() * 6).toFixed(1)}%`);
  const left = `${(r() * 1.5).toFixed(1)}% 50%`;
  return {
    rot,
    clip: `polygon(${[...top, right, ...bottom, left].join(", ")})`,
    tape: r() < 0.5 ? "left" : "right",
    tapeRot: 18 + r() * 16,
  };
}
