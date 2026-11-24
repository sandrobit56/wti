/**
 * File:        lib/seed.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-25
 * Version:     v1.0 — moved out of lib/ransom.ts when the ransom letters were retired
 * Description: Deterministic randomness for the collage look. Server and browser must draw
 *              the same scraps, or React hydration breaks — so no Math.random here.
 */

/** mulberry32: tiny, fast, deterministic PRNG. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash → 32-bit seed. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (const c of s) { h ^= c.codePointAt(0)!; h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
