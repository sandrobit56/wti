/**
 * File:        components/Intro.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v2.0 — short: ~1.5 s, the mascot runs in eating dots and the name pops
 *              (v1 typed three lines — too long, "like a poem")
 * Description: The curtain before the site (refs: siglitos.com, 197historias…).
 *   - Once per browser session: an inline script in app/page.tsx marks
 *     <html data-intro="seen"> before first paint, so returning visitors never see
 *     a flash of it.
 *   - Skippable any time ([ გამოტოვე ], click, any key). Reduced motion: never shown.
 *   - Page content renders underneath from the start (no SEO/LCP cost).
 */
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const WORD = "რა ვჭამოთ?";
const SHOW_MS = 1500, LIFT_MS = 600;
export const INTRO_KEY = "wti:intro";

type Phase = "play" | "lift" | "done";

export function Intro() {
  const [phase, setPhase] = useState<Phase>("play");

  const finish = () => {
    try { sessionStorage.setItem(INTRO_KEY, "1"); } catch { /* private mode: shows again next visit */ }
    setPhase((p) => (p === "done" ? p : "lift"));
  };

  // Seen this session / reduced motion → gone before it starts. Otherwise ~1.5 s, then lift.
  useEffect(() => {
    const seen = document.documentElement.dataset.intro === "seen";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // CSS already hides it (data-intro / reduced-motion); just unmount on the next tick.
    if (seen || reduce) { const t = setTimeout(() => setPhase("done"), 0); return () => clearTimeout(t); }
    document.documentElement.style.overflow = "hidden";
    const t = setTimeout(finish, SHOW_MS);
    const skip = () => finish();
    window.addEventListener("keydown", skip, { once: true });
    return () => { clearTimeout(t); window.removeEventListener("keydown", skip); };
  }, []);

  // Curtain lifts, then unmount and give the page its scroll back.
  useEffect(() => {
    if (phase !== "lift") return;
    const t = setTimeout(() => { setPhase("done"); document.documentElement.style.overflow = ""; }, LIFT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div className={`intro${phase === "lift" ? " intro--lift" : ""}`} onClick={finish} role="presentation">
      <div className="intro__track" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => <span key={i} className="intro__dot" style={{ ["--i" as string]: i }} />)}
        <Image className="intro__mascot" src="/icons/mascot.svg" alt="" width={72} height={74} priority />
      </div>
      <p className="intro__word">
        {[...WORD].map((ch, i) => <span key={i} style={{ ["--i" as string]: i }}>{ch === " " ? "\u00a0" : ch}</span>)}
      </p>
      <button type="button" className="intro__skip" onClick={(e) => { e.stopPropagation(); finish(); }}>[ გამოტოვე ]</button>
    </div>
  );
}
