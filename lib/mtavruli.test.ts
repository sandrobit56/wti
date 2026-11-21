/**
 * File:        lib/mtavruli.test.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: toMtavruli maps every Georgian letter and leaves everything else alone.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { toMtavruli } from "./mtavruli.ts";

test("maps Mkhedruli to Mtavruli", () => {
  assert.equal(toMtavruli("ა"), "Ა");
  assert.equal(toMtavruli("ჰ"), "Ჰ");
});

test("keeps spaces, punctuation, digits and Latin", () => {
  assert.equal(toMtavruli("რა 7?„X“"), "ᲠᲐ 7?„X“");
});

test("already-Mtavruli text stays the same", () => {
  const once = toMtavruli("კუჭის ჩელენჯი");
  assert.equal(toMtavruli(once), once);
});
