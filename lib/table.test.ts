import { test } from "node:test";
import assert from "node:assert/strict";
import { addGuest, payerSteps, removeGuest, renameGuest, TABLE_MAX } from "./table.ts";

test("addGuest appends the next free 'სტუმარი N' and stops at the max", () => {
  let t = ["შენ"];
  t = addGuest(t); assert.deepEqual(t, ["შენ", "სტუმარი 2"]);
  t = removeGuest(addGuest(t), 1); assert.deepEqual(t, ["შენ", "სტუმარი 3"]);
  t = addGuest(t); assert.deepEqual(t, ["შენ", "სტუმარი 3", "სტუმარი 2"], "reuses the lowest free number");
  while (t.length < TABLE_MAX) t = addGuest(t);
  assert.throws(() => addGuest(t), /full/);
});

test("renameGuest trims and falls back to the default when emptied", () => {
  assert.deepEqual(renameGuest(["შენ", "სტუმარი 2"], 1, "  ნინო "), ["შენ", "ნინო"]);
  assert.deepEqual(renameGuest(["შენ", "ნინო"], 1, "   "), ["შენ", "სტუმარი 2"]);
  assert.deepEqual(renameGuest(["შენ"], 0, ""), ["შენ"]);
});

test("removeGuest never removes you", () => {
  assert.throws(() => removeGuest(["შენ", "ნინო"], 0), /you/);
});

test("payerSteps ends on the chosen payer and slows down", () => {
  const s = payerSteps(4, () => 0.6);
  assert.equal(s.at(-1)!.index, 2);
  assert.ok(s.length >= 10);
  for (let i = 1; i < s.length; i++) assert.ok(s[i].delay >= s[i - 1].delay);
  assert.throws(() => payerSteps(1, Math.random), /two/);
});
