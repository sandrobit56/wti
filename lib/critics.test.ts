/**
 * File:        lib/critics.test.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: Sign-up validation: trims, lowercases email, rejects bad input field by field.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSignup, LIMITS } from "./critics.ts";

const good = { name: "  ნიკა  ", email: " Nika@Example.GE ", district: "ვაკე", loves: "ხინკალი", consent: true };

test("accepts and cleans a good sign-up", () => {
  assert.deepEqual(checkSignup(good), { ok: true, value: { name: "ნიკა", email: "nika@example.ge", district: "ვაკე", loves: "ხინკალი" } });
});

test("rejects field by field", () => {
  const field = (x: object) => { const r = checkSignup({ ...good, ...x }); return r.ok ? null : r.field; };
  assert.equal(field({ name: " " }), "name");
  assert.equal(field({ name: "ა".repeat(LIMITS.name + 1) }), "name");
  assert.equal(field({ email: "nika@" }), "email");
  assert.equal(field({ district: "პარიზი" }), "district");
  assert.equal(field({ loves: "ა".repeat(LIMITS.loves + 1) }), "loves");
  assert.equal(field({ consent: false }), "consent");
  assert.equal(field({ consent: "true" }), "consent"); // must be a real boolean
});

test("optional fields may be empty", () => {
  const r = checkSignup({ ...good, district: "", loves: "" });
  assert.ok(r.ok && r.value.district === null && r.value.loves === null);
});
