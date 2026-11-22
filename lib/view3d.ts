/**
 * File:        lib/view3d.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.1 — high camera (62°), squarer box
 * Description: The 3D wheel's camera as plain math, shared by the three.js scene and the HTML
 *              layer on top of it (hub button, diners, place cards, drag zone). Because both use
 *              the same numbers, HTML lands exactly on the rendered plate — no measuring renders.
 *              Also: the CSS spin easing as a JS function, so the 3D spin feels like the old one.
 *
 *              Angles: 0 = back of the table (far from the camera), clockwise seen from above —
 *              the same convention as lib/seats.ts and the old 2D wheel's "top".
 */

export type View = { elev: number; fov: number };
export type Vec3 = [number, number, number];

/** Long lens from far away: the near edge doesn't balloon, the far edge doesn't squash. */
export const VIEW: View = { elev: 62, fov: 15 };   // high, almost top-down: the plate reads as a full circle (Sandro's pick)
/** Width / height of the wheel box (and the canvas). */
export const ASPECT = 1 / 0.92;
/** World radius that must fit the frame width (rim + drum). */
const FIT = 1.3;
const TARGET: Vec3 = [0, -0.02, 0];

/** Geometry shared with the scene. */
export const GEO = { plate: 1, rim: 1.16, top: 0.03, hubR: 0.3, hubTop: 0.19 } as const;

export function cameraPosition(v: View = VIEW): Vec3 {
  if (v.fov <= 0 || v.fov >= 90) throw new Error(`view3d: fov must be 0–90, got ${v.fov}`);
  const d = FIT / Math.tan(((v.fov / 2) * Math.PI) / 180) / Math.min(1, ASPECT);
  const e = (v.elev * Math.PI) / 180;
  return [0, d * Math.sin(e), d * Math.cos(e)];
}
export const cameraTarget = (): Vec3 => TARGET;

/** Plate-local point at angle `deg` (0 = back, clockwise from above), radius r, height y. */
export function onTable(deg: number, r: number, y = 0): Vec3 {
  const a = (deg * Math.PI) / 180;
  return [Math.sin(a) * r, y, -Math.cos(a) * r];
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

/** World point → position in the wheel box, in % (x of width, y of height). */
export function project(p: Vec3, v: View = VIEW): { x: number; y: number } {
  const c = cameraPosition(v);
  const f = norm(sub(TARGET, c));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const q = sub(p, c);
  const z = dot(q, f);
  if (z <= 0) throw new Error("view3d: point is behind the camera");
  const t = Math.tan(((v.fov / 2) * Math.PI) / 180);
  const nx = dot(q, r) / (z * t * ASPECT), ny = dot(q, u) / (z * t);
  return { x: ((nx + 1) / 2) * 100, y: ((1 - ny) / 2) * 100 };
}

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of time 0–1 (Newton + bisection on x). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const bx = (s: number) => 3 * x1 * s * (1 - s) ** 2 + 3 * x2 * s * s * (1 - s) + s ** 3;
  const by = (s: number) => 3 * y1 * s * (1 - s) ** 2 + 3 * y2 * s * s * (1 - s) + s ** 3;
  const dx = (s: number) => 3 * x1 * (1 - s) ** 2 + 6 * (x2 - x1) * s * (1 - s) + 3 * (1 - x2) * s * s;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let k = 0; k < 6; k++) { const d = dx(s); if (Math.abs(d) < 1e-6) break; s -= (bx(s) - t) / d; }
    if (s < 0 || s > 1 || Math.abs(bx(s) - t) > 1e-4) {
      let lo = 0, hi = 1; s = t;
      for (let k = 0; k < 30; k++) { s = (lo + hi) / 2; if (bx(s) < t) lo = s; else hi = s; }
    }
    return by(s);
  };
}
/** The wheel's spin easing (same curve the CSS wheel used). */
export const spinEase = cubicBezier(0.12, 0.75, 0.15, 1);
