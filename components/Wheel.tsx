/**
 * File:        components/Wheel.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-16
 * Version:     v5.0 — 4-colour system palette (wine/mustard/blush/cream) on a cream plate; was v4.0 — "ბედის თეფში": cream plate, saturated slices, icons on white
 *              sticker discs, fork pointer; title moved out of the SVG into the hero (HTML)
 *              v2.3 — desktop title matches Figma (big off-centre arc, gradient);
 *              v2.2 — long names → bigger icon only (name lives in the popup and
 *              aria-label); curved title stays on its own arc above the rim
 * Description: Presentational wheel. It does NOT choose anything: it gets the
 *              dishes and a target rotation and animates there (Figma motion spec:
 *              2.3s, cubic-bezier(0.12, 0.75, 0.15, 1), 7 turns). onLanded fires when the
 *              CSS transition ends.
 */
"use client";

import type { Dish } from "@/lib/catalog.ts";

// v5 palette = the site's own four colours (globals.css "Design system v5"), so the
// wheel reads as part of the page, not a rainbow sticker on top of it.
// INK is the readable label colour for each slice.
const SLICE_COLORS = ["#3B0D18", "#FFC93C", "#F8B4C0", "#FFF8EC"];
const INK = ["#FFF1DC", "#3B0D18", "#3B0D18", "#3B0D18"];
/** Cycle the palette; when n leaves one slice over, recolour it so it never matches slice 0. */
const colorOf = (i: number, n: number) => (i === n - 1 && n % SLICE_COLORS.length === 1 ? 2 : i % SLICE_COLORS.length);
const R = 170;        // slice radius
const PLATE = 196;    // cream plate radius
const isBottom = (deg: number) => { const a = ((deg % 360) + 360) % 360; return a > 90 && a < 270; };
export const VIEWBOX = "-200 -216 400 416";

function slicePath(i: number, n: number): string {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const large = 1 / n > 0.5 ? 1 : 0;
  return `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
}

/** Names longer than this are not printed on the wheel — the icon carries the slice. */
export const LABEL_MAX = 8;

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
      <svg viewBox={VIEWBOX} role="img" aria-label={`ბორბალი: ${dishes.map((d) => d.name).join(", ")}`}>
        <Plate />
        <g
          className={spinning ? "wheel__disc wheel__disc--spinning" : "wheel__disc"}
          style={{ transform: `rotate(${rotation}deg)` }}
          onTransitionEnd={(e) => { if (e.propertyName === "transform") onLanded(); }}
        >
          {dishes.map((d, i) => {
            const mid = i * a + a / 2;
            const won = !spinning && winnerIndex === i;
            const ci = colorOf(i, n);
            return (
              <g key={d.slug}>
                <path d={slicePath(i, n)} fill={SLICE_COLORS[ci]} stroke="#FFF1DC" strokeWidth={4} strokeLinejoin="round" />
                <g transform={`rotate(${mid})`}>
                  <g transform={isBottom(mid + rotation) ? `rotate(180 0 ${-R + 56})` : undefined}>
                    {/* icon on a white sticker disc, so it reads on any slice colour */}
                    <circle cy={-R + 40} r={25} fill="#fff" />
                    <image href={`/icons/${d.icon}.svg`} x={-18} y={-R + 22} width={36} height={36} />
                    {d.name.length <= LABEL_MAX && (
                      <text y={-R + 88} textAnchor="middle" style={{ fill: INK[ci] }} className={won ? "wheel__label wheel__label--won" : "wheel__label"}>{d.name}</text>
                    )}
                  </g>
                </g>
              </g>
            );
          })}
        </g>
        <Fork />
      </svg>
      <button className="wheel__hub" onClick={onSpin} disabled={spinning} aria-label="დაატრიალე ბორბალი">
        {spinning ? "…" : "დაატრიალე"}
      </button>
    </div>
  );
}

/** Cream plate with a ring of dots: the wheel is a plate of fate. */
function Plate() {
  return (
    <>
      <circle r={PLATE} fill="#FFF1DC" />
      <circle r={PLATE - 4} fill="none" stroke="#fff" strokeWidth={3} opacity={0.8} />
      {Array.from({ length: 24 }, (_, i) => {
        const t = (i / 24) * 2 * Math.PI;
        return <circle key={i} cx={(R + 13) * Math.cos(t)} cy={(R + 13) * Math.sin(t)} r={3.5} fill={i % 2 ? "#3B0D18" : "#F1435E"} />;
      })}
    </>
  );
}

/** The pointer is a fork ("ჩანგალი"), tines down into the winning slice. */
// One silhouette (handle → shoulders → three tines) so the white outline is one clean line.
const FORK_D = "M-5 -212 A5 5 0 0 1 5 -212 L5 -191 C5 -188 15 -190 15 -184 L15 -153 A2.5 2.5 0 0 1 10 -153 L10 -171 L2.5 -171 L2.5 -150 A2.5 2.5 0 0 1 -2.5 -150 L-2.5 -171 L-10 -171 L-10 -153 A2.5 2.5 0 0 1 -15 -153 L-15 -184 C-15 -190 -5 -188 -5 -191 Z";
function Fork() {
  return <path className="wheel__fork" d={FORK_D} fill="#3B0D18" stroke="#FFF1DC" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round" />;
}

/** Static shell shown while the interactive wheel loads: same box and plate. */
export function WheelShell() {
  return (
    <div className="wheel wheel--skeleton" aria-label="იტვირთება">
      <svg viewBox={VIEWBOX} aria-hidden="true">
        <Plate />
        <Fork />
      </svg>
    </div>
  );
}
