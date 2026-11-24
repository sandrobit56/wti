/**
 * File:        lib/cutout.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-23
 * Version:     v1.0
 * Description: Scissor-cut and torn-paper shapes for the collage look (v7), all seeded so
 *              they're stable between server and browser:
 *               - cutPolygon: a rough hand-cut polygon (CSS clip-path) for photo cut-outs
 *               - deckle:     an SVG path of a circle with a torn, uneven edge (paper plate)
 *               - tornEdge:   an SVG path of a torn horizontal paper edge (section seams)
 */
import { hash, rng } from "./seed.ts";

/** Rough polygon around a box, as a CSS `polygon(...)` in %. `cuts` = corners per side. */
export function cutPolygon(seed: string, cuts = 3, jitter = 4): string {
  if (cuts < 1) throw new Error(`cutPolygon: cuts must be ≥ 1, got ${cuts}`);
  const r = rng(hash(seed));
  const j = () => r() * jitter;
  const pts: string[] = [];
  const side = (from: [number, number], to: [number, number], inward: [number, number]) => {
    for (let k = 0; k < cuts; k++) {
      const t = k / cuts;
      const x = from[0] + (to[0] - from[0]) * t + inward[0] * j();
      const y = from[1] + (to[1] - from[1]) * t + inward[1] * j();
      pts.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
    }
  };
  side([0, 0], [100, 0], [0, 1]);
  side([100, 0], [100, 100], [-1, 0]);
  side([100, 100], [0, 100], [0, -1]);
  side([0, 100], [0, 0], [1, 0]);
  return `polygon(${pts.join(", ")})`;
}

/** Closed SVG path: circle of radius `r` at the origin with a torn edge (`amp` = tear depth). */
export function deckle(seed: string, r: number, amp = r * 0.03, steps = 120): string {
  const rand = rng(hash(seed));
  let d = "", prev = 0;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    prev = prev * 0.55 + (rand() - 0.5) * 0.9;       // correlated noise: fibres, not zigzag
    const rr = r + prev * amp;
    d += `${i ? "L" : "M"}${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)}`;
  }
  return d + "Z";
}

/** SVG path for a torn edge across `w` × `h` (filled below the tear). */
export function tornEdge(seed: string, w = 1440, h = 40, steps = 90): string {
  const rand = rng(hash(seed));
  let d = `M0 ${h}`, prev = 0;
  for (let i = 0; i <= steps; i++) {
    prev = prev * 0.5 + (rand() - 0.5);
    const y = h * 0.5 + prev * h * 0.55;
    d += `L${((i / steps) * w).toFixed(1)} ${Math.max(0, Math.min(h, y)).toFixed(1)}`;
  }
  return `${d}L${w} ${h}Z`;
}

/** Rough hand-cut polygon around a w × h box centred on the origin, as SVG `points`. */
export function cutPoints(seed: string, w: number, h: number, cuts = 3, jitter = 0.07): string {
  if (cuts < 1) throw new Error(`cutPoints: cuts must be ≥ 1, got ${cuts}`);
  const r = rng(hash(seed));
  const pts: string[] = [];
  const x0 = -w / 2, y0 = -h / 2;
  const corners: [number, number][] = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
  for (let s = 0; s < 4; s++) {
    const [ax, ay] = corners[s], [bx, by] = corners[(s + 1) % 4];
    for (let k = 0; k < cuts; k++) {
      const t = k / cuts;
      const jx = (r() - 0.5) * w * jitter, jy = (r() - 0.5) * h * jitter;
      pts.push(`${(ax + (bx - ax) * t + jx).toFixed(1)},${(ay + (by - ay) * t + jy).toFixed(1)}`);
    }
  }
  return pts.join(" ");
}
