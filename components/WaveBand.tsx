"use client";
/**
 * File:        components/WaveBand.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v2.0 — the seam IS the ribbon: one SVG draws the next chapter's colour from
 *              the ribbon's centre line down, so the two backgrounds meet exactly on the
 *              band's silhouette (v1 overlaid a band on a separate curved edge → mismatch).
 * Description: Sits on top of a chapter (absolute, pulled up by its own height). Draws:
 *              1) fill: the chapter colour below the curve (CSS sets it per chapter),
 *              2) band: a thick stroke on the same curve, 3) a Mtavruli phrase on the curve
 *              that slides with scroll position (never on its own). Decorative: aria-hidden.
 *              Aspect ratio is fixed (no stretching), the box is wider than the screen and
 *              centred, so on phones the text stays readable.
 */
import { useEffect, useId, useRef } from "react";
import { toMtavruli } from "@/lib/mtavruli.ts";

// Two curves (rising / falling) instead of rotating the SVG: rotation broke the seam at the sides.
const CURVES = {
  a: "M-240 140 C 120 60, 420 60, 720 120 S 1320 190, 1680 100",
  b: "M-240 100 C 120 180, 420 190, 720 130 S 1320 50, 1680 130",
};
const H = 220;      // viewBox height; the fill closes along this bottom edge
const TRAVEL = 900; // how far (SVG units) the text slides across one full pass of the screen

type Tone = "mustard" | "brand" | "wine" | "cream";

export function WaveBand({ text, tone, curve = "a" }: { text: string; tone: Tone; curve?: keyof typeof CURVES }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const tp = useRef<SVGTextPathElement>(null);
  const line = `${toMtavruli(text)}  ✦  `.repeat(6);
  const d = CURVES[curve];

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
    <div className={`wave wave--${tone}`} aria-hidden="true">
      <svg ref={ref} viewBox={`0 0 1440 ${H}`}>
        <defs><path id={`w${id}`} d={d} /></defs>
        <path className="wave__fill" d={`${d} L1680 ${H + 2} L-240 ${H + 2} Z`} />
        <use href={`#w${id}`} className="wave__band" />
        <text className="wave__text" dy="0.34em">
          <textPath ref={tp} href={`#w${id}`} startOffset="0">{line}</textPath>
        </text>
      </svg>
    </div>
  );
}
