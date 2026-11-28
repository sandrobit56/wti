/**
 * File:        lib/table.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-28
 * Version:     v1.0
 * Description: The group table (left panel of the wheel): who sits at it, their names, and
 *              "ვინ იხდის?" — a decelerating roulette over the people that lands on one payer.
 *              Pure functions; the panel component only renders their results.
 */
export const TABLE_MAX = 5;
const YOU = "შენ";
const guestName = (n: number) => `სტუმარი ${n}`;

/** Adds the next guest, named with the lowest free number (2…5). Fails fast when the table is full. */
export function addGuest(names: string[]): string[] {
  if (names.length >= TABLE_MAX) throw new Error("addGuest: table is full");
  for (let n = 2; n <= TABLE_MAX; n++) if (!names.includes(guestName(n))) return [...names, guestName(n)];
  return [...names, guestName(names.length + 1)];
}

/** Removes a guest. Seat 0 is you — that's a bug, not a user action. */
export function removeGuest(names: string[], i: number): string[] {
  if (i === 0) throw new Error("removeGuest: you can't leave your own table");
  return names.filter((_, k) => k !== i);
}

/** Renames seat i; an empty name falls back to its default so nobody becomes invisible. */
export function renameGuest(names: string[], i: number, raw: string): string[] {
  const v = raw.trim().slice(0, 20);
  return names.map((n, k) => (k === i ? v || (k === 0 ? YOU : guestName(k + 1)) : n));
}

export type Step = { index: number; delay: number };

/** The highlight's path for "ვინ იხდის?": ~2 laps that slow down, ending on the payer. */
export function payerSteps(count: number, rng: () => number): Step[] {
  if (count < 2) throw new Error("payerSteps: needs at least two people");
  const payer = Math.floor(rng() * count);
  const total = count * 2 + payer + 1;          // two full laps, then on to the payer
  return Array.from({ length: total }, (_, k) => ({ index: k % count, delay: Math.round(60 + 340 * (k / (total - 1)) ** 2.2) }));
}
