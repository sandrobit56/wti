/**
 * File:        components/Wheel.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0
 * Description: Presentational wheel. It does NOT choose anything: it receives the
 *              dishes and a target rotation and animates to it (Figma v3 motion
 *              spec: 3.2s, cubic-bezier(0.1, 0.7, 0.15, 1)). onLanded fires once
 *              the CSS transition ends.
 */
"use client";

import type { Dish } from "@/lib/catalog.ts";

const SLICE_COLORS = ["#FFF4DE", "#FDE3E8", "#E3EDFD", "#E7F6EA", "#EFEBFE", "#FFF0C2", "#FCE5D2", "#DFF0F5"];
const R = 170;
const isBottom = (deg: number) => { const a = ((deg % 360) + 360) % 360; return a > 90 && a < 270; };

function slicePath(i: number, n: number): string {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const large = 1 / n > 0.5 ? 1 : 0;
  return `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
}

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
      <svg viewBox="-180 -192 360 384" role="img" aria-label={`ბორბალი: ${dishes.map((d) => d.name).join(", ")}`}>
        <circle r={R + 8} fill="#fff" />
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
                <path d={slicePath(i, n)} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                <g transform={`rotate(${mid})`}>
                  {/* flip by FINAL screen angle so labels (esp. the winner at the top) read upright */}
                  <g transform={isBottom(mid + rotation) ? `rotate(180 0 ${-R + 58})` : undefined}>
                    <image href={`/icons/${d.icon}.svg`} x={-19} y={-R + 14} width={38} height={38} />
                    <text y={-R + 74} textAnchor="middle" className={won ? "wheel__label wheel__label--won" : "wheel__label"}>
                      {d.name.length > 12 ? d.name.split(" ")[0] : d.name}
                    </text>
                  </g>
                </g>
              </g>
            );
          })}
        </g>
        {Array.from({ length: 24 }, (_, i) => {
          const t = (i / 24) * 2 * Math.PI;
          return <circle key={i} cx={(R + 4) * Math.cos(t)} cy={(R + 4) * Math.sin(t)} r={2.2} fill="#f2a43a" />;
        })}
        <path d="M0 -150 L-14 -184 A16 16 0 1 1 14 -184 Z" fill="#f1435e" />
        <circle cy={-184} r={6} fill="#fff" />
      </svg>
      <button className="wheel__hub" onClick={onSpin} disabled={spinning} aria-label="დაატრიალე ბორბალი">
        {spinning ? "…" : "დაატრიალე"}
      </button>
    </div>
  );
}
