/**
 * File:        lib/stickers.test.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: Every dish type in the catalogue has its sticker file — fail fast in CI, not as
 *              a broken image on the wheel.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { DISHES } from "./catalog.ts";

test("every dish has a sticker", () => {
  const missing = DISHES.filter((d) => !existsSync(new URL(`../public/stickers/${d.slug}.webp`, import.meta.url))).map((d) => d.slug);
  assert.deepEqual(missing, []);
});
