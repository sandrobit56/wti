/**
 * File:        lib/security.test.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v1.0
 * Description: Tests for lib/security.ts (location coarsening, origin check, rate limit).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { coarse, isSameOrigin, rateLimiter } from "./security.ts";

test("coarse: GPS is snapped to ~110 m and bad input fails fast", () => {
  assert.deepEqual(coarse({ lat: 41.7151234, lng: 44.7529876 }), { lat: 41.715, lng: 44.753 });
  assert.throws(() => coarse({ lat: Number.NaN, lng: 44 }));
});

test("isSameOrigin: our page yes, another site no", () => {
  const req = (h: Record<string, string>) => new Request("https://wti-three.vercel.app/api/google-places?q=x", { headers: h });
  assert.equal(isSameOrigin(req({ "sec-fetch-site": "same-origin" })), true);
  assert.equal(isSameOrigin(req({ "sec-fetch-site": "cross-site" })), false);
  assert.equal(isSameOrigin(req({ origin: "https://evil.example" })), false);
  assert.equal(isSameOrigin(req({ origin: "https://wti-three.vercel.app" })), true);
});

test("rateLimiter: blocks after N per minute, recovers after the window", () => {
  const tooMany = rateLimiter(3);
  const t0 = 1_000_000;
  assert.deepEqual([1, 2, 3, 4].map((i) => tooMany("ip", t0 + i)), [false, false, false, true]);
  assert.equal(tooMany("ip", t0 + 61_000), false);
  assert.equal(tooMany("other", t0), false);
});
