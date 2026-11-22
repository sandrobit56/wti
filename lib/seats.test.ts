/**
 * File:        lib/seats.test.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: Seats agree with the spin: diner 0 always gets the winner targetRotation aimed at,
 *              and with 8 slices up to 5 diners never share a dish.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { seatAngles, sliceAt, MAX_DINERS } from "./seats.ts";
import { targetRotation } from "./spin.ts";

test("alone, you get the slice the spin aimed at (the fork)", () => {
  for (const [win, n, cur] of [[3, 8, 0], [7, 8, 999], [0, 5, -400], [4, 6, 123]]) {
    const rot = targetRotation(cur, win, n);
    assert.equal(sliceAt(rot, seatAngles(1)[0], n), win);
  }
});

test("with 8 slices every diner gets a different dish", () => {
  for (let d = 1; d <= MAX_DINERS; d++) {
    for (const win of [0, 3, 6]) {
      const rot = targetRotation(77, win, 8);
      const got = seatAngles(d).map((s) => sliceAt(rot, s, 8));
      assert.equal(new Set(got).size, d, `${d} diners: ${got}`);
    }
  }
});

test("bad counts fail fast", () => {
  assert.throws(() => seatAngles(0));
  assert.throws(() => seatAngles(6));
});

import { sharedVenue, seatsFor, bestWinners } from "./seats.ts";
const D = (slug: string, ...cats: string[]) => ({ slug, venue: { cats } });

test("sharedVenue finds the type most of the group can eat at", () => {
  const r = sharedVenue([D("khinkali", "georgian"), D("pizza", "pizza"), D("mtsvadi", "barbecue", "georgian")]);
  assert.deepEqual(r, { cat: "georgian", covered: 2 });
  assert.deepEqual(sharedVenue([D("a", "x"), D("b", "y")]), { cat: null, covered: 1 });
});

test("seatsFor matches sliceAt for the aimed rotation", () => {
  for (const [w, n, d] of [[2, 8, 3], [7, 8, 5], [0, 6, 4]]) {
    const rot = targetRotation(500, w, n);
    assert.deepEqual(seatsFor(w, n, d), seatAngles(d).map((s) => sliceAt(rot, s, n)));
  }
});

test("bestWinners returns exactly the seatings with the most diners at one venue type", () => {
  const cats = ["georgian", "pizza", "georgian", "sushi", "georgian", "burger", "pizza", "georgian"];
  const wheel = cats.map((c, i) => D(`d${i}`, c));
  for (const d of [2, 3, 4, 5]) {
    const score = (w: number) => sharedVenue(seatsFor(w, 8, d).map((i) => wheel[i])).covered;
    const all = wheel.map((_, w) => score(w));
    const r = bestWinners(wheel, d);
    assert.equal(r.covered, Math.max(...all));
    assert.deepEqual(r.winners, all.flatMap((c, w) => (c === r.covered ? [w] : [])));
  }
});

import { fillSeats } from "./seats.ts";
test("fillSeats swaps only the seated dishes that miss the shared venue", () => {
  const wheel = [D("a", "georgian"), D("b", "pizza"), D("c", "sushi"), D("d", "georgian")];
  const cand = [D("x", "georgian"), D("a", "georgian"), D("y", "pizza")];
  const out = fillSeats(wheel, [0, 1, 3], "georgian", cand, () => 0);
  assert.deepEqual(out.map((d) => d.slug), ["a", "x", "c", "d"]);
});
