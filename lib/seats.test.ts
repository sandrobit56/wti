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

test("diner 0 gets the slice the spin aimed at", () => {
  for (const [win, n, cur] of [[3, 8, 0], [7, 8, 999], [0, 5, -400], [4, 6, 123]]) {
    const rot = targetRotation(cur, win, n);
    assert.equal(sliceAt(rot, 0, n), win);
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
