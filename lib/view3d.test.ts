/**
 * File:        lib/view3d.test.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: Camera projection + easing used to pin HTML onto the 3D wheel.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cubicBezier, GEO, onTable, project, spinEase } from "./view3d.ts";

test("the table centre projects to the horizontal middle", () => {
  const c = project([0, 0, 0]);
  assert.ok(Math.abs(c.x - 50) < 1e-9);
  assert.ok(c.y > 40 && c.y < 60);
});

test("the rim fits inside the box and the back is above the front", () => {
  const back = project(onTable(0, GEO.rim)), front = project(onTable(180, GEO.rim));
  const left = project(onTable(-90, GEO.rim)), right = project(onTable(90, GEO.rim));
  assert.ok(back.y < front.y);
  assert.ok(left.x > 0 && right.x < 100);
  assert.ok(Math.abs(left.x + right.x - 100) < 1e-9, "symmetric");
});

test("the far half looks smaller than the near half (perspective)", () => {
  const c = project([0, 0, 0]);
  const back = project(onTable(0, GEO.rim)), front = project(onTable(180, GEO.rim));
  assert.ok(c.y - back.y < front.y - c.y);
});

test("easing hits its ends and only goes up", () => {
  const e = cubicBezier(0.12, 0.75, 0.15, 1);
  assert.equal(e(0), 0); assert.equal(e(1), 1);
  let prev = 0;
  for (let t = 0.05; t < 1; t += 0.05) { const v = spinEase(t); assert.ok(v >= prev); prev = v; }
  assert.ok(Math.abs(cubicBezier(0, 0, 1, 1)(0.3) - 0.3) < 1e-3, "linear curve is linear");
});
