/**
 * File:        components/Quiz.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-16
 * Version:     v1.0
 * Description: The persona quiz: 7 questions × 4 answers, one per screen, then
 *              the persona card with what it will change on the wheel.
 *              Scoring is lib/quiz.ts (pure, tested); this file is only UI.
 *              Native <dialog>: Esc / × / backdrop close it, focus is handled
 *              by the browser.
 */
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { DISHES, priceBand } from "@/lib/catalog.ts";
import { PERSONAS } from "@/lib/personas.ts";
import { QUESTIONS, applyQuiz, scoreQuiz } from "@/lib/quiz.ts";

type Props = {
  onClose: () => void;
  onApply: (answers: string[]) => void;
};

const TASTE_LABEL = { spicy: "ცხარე", light: "მსუბუქი", fast: "სწრაფი" } as const;
const BUDGET_LABEL = { 1: "ბიუჯეტი: 15 ₾-მდე", 2: "ბიუჯეტი: 35 ₾-მდე", 3: "ბიუჯეტი: ნებისმიერი" } as const;

export function Quiz({ onClose, onApply }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const step = answers.length;                 // 0…7; 7 = result screen
  const done = step === QUESTIONS.length;

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal quiz"
      aria-labelledby="quiz-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal__card">
        <button className="modal__close" onClick={onClose} aria-label="დახურვა">×</button>

        {!done && (
          <>
            <div className="quiz__top">
              <span className="caps">კითხვა {step + 1} / {QUESTIONS.length}</span>
              {step > 0 && <button className="link quiz__back" onClick={() => setAnswers((a) => a.slice(0, -1))} aria-label="წინა კითხვა">← უკან</button>}
            </div>
            <div className="quiz__bar" role="progressbar" aria-valuemin={0} aria-valuemax={QUESTIONS.length} aria-valuenow={step}>
              <span style={{ width: `${(step / QUESTIONS.length) * 100}%` }} />
            </div>
            <h2 id="quiz-title" className="quiz__q" key={QUESTIONS[step].id}>{QUESTIONS[step].text}</h2>
            <div className="quiz__answers">
              {QUESTIONS[step].answers.map((a, i) => (
                <button key={a.id} className="quiz__a" onClick={() => setAnswers((prev) => [...prev, a.id])}>
                  <span className="quiz__letter">{"აბგდ"[i]}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </>
        )}

        {done && <ResultView answers={answers} onApply={onApply} onRestart={() => setAnswers([])} />}
      </div>
    </dialog>
  );
}

function ResultView({ answers, onApply, onRestart }: { answers: string[]; onApply: (a: string[]) => void; onRestart: () => void }) {
  const r = scoreQuiz(answers);
  const p = PERSONAS[r.persona];
  const half = PERSONAS[r.runnerUp];
  const applied = applyQuiz(r);
  // Examples must respect the filters this result sets (a vegetarian never sees შაურმა).
  const veg = applied.filters.diet.length > 0;
  const examples = DISHES
    .filter((d) => p.matches(d) && priceBand(d) <= applied.filters.priceMax && (!veg || d.vegetarian))
    .sort((a, b) => b.baseWeight - a.baseWeight)
    .slice(0, 4);
  const changes = [
    BUDGET_LABEL[applied.filters.priceMax],
    ...applied.filters.tastes.map((t) => TASTE_LABEL[t]),
    ...(applied.filters.diet.length ? ["ვეგეტარიანული"] : []),
    ...(applied.prefs.spiceAvoid ? ["ძალიან ცხარე — იშვიათად"] : []),
    ...(applied.prefs.lenten ? ["მარხვის კერძები — ხშირად"] : []),
    ...(applied.prefs.novelty ? ["ახალი სამზარეულოები — ხშირად"] : []),
  ];

  return (
    <div className="quiz__result">
      <header className="modal__hero quiz__hero">
        <Image src={`/icons/${p.icon}.svg`} alt="" width={88} height={88} />
        <p className="caps">შენი პერსონა</p>
        <h2 id="quiz-title" className="modal__name">{p.name}</h2>
        <p className="quiz__line">{p.line}</p>
        <p className="modal__meta">ნახევრად — {half.name}</p>
      </header>

      <section className="modal__section">
        <h3><span className="dot dot--green" />ბორბალი უფრო ხშირად შემოგთავაზებს</h3>
        {examples.length > 0
          ? <div className="chips">{examples.map((d) => <span key={d.slug} className="chip chip--static">{d.name}</span>)}</div>
          : <p className="modal__hint">შენს ფილტრებს ამ პერსონის კერძები ნაკლებად ერგება — ბორბალი მაინც მათ წინ წამოწევს.</p>}
      </section>

      <section className="modal__section">
        <h3><span className="dot dot--orange" />ფილტრები, რომლებსაც დავაყენებ</h3>
        <ul className="quiz__changes">{changes.map((c) => <li key={c}>{c}</li>)}</ul>
        <p className="modal__hint">ნებისმიერ დროს შეცვლი ფილტრების პანელში.</p>
      </section>

      <footer className="modal__actions">
        <button className="pill pill--dark" onClick={() => onApply(answers)} autoFocus>დაატრიალე ჩემი ბორბალი</button>
        <button className="pill pill--outline" onClick={onRestart}>თავიდან</button>
      </footer>
    </div>
  );
}
