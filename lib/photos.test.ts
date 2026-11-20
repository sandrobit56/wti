/**
 * File:        lib/photos.test.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-20
 * Version:     v1.0
 * Description: Photo sources: every gap has an Unsplash query + relevance keywords;
 *              Commons wins over Unsplash; the relevance gate rejects wrong photos.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import commons from "../data/photos.json" with { type: "json" };
import { check, relevant } from "../scripts/fetch-unsplash.ts";
import { typePhoto } from "./photos.ts";

test("every photo gap has an Unsplash query and type keywords", () => {
  assert.deepEqual(check(commons as Record<string, unknown>), []);
});

test("relevance gate: a khinkali slot rejects a pasta photo", () => {
  assert.equal(relevant("a plate of dumplings on a table", "khinkali"), true);
  assert.equal(relevant("spaghetti with tomato sauce", "khinkali"), false);
});

test("Commons photo wins over Unsplash", () => {
  assert.equal(typePhoto("khinkali")?.kind, "commons");
});
