/**
 * File:        lib/strip.test.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-25
 * Version:     v1.0
 * Description: Paper strips and cut shapes are deterministic and well-formed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { strip } from "./strip.ts";
import { cutPolygon, deckle, tornEdge } from "./cutout.ts";

test("same text → same strip (server and browser agree)", () => {
  assert.deepEqual(strip("რა ვჭამოთ"), strip("რა ვჭამოთ"));
  assert.notDeepEqual(strip("რა ვჭამოთ"), strip("ხინკალი"));
});

test("strip stays a gentle tilt with a valid 10-point cut", () => {
  for (const s of ["ა", "ხაჭაპური!", "გახდი კრიტიკოსი", ""]) {
    const { rot, clip, tapeRot } = strip(s);
    assert.ok(Math.abs(rot) <= 3.5, `rot ${rot}`);
    assert.ok(tapeRot >= 18 && tapeRot <= 34);
    assert.match(clip, /^polygon\((\d+(\.\d)?% \d+(\.\d)?%, ){9}\d+(\.\d)?% \d+(\.\d)?%\)$/);
  }
});

test("paper shapes are well-formed", () => {
  assert.match(cutPolygon("x"), /^polygon\((\d+\.\d% \d+\.\d%, ){11}\d+\.\d% \d+\.\d%\)$/);
  assert.throws(() => cutPolygon("x", 0));
  assert.match(deckle("p", 100), /^M.+Z$/);
  assert.match(tornEdge("t"), /^M0 40.+L1440 40Z$/);
});
