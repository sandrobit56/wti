/**
 * File:        components/SectionBridge.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v3.0 — order fixed: the creature walks in and stops FIRST, then the bubble
 *              opens next to it and the line types (v2 typed while it was still walking).
 *              types out in its bubble (was: everything appeared at once — "rough")
 *              v1.1 — shared-experience jokes instead of food facts
 * Description: The pause between two sections. Hop-in is scroll-driven CSS
 *   (globals.css "bridge"); speech starts when the bridge is mostly on screen
 *   (IntersectionObserver), once. The full line is always in the DOM for screen
 *   readers; the typed copy is visual only. Reduced motion: shown at once.
 *   Voice: the cheeky fortune-teller — a moment every Georgian recognises, ≤ 1 line.
 */
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CREATURES } from "@/lib/creatures.ts";

type CreatureName = (typeof CREATURES)[number]["name"];
const DOTS_MS = 650, CHAR_MS = 26;

export function SectionBridge({ creature, fact, side = "left" }: { creature: CreatureName; fact: string; side?: "left" | "right" }) {
  const ref = useRef<HTMLElement>(null);
  const total = [...fact].length;
  const [walking, setWalking] = useState(false); // creature is on its way in
  const [shown, setShown] = useState(-1);        // -1 = not arrived, 0 = typing dots, n = chars typed

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { const t = setTimeout(() => setShown(total), 0); return () => clearTimeout(t); }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setWalking(true); // CSS walk-in; onAnimationEnd below starts the talking
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [total]);

  useEffect(() => {
    if (shown < 0 || shown >= total) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? DOTS_MS : CHAR_MS);
    return () => clearTimeout(t);
  }, [shown, total]);

  return (
    <aside ref={ref} className={`bridge bridge--${side}${walking ? " is-walking" : ""}${shown >= 0 ? " is-on" : ""}`}>
      <Image
        className="bridge__creature" src={`/illustrations/creatures/${creature}.webp`} alt="" width={96} height={96}
        onAnimationEnd={(e) => { if (e.animationName === "bridge-walk" || e.animationName === "bridge-walk-r") setShown((n) => (n < 0 ? 0 : n)); }}
      />
      <p className="bridge__bubble">
        <span className="sr-only">{fact}</span>
        <span className="bridge__ghost" aria-hidden="true">{fact}</span>
        <span className="bridge__typed" aria-hidden="true">
          {shown === 0 ? <span className="bridge__dots"><i /><i /><i /></span> : [...fact].slice(0, Math.max(0, shown)).join("")}
        </span>
      </p>
    </aside>
  );
}
