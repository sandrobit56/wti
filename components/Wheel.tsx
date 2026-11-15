/**
 * File:        components/Wheel.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v2.0 — matches Figma "v3/Wheel": thick white rim with yellow/pink
 *              studs, pastel slices, white separators, red hub, map-pin pointer
 * Description: Presentational wheel. It does NOT choose anything: it gets the
 *              dishes and a target rotation and animates there (Figma motion spec:
 *              3.2s, cubic-bezier(0.1, 0.7, 0.15, 1)). onLanded fires when the
 *              CSS transition ends.
 */
"use client";

import type { Dish } from "@/lib/catalog.ts";

// Figma v3 slice tints, clockwise from 12 o'clock.
const SLICE_COLORS = ["#FDE3E8", "#FFF4DE", "#E3EDFD", "#ECE8FD", "#E7F6EA", "#FFF1C2", "#FDE7D6", "#E1EEFB"];
const R = 170;        // slice radius
const RIM = 186;      // white rim radius
const isBottom = (deg: number) => { const a = ((deg % 360) + 360) % 360; return a > 90 && a < 270; };

function slicePath(i: number, n: number): string {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const large = 1 / n > 0.5 ? 1 : 0;
  return `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
}

const short = (name: string) => {
  const first = name.length > 9 ? name.split(/[\s/]/)[0] : name;
  return first.length > 9 ? `${first.slice(0, 8)}…` : first;
};

type Props = {
  dishes: Dish[];
  rotation: number;
  spinning: boolean;
  winnerIndex: number | null;
  onSpin: () => void;
  onLanded: () => void;
};

export function Wheel({ dishes, rotation, spinning, winnerIndex, onSpin, onLanded }: Props) {
  const n = dishes.length;
  const a = 360 / n;
  return (
    <div className="wheel">
      <svg viewBox="-200 -222 400 422" role="img" aria-label={`ბორბალი: ${dishes.map((d) => d.name).join(", ")}`}>
        <circle r={RIM} fill="#fff" />
        <g
          className={spinning ? "wheel__disc wheel__disc--spinning" : "wheel__disc"}
          style={{ transform: `rotate(${rotation}deg)` }}
          onTransitionEnd={(e) => { if (e.propertyName === "transform") onLanded(); }}
        >
          {dishes.map((d, i) => {
            const mid = i * a + a / 2;
            const won = !spinning && winnerIndex === i;
            return (
              <g key={d.slug}>
                <path d={slicePath(i, n)} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="#fff" strokeWidth={6} strokeLinejoin="round" />
                <g transform={`rotate(${mid})`}>
                  <g transform={isBottom(mid + rotation) ? `rotate(180 0 ${-R + 50})` : undefined}>
                    <image href={`/icons/${d.icon}.svg`} x={-23} y={-R + 14} width={46} height={46} />
                    <text y={-R + 80} textAnchor="middle" className={won ? "wheel__label wheel__label--won" : "wheel__label"}>{short(d.name)}</text>
                  </g>
                </g>
              </g>
            );
          })}
        </g>
        {Array.from({ length: 16 }, (_, i) => {
          const t = (i / 16) * 2 * Math.PI - Math.PI / 2 + Math.PI / 16;
          return <circle key={i} cx={(R + 8) * Math.cos(t)} cy={(R + 8) * Math.sin(t)} r={4.5} fill={i % 2 ? "#f5a3b1" : "#ffd233"} />;
        })}
        <circle r={58} fill="#fff" />
        <path d="M0 -150 C-9 -162 -22 -176 -22 -192 A22 22 0 1 1 22 -192 C22 -176 9 -162 0 -150Z" fill="#f1435e" />
        <circle cy={-193} r={8} fill="#fff" />
      </svg>
      <button className="wheel__hub" onClick={onSpin} disabled={spinning} aria-label="დაატრიალე ბორბალი">
        {spinning ? "…" : "დაატრიალე"}
      </button>
    </div>
  );
}
