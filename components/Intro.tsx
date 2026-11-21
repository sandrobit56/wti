/**
 * File:        components/Intro.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v1.0
 * Description: The curtain before the site (refs: siglitos.com numbered intro,
 *   197historiasilustradas.com typewriter + "[ omitir ]"). Three short lines are
 *   typed in the fortune-teller voice, then the cream curtain lifts.
 *   - Once per browser session: an inline script in app/page.tsx marks
 *     <html data-intro="seen"> before first paint, so returning visitors never see
 *     a flash of it.
 *   - Skippable any time ([ გამოტოვე ], click, any key). Reduced motion: never shown.
 *   - Page content renders underneath from the start (no SEO/LCP cost).
 */
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const LINES = ["გამარჯობა, მშიერო.", "ისევ ის კითხვაა, არა? „რა ვჭამოთ?“", "ნუ ღელავ. ბედმა უკვე იცის."];
const TYPE_MS = 32, PAUSE_MS = 420, LIFT_MS = 700;
export const INTRO_KEY = "wti:intro";

type Phase = "type" | "lift" | "done";

export function Intro() {
  const [phase, setPhase] = useState<Phase>("type");
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);

  const finish = () => {
    try { sessionStorage.setItem(INTRO_KEY, "1"); } catch { /* private mode: shows again next visit */ }
    setPhase((p) => (p === "done" ? p : "lift"));
  };

  // Seen this session / reduced motion → gone before it starts.
  useEffect(() => {
    const seen = document.documentElement.dataset.intro === "seen";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // CSS already hides it (data-intro / reduced-motion); just unmount on the next tick.
    if (seen || reduce) { const t = setTimeout(() => setPhase("done"), 0); return () => clearTimeout(t); }
    document.documentElement.style.overflow = "hidden";
    const skip = () => finish();
    window.addEventListener("keydown", skip, { once: true });
    return () => window.removeEventListener("keydown", skip);
  }, []);

  // Typewriter.
  useEffect(() => {
    if (phase !== "type") return;
    if (line >= LINES.length) { const t = setTimeout(finish, PAUSE_MS); return () => clearTimeout(t); }
    const full = [...LINES[line]].length;
    const t = chars < full
      ? setTimeout(() => setChars((c) => c + 1), TYPE_MS)
      : setTimeout(() => { setLine((l) => l + 1); setChars(0); }, PAUSE_MS);
    return () => clearTimeout(t);
  }, [phase, line, chars]);

  // Curtain lifts, then unmount and give the page its scroll back.
  useEffect(() => {
    if (phase !== "lift") return;
    const t = setTimeout(() => { setPhase("done"); document.documentElement.style.overflow = ""; }, LIFT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div className={`intro${phase === "lift" ? " intro--lift" : ""}`} onClick={finish} role="presentation">
      <div className="intro__stage">
        <Image className="intro__mascot" src="/icons/mascot.svg" alt="" width={96} height={99} priority />
        <ol className="intro__lines" aria-live="polite">
          {LINES.map((l, i) => i <= line && (
            <li key={i} className={i === line ? "is-typing" : undefined}>
              <span className="intro__num">0{i + 1} / 0{LINES.length}</span>
              {i < line ? l : [...l].slice(0, chars).join("")}
            </li>
          ))}
        </ol>
      </div>
      <button type="button" className="intro__skip" onClick={(e) => { e.stopPropagation(); finish(); }}>[ გამოტოვე ]</button>
    </div>
  );
}
