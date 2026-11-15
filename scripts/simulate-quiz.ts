/**
 * File:        scripts/simulate-quiz.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0
 * Description: Balance check for lib/quiz.ts. Runs all 4^7 answer combinations,
 *              prints persona win share, unresolved ties, and fails (exit 1) if any
 *              persona is unreachable, a signal key is owned by two questions,
 *              or one persona wins more than 2.5× the fair share.
 *              Run: node scripts/simulate-quiz.ts
 */
import { PERSONA_IDS, QUESTIONS, scoreQuiz, type PersonaId } from "../lib/quiz.ts";

// 1. each signal key belongs to exactly one question
const owner = new Map<string, string>();
for (const q of QUESTIONS) for (const a of q.answers) for (const k of Object.keys(a.signals ?? {})) {
  const o = owner.get(k);
  if (o && o !== q.id) throw new Error(`signal "${k}" set by both ${o} and ${q.id}`);
  owner.set(k, q.id);
}

// 2. brute force all combinations
const wins = Object.fromEntries(PERSONA_IDS.map((p) => [p, 0])) as Record<PersonaId, number>;
let ties = 0, total = 0;
const walk = (i: number, acc: string[]) => {
  if (i === QUESTIONS.length) {
    const r = scoreQuiz(acc);
    wins[r.persona]++; total++;
    if (r.scores[r.persona] === r.scores[r.runnerUp]) ties++;
    if (r.signals.vegetarian && (r.persona === "mtsvadi" || r.persona === "shawarma"))
      throw new Error(`vegetarian got ${r.persona}: ${acc.join(",")}`);
    if (r.signals.spice === 0 && r.persona === "spice")
      throw new Error(`no-spice got spice: ${acc.join(",")}`);
    return;
  }
  for (const a of QUESTIONS[i].answers) walk(i + 1, [...acc, a.id]);
};
walk(0, []);

const fair = 100 / PERSONA_IDS.length;
const rows = PERSONA_IDS.map((p) => ({ p, share: (wins[p] / total) * 100 }))
  .sort((a, b) => b.share - a.share);
for (const r of rows) console.log(`${r.p.padEnd(9)} ${r.share.toFixed(1).padStart(5)}%  ${"█".repeat(Math.round(r.share))}`);
console.log(`combinations: ${total}, score ties resolved by tie-break: ${((ties / total) * 100).toFixed(1)}%`);

const bad = rows.filter((r) => r.share === 0 || r.share > fair * 2.5);
if (bad.length) { console.error("UNBALANCED:", bad); process.exit(1); }
console.log("OK: every persona reachable, none dominates");
