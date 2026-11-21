"use client";
/**
 * File:        components/WaveBand.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: The seam between two chapters: a wavy ribbon that crosses the curved
 *              edge, with a Mtavruli phrase running along it. The text slides as you
 *              scroll (it is tied to scroll position, not a timer, so it never moves
 *              on its own while someone is reading). Decorative only — aria-hidden.
 *              Technique borrowed from sweet-tape.com; the art and copy are ours.
 */
import { useEffect, useId, useRef } from "react";
import { toMtavruli } from "@/lib/mtavruli.ts";

const WAVE = "M-240 120 C 120 30, 420 30, 720 110 S 1320 190, 1680 90";
const TRAVEL = 900; // how far (SVG units) the text slides across one full pass of the screen

type Tone = "mustard" | "brand" | "wine" | "cream";

export function WaveBand({ text, tone, tilt = -3 }: { text: string; tone: Tone; tilt?: number }) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const tp = useRef<SVGTextPathElement>(null);
  const line = `${toMtavruli(text)}  ✦  `.repeat(6);

  useEffect(() => {
    const svg = ref.current, path = tp.current;
    if (!svg || !path || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, on = false;
    const paint = () => {
      raf = 0;
      const r = svg.getBoundingClientRect();
      const p = (innerHeight - r.top) / (innerHeight + r.height); // 0 → entering, 1 → gone
      path.setAttribute("startOffset", String(-TRAVEL * Math.min(1, Math.max(0, p))));
    };
    const onScroll = () => { if (on && !raf) raf = requestAnimationFrame(paint); };
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) paint(); });
    io.observe(svg);
    addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className={`wave wave--${tone}`} style={{ ["--tilt" as string]: `${tilt}deg` }} aria-hidden="true">
      <svg ref={ref} viewBox="0 0 1440 220" preserveAspectRatio="xMidYMid slice">
        <defs><path id={`w${id}`} d={WAVE} /></defs>
        <use href={`#w${id}`} className="wave__band" />
        <text className="wave__text" dy="0.34em">
          <textPath ref={tp} href={`#w${id}`} startOffset="0">{line}</textPath>
        </text>
      </svg>
    </div>
  );
}
