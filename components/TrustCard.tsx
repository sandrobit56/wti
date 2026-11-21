/**
 * File:        components/TrustCard.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v3.0 — one job only: explain the fork scale (steps, seal toggle and note
 *              removed — "too many elements, unclear what it is for")
 *              v2.0 — interactive
 * Description: "ჩანგალი" rating explainer.
 *   - Fork meter: hover/tap 1–3 forks → what that level means. When the block first
 *     scrolls into view it plays 1→2→3 once, then waits for the user.
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

export function TrustCard() {
  const [level, setLevel] = useState(0); // 0 = none chosen yet
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
            <h2 className="display"><Words caps parts={["„ჩანგალი“ — შეფასება, რომელსაც ", ["ვერ იყიდი", "accent"]]} /></h2>
          </div>
          <Image className="trust2__seal" src="/icons/rosette.svg" alt="" width={64} height={64} />
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
