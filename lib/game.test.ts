/**
 * File:        lib/game.test.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-20
 * Version:     v1.0
 * Description: Rules of „კუჭის ჩელენჯი" (lib/game.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DISHES } from "./catalog.ts";
import { makeTicket, pace, pickSpawn, points, stomachPersona, topEaten, TICKET_BONUS } from "./game.ts";
import { seeded } from "./spin.ts";

test("ticket = 3 distinct dishes from the wheel, topped up when the wheel is short", () => {
  const wheel = ["khinkali", "pizza", "sushi", "ramen", "mtsvadi"];
  const t = makeTicket(wheel, seeded(3));
  assert.equal(new Set(t).size, 3);
  for (const s of t) assert.ok(wheel.includes(s));
  const short = makeTicket(["khinkali"], seeded(4));
  assert.equal(short.length, 3);
  assert.equal(short.includes("khinkali"), true);
  assert.throws(() => makeTicket(["nope"], seeded(1)));
});

test("chili share grows over the round; missing ticket dishes keep coming", () => {
  const share = (p: number) => { const r = seeded(9); let c = 0; for (let i = 0; i < 4000; i++) if (pickSpawn(r, [], p).kind === "chili") c++; return c / 4000; };
  assert.ok(share(0) < 0.2 && share(1) > 0.3, `${share(0)} ${share(1)}`);
  const r = seeded(2); let hits = 0;
  for (let i = 0; i < 2000; i++) { const s = pickSpawn(r, ["satsivi"], 0); if (s.kind === "dish" && s.slug === "satsivi") hits++; }
  assert.ok(hits > 300, String(hits));
});

test("points: persona ×2, ticket bonus", () => {
  const georgian = (d: (typeof DISHES)[number]) => d.cuisine === "ქართული";
  assert.equal(points("pizza", false, null), 1);
  assert.equal(points("khinkali", false, georgian), 2);
  assert.equal(points("khinkali", true, georgian), 2 + TICKET_BONUS);
  assert.throws(() => points("nope", false, null));
});

test("topEaten orders by count and pace speeds up", () => {
  assert.deepEqual(topEaten(["a", "b", "b", "c", "c", "c", "a", "d"]), ["c", "a", "b"]);
  assert.ok(pace(1, false).speed > pace(0, false).speed);
  assert.ok(pace(1, false).gap < pace(0, false).gap);
});

test("stomachPersona: what you ate picks the card", () => {
  assert.equal(stomachPersona([]), null);
  assert.equal(stomachPersona(["sushi", "ramen", "poke", "pizza"]), "sushi");
  assert.equal(stomachPersona(["khinkali", "khinkali", "pelmeni"]), "khinkali");
});
