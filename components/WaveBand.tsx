/**
 * File:        components/WaveBand.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-23
 * Version:     v3.0 — collage: a torn paper edge + a strip of printed tape with the marquee line
 *              (v2 was a curved SVG wave). Same props, so pages didn't change.
 * Description: Seam at the top of each chapter. The torn edge takes the chapter's own paper
 *              colour (--paper, set per chapter in CSS), so the next section looks pasted over
 *              the previous one. The tape line slides with scroll (one rAF, only while visible).
 */
"use client";

import { useEffect, useRef } from "react";
import { tornEdge } from "@/lib/cutout.ts";
import { toMtavruli } from "@/lib/mtavruli.ts";

type Tone = "mustard" | "brand" | "wine" | "cream";
const TRAVEL = 0.35;   // fraction of the strip width the text slides over one pass of the screen

export function WaveBand({ text, tone, curve = "a" }: { text: string; tone: Tone; curve?: "a" | "b" }) {
  const ref = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const words = `${toMtavruli(text)}  ✶  `.repeat(8);

  useEffect(() => {
    const el = ref.current, ln = line.current;
    if (!el || !ln || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, on = false;
    const paint = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
      ln.style.transform = `translateX(${(curve === "a" ? -1 : 1) * p * TRAVEL * 100 - (curve === "a" ? 0 : TRAVEL * 100)}%)`;
    };
    const onScroll = () => { if (on && !raf) raf = requestAnimationFrame(paint); };
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) paint(); });
    io.observe(el);
    addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [curve]);

  return (
    <div ref={ref} className={`seam seam--${tone} seam--${curve}`} aria-hidden="true">
      <svg className="seam__tear" viewBox="0 0 1440 40" preserveAspectRatio="none"><path d={tornEdge(`seam-${text}`)} /></svg>
      <div className="seam__tape"><span ref={line} className="seam__line">{words}</span></div>
    </div>
  );
}
