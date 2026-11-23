/**
 * File:        lib/ransom.test.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-23
 * Version:     v1.0
 * Description: Ransom letters and paper shapes are deterministic and well-formed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHIPS, ransom } from "./ransom.ts";
import { cutPolygon, deckle, tornEdge } from "./cutout.ts";

test("same text → same letters (server and browser agree)", () => {
  assert.deepEqual(ransom("რა ვჭამოთ"), ransom("რა ვჭამოთ"));
  assert.notDeepEqual(ransom("რა ვჭამოთ"), ransom("რა ვჭამოთ", { seed: "other" }));
});

test("keeps every character and spaces in place; only the case may change", () => {
  const text = "გახდი კრიტიკოსი?";
  const out = ransom(text);
  assert.equal(out.length, [...text].length);
  out.forEach((l, i) => {
    const src = [...text][i];
    if (src === " ") { assert.ok(l.space); return; }
    const a = l.ch.codePointAt(0)!, b = src.codePointAt(0)!;
    assert.ok(a === b || a - b === 0x1c90 - 0x10d0, `letter ${i} changed: ${src} → ${l.ch}`);
  });
});

test("neighbouring letters never share a chip colour", () => {
  const out = ransom("ხინკალიხაჭაპურიმწვადი").filter((l) => !l.space);
  for (let i = 1; i < out.length; i++) assert.notEqual(out[i].chip, out[i - 1].chip);
  out.forEach((l) => assert.ok(l.chip >= 0 && l.chip < CHIPS.length));
});

test("caps option is validated and respected at the ends", () => {
  assert.throws(() => ransom("ა", { caps: 2 }));
  assert.ok(ransom("ააააააა", { caps: 1 }).every((l) => l.ch === "Ა"));
  assert.ok(ransom("ააააააა", { caps: 0 }).every((l) => l.ch === "ა"));
});

test("paper shapes are well-formed", () => {
  assert.match(cutPolygon("x"), /^polygon\((\d+\.\d% \d+\.\d%, ){11}\d+\.\d% \d+\.\d%\)$/);
  assert.throws(() => cutPolygon("x", 0));
  assert.match(deckle("p", 100), /^M.+Z$/);
  assert.match(tornEdge("t"), /^M0 40.+L1440 40Z$/);
});
