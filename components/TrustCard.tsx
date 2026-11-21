/**
 * File:        components/TrustCard.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v2.0 — interactive
 * Description: "ჩანგალი" rating explainer.
 *   - Fork meter: hover/tap 1–3 forks → what that level means. When the block first
 *     scrolls into view it plays 1→2→3 once, then waits for the user.
 *   - How we rate: 3 steps; the connecting line fills as you scroll (CSS view timeline).
 *   - Rosette: tap → "შემოწმებულია" stamp.
 *   Level texts are DRAFT copy until the rating methodology is final.
 */
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Words } from "./Words";

const LEVELS = [
  { title: "ერთი ჩანგალი", text: "კარგი სამზარეულო თავის კატეგორიაში — ღირს შევლა, თუ ახლოს ხარ." },
  { title: "ორი ჩანგალი", text: "გამორჩეული — ღირს გზის გაგრძელება და სხვა უბნიდან მოსვლა." },
  { title: "სამი ჩანგალი", text: "განსაკუთრებული — ღირს სპეციალურად წასვლა. ასეთი ცოტა იქნება." },
];
const STEPS = [
  { icon: "user", title: "ანონიმური ვიზიტი" },
  { icon: "coin", title: "ვიხდით ჩვენ" },
  { icon: "rosette", title: "2+ ინსპექტორი, ყოველ 6 თვეში" },
];

export function TrustCard() {
  const [level, setLevel] = useState(0); // 0 = none chosen yet
  const [stamped, setStamped] = useState(false);
  const touched = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Play 1→2→3 once when it first comes into view (unless the user got there first).
  useEffect(() => {
    const el = boxRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      [1, 2, 3].forEach((n, i) => timers.push(window.setTimeout(() => { if (!touched.current) setLevel(n); }, 400 + i * 650)));
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); timers.forEach(clearTimeout); };
  }, []);

  const pick = (n: number) => { touched.current = true; setLevel(n); };
  const shown = LEVELS[(level || 3) - 1];

  return (
    <section className="container sect" id="trust">
      <div className="trust2 reveal" ref={boxRef}>
        <div className="trust2__top">
          <div>
            <p className="caps">როგორ ვაფასებთ</p>
            <h2><Words parts={["„ჩანგალი“ — შეფასება, რომელსაც ", ["ვერ იყიდი", "hl hl--pink"]]} /></h2>
          </div>
          <button type="button" className={stamped ? "trust2__seal stamped" : "trust2__seal"} onClick={() => setStamped((s) => !s)} aria-pressed={stamped} aria-label="შემოწმების ბეჭედი">
            <Image src="/icons/rosette.svg" alt="" width={72} height={72} />
            <span className="trust2__stamp" aria-hidden="true">შემოწმებულია</span>
          </button>
        </div>

        <div className="forks" role="radiogroup" aria-label="ჩანგლების დონე">
          <div className="forks__row">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={level === n}
                className={n <= level ? "fork on" : "fork"}
                style={{ ["--n" as string]: n }}
                onMouseEnter={() => pick(n)}
                onFocus={() => pick(n)}
                onClick={() => pick(n)}
                aria-label={LEVELS[n - 1].title}
              >
                <ForkIcon />
              </button>
            ))}
          </div>
          <p className="forks__text" key={level} aria-live="polite">
            <b>{shown.title}</b> — {shown.text}
          </p>
        </div>

        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="step" style={{ ["--i" as string]: i }}>
              <span className="step__ico"><Image src={`/icons/${s.icon}.svg`} alt="" width={26} height={26} /></span>
              <strong>{s.title}</strong>
            </li>
          ))}
        </ol>
        <p className="trust2__note">პირველი შეფასებები მალე.</p>
      </div>
    </section>
  );
}

const ForkIcon = () => (
  <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
    <path d="M7 3v12a10 10 0 0 0 20 0V3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <path d="M17 3v14M17 25v16" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
  </svg>
);
