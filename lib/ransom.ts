/**
 * File:        lib/ransom.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-23
 * Version:     v1.0
 * Description: Collage art direction (v7): "ransom note" letters — each letter looks cut out
 *              of a different magazine. The look is generated, not random: the same text always
 *              gets the same letters (seeded by the text), so server and browser render
 *              identically (no hydration mismatch) and a title never "jumps" between visits.
 *
 *              Georgian has two cases (mkhedruli + Mtavruli), so we mix them per letter, the way
 *              real cut-outs mix capitals and small letters from different headlines.
 */

/** Paper chip + ink pairs, all from the brand palette (contrast ≥ 4.5 : 1 for each pair). */
export const CHIPS = [
  { bg: "#F1435E", fg: "#FFF1DC" },   // coral / cream
  { bg: "#FFF1DC", fg: "#163C3A" },   // cream / teal ink
  { bg: "#163C3A", fg: "#FFC93C" },   // teal / mustard
  { bg: "#FFC93C", fg: "#163C3A" },   // mustard / teal
  { bg: "#FFFAF2", fg: "#D92F4C" },   // paper / brand ink
  { bg: "#F8B4C0", fg: "#163C3A" },   // blush / teal
  { bg: "#1C1A17", fg: "#FFF1DC" },   // newsprint black / cream
] as const;

export type Face = "sans" | "cond" | "serif";
export type Letter = {
  ch: string;          // the character as drawn (case may be switched)
  space: boolean;
  chip: number;        // index into CHIPS
  face: Face;
  weight: 500 | 700 | 900;
  rot: number;         // degrees, small
  dy: number;          // em, vertical jitter
  scale: number;       // 0.88–1.14
  shape: 0 | 1 | 2 | 3; // which scissor-cut silhouette the chip gets (see CSS)
  outline: boolean;    // letter drawn as outline only (rare)
};

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

const MKHEDRULI = [0x10d0, 0x10f0];   // ა..ჰ
const MTAVRULI = 0x1c90 - 0x10d0;      // offset to Mtavruli (same as lib/mtavruli.ts)

function swapCase(ch: string, toCaps: boolean): string {
  const cp = ch.codePointAt(0)!;
  if (toCaps && cp >= MKHEDRULI[0] && cp <= MKHEDRULI[1]) return String.fromCodePoint(cp + MTAVRULI);
  if (!toCaps && cp >= MKHEDRULI[0] + MTAVRULI && cp <= MKHEDRULI[1] + MTAVRULI) return String.fromCodePoint(cp - MTAVRULI);
  return ch;
}

/**
 * Cut `text` into ransom letters. `caps` sets how many letters become Mtavruli (0–1).
 * Two neighbours never share a chip colour, so every letter reads as its own scrap.
 */
export function ransom(text: string, opts: { caps?: number; seed?: string } = {}): Letter[] {
  const caps = opts.caps ?? 0.55;
  if (caps < 0 || caps > 1) throw new Error(`ransom: caps must be 0–1, got ${caps}`);
  const r = rng(hash(opts.seed ?? text));
  const out: Letter[] = [];
  let prev = -1;
  for (const raw of text) {
    if (/\s/.test(raw)) { out.push({ ch: " ", space: true, chip: 0, face: "sans", weight: 900, rot: 0, dy: 0, scale: 1, shape: 0, outline: false }); continue; }
    let chip = Math.floor(r() * CHIPS.length);
    if (chip === prev) chip = (chip + 1 + Math.floor(r() * (CHIPS.length - 1))) % CHIPS.length;
    prev = chip;
    const f = r();
    const face: Face = f < 0.45 ? "cond" : f < 0.75 ? "sans" : "serif";
    const w = r();
    out.push({
      ch: swapCase(raw, r() < caps),
      space: false,
      chip,
      face,
      weight: face === "serif" ? 700 : w < 0.2 ? 500 : w < 0.5 ? 700 : 900,
      rot: Math.round((r() * 14 - 7) * 10) / 10,
      dy: Math.round((r() * 0.16 - 0.08) * 100) / 100,
      scale: Math.round((0.88 + r() * 0.26) * 100) / 100,
      shape: Math.floor(r() * 4) as Letter["shape"],
      outline: r() < 0.07,
    });
  }
  return out;
}
