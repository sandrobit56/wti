/**
 * File:        lib/seats.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: Group mode ("ვინ რას შეჭამს"): up to 5 diners sit evenly around the lazy-susan.
 *              Diner 0 sits under the fork (top). When the table stops, each diner gets the slice
 *              in front of them — one spin, everyone served. Pure math, no React.
 */
export const MAX_DINERS = 5;

/** Seat angles, degrees clockwise from 12 o'clock. Diner 0 is always at the top (the fork). */
export function seatAngles(count: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_DINERS) throw new Error(`seatAngles: bad count ${count}`);
  return Array.from({ length: count }, (_, i) => (i * 360) / count);
}

/** Which slice is in front of a seat, for a wheel of n slices turned `rotation` degrees clockwise. */
export function sliceAt(rotation: number, seatDeg: number, n: number): number {
  if (n < 1) throw new Error("sliceAt: empty wheel");
  const a = 360 / n;
  const local = (((seatDeg - rotation) % 360) + 360) % 360; // seat position in the plate's own frame
  return Math.floor(local / a) % n;
}
