"use client";
/**
 * File:        components/TablePanel.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-28
 * Version:     v1.0
 * Description: "სუფრა" — the group panel left of the wheel. Add people with "+" (სტუმარი 2…5),
 *              rename each one inline, remove with "×". With 2+ people the wheel picks ONE dish
 *              for the whole table, and "ვინ იხდის?" runs a short roulette over the names that
 *              lands on the payer. Names live in this browser only (light convenience).
 */
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { TABLE_MAX, addGuest, payerSteps, removeGuest, renameGuest } from "@/lib/table.ts";

type Props = { names: string[]; onChange: (names: string[]) => void; disabled: boolean };

export function TablePanel({ names, onChange, disabled }: Props) {
  const [lit, setLit] = useState<number | null>(null);   // the row the roulette is on
  const [payer, setPayer] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const rolling = lit !== null && payer === null;

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // a different table means a different bill
  function change(next: string[]) { setPayer(null); setLit(null); onChange(next); }

  function whoPays() {
    timers.current.forEach((t) => window.clearTimeout(t));
    setPayer(null);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = payerSteps(names.length, Math.random);
    if (reduce) { const last = steps.at(-1)!.index; setLit(last); setPayer(last); return; }
    let at = 0;
    steps.forEach((s, k) => {
      at += s.delay;
      timers.current.push(window.setTimeout(() => {
        setLit(s.index);
        if (k === steps.length - 1) setPayer(s.index);
      }, at));
    });
  }

  return (
    <aside className="table9p" aria-label="სუფრა">
      <header className="table9p__head">
        <b>სუფრა</b><span>{names.length}/{TABLE_MAX}</span>
      </header>
      <ul className="table9p__list">
        {names.map((n, i) => (
          <li key={i} className={`table9p__row${lit === i ? " is-lit" : ""}${payer === i ? " is-payer" : ""}`}>
            <Image className="table9p__ava" src={`/illustrations/people/diner-${i + 1}.webp`} alt="" width={64} height={64} />
            <input className="table9p__name" value={n} maxLength={20} aria-label={`სახელი ${i + 1}`} disabled={disabled}
              onChange={(e) => change(names.map((x, k) => (k === i ? e.target.value : x)))}
              onBlur={(e) => change(renameGuest(names, i, e.target.value))} />
            {payer === i && <span className="table9p__pays" role="status">იხდის!</span>}
            {i > 0 && payer !== i && (
              <button type="button" className="table9p__x" onClick={() => change(removeGuest(names, i))} disabled={disabled || rolling} aria-label={`მოაშორე ${n}`}>×</button>
            )}
          </li>
        ))}
      </ul>
      {names.length < TABLE_MAX && (
        <button type="button" className="table9p__add" onClick={() => change(addGuest(names))} disabled={disabled || rolling}>+ დაამატე სტუმარი</button>
      )}
      {names.length > 1 ? (
        <>
          <p className="table9p__hint">ბორბალი ერთ კერძს შეარჩევს მთელი სუფრისთვის.</p>
          <button type="button" className="table9p__pay" onClick={whoPays} disabled={rolling}>{payer === null ? "ვინ იხდის?" : "კიდევ ერთხელ"}</button>
        </>
      ) : (
        <p className="table9p__hint">მარტო ჭამ? დაამატე ხალხი და ერთად აირჩიეთ.</p>
      )}
    </aside>
  );
}
