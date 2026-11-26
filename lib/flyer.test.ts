/**
 * File:        lib/flyer.test.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: Supra flyer rules: courses advance through toasts, chili costs lives, the
 *              last course wins, and every course dish exists in the catalogue (has a sticker).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { COURSES, START, onCatch, nextCourse, spawn, hits, LIVES } from "./flyer.ts";
import { DISHES } from "./catalog.ts";

test("every course dish is a real dish", () => {
  const slugs = new Set(DISHES.map((d) => d.slug));
  for (const c of COURSES) for (const s of c.dishes) assert.ok(slugs.has(s), s);
});

test("a full supra: toast after each course, win after the last", () => {
  let s = START;
  COURSES.forEach((c, i) => {
    for (let k = 0; k < c.need; k++) s = onCatch(s, { kind: "dish", slug: c.dishes[0] });
    assert.equal(s.phase, i === COURSES.length - 1 ? "won" : "toast");
    if (s.phase === "toast") s = nextCourse(s);
  });
  assert.equal(s.eaten.length, COURSES.reduce((a, c) => a + c.need, 0));
});

test("chili costs a life; the last one ends the game; nothing counts after", () => {
  let s = START;
  for (let i = 0; i < LIVES; i++) s = onCatch(s, { kind: "chili" });
  assert.equal(s.phase, "lost");
  assert.deepEqual(onCatch(s, { kind: "dish", slug: "khinkali" }), s);
});

test("spawn only brings the current course's dishes", () => {
  let n = 0; const rng = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  for (let c = 0; c < COURSES.length; c++) for (let i = 0; i < 200; i++) {
    const sp = spawn(c, rng);
    if (sp.kind === "dish") assert.ok(COURSES[c].dishes.includes(sp.slug));
  }
  assert.throws(() => spawn(9, rng));
});

test("hits", () => { assert.ok(hits(0, 0, 10, 15, 0, 6)); assert.ok(!hits(0, 0, 10, 17, 0, 6)); });

// v2: score + combo — dishes in a row multiply the points (×1…×5); chili breaks the chain
test("combo grows with each dish in a row and caps at ×5", () => {
  let s = START;
  const dish = { kind: "dish", slug: COURSES[0].dishes[0] } as const;
  s = onCatch(s, dish); assert.equal(s.combo, 1); assert.equal(s.score, 10);
  s = onCatch(s, dish); assert.equal(s.combo, 2); assert.equal(s.score, 30);
  s = onCatch(s, dish); s = onCatch(s, dish);       // ×3, ×4 → 30 + 30 + 40
  assert.equal(s.score, 100);
  s = nextCourse(onCatch(s, dish));                  // 5th dish finishes course 0 at ×5
  assert.equal(s.score, 150);
  for (let i = 0; i < 3; i++) s = onCatch(s, { kind: "dish", slug: COURSES[1].dishes[0] });
  assert.equal(s.combo, 5, "combo is capped at ×5");
});

test("chili resets the combo and keeps the score", () => {
  let s = onCatch(onCatch(START, { kind: "dish", slug: COURSES[0].dishes[0] }), { kind: "dish", slug: COURSES[0].dishes[0] });
  const before = s.score;
  s = onCatch(s, { kind: "chili" });
  assert.equal(s.combo, 0); assert.equal(s.score, before);
});
