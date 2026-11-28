/**
 * File:        components/Wheel.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-27
 * Version:     v10.5 — Figma 211:8: caustic-shader plate, bigger pointer; v10.4 — group mode: seats are numbered busts on the rim only; their names, dishes
 *              and remove buttons moved to one list under the wheel (was: pills and × all around);
 *              v10.3 — Figma 191:615: dark wine plate (colour in CSS), cream band, coral hub;
 *              v10.2 — labels in Mkhedruli as in Figma v8;
 *              v10.1 — diners are marble busts; add button reads "+ სტუმარი";
 *              v10 — simpler, photo-first: each slice IS the dish photo (full wedge, no
 *              crooked mini cut-outs), names on one cream rim band, thin paper dividers,
 *              plain round plate (no torn edge, dashed ring or tape). Winner's band turns coral.
 *              v9.1 — real paper texture (public/collage/paper.webp) instead of SVG noise;
 *              v9.0 — collage art direction: a flat paper wheel. Torn-edge paper plate,
 *              paper slices with grain, real dish photos cut out with scissors (white paper
 *              border), a marker arrow as the pointer. No WebGL any more (−280 kB).
 *              v8 — three.js scene; v7 — CSS-tilted painted turntable.
 * Description: Presentational wheel. It does NOT choose anything: it gets the dishes and a
 *              target rotation and animates there; onLanded fires when the spin settles
 *              (with a timer as a safety net in case the tab was hidden mid-spin).
 *              Two ways to spin, one result logic (Randomizer → lib/spin.ts):
 *               - the hub button (also Enter/Space) → onSpin(offset)
 *               - drag the plate and let go fast enough → onFling(velocity, offset)
 *              Angles: slice i spans [i·a, (i+1)·a] clockwise from 12 o'clock; the winner is
 *              turned to the top, where the arrow points.
 */
"use client";

import { FigmaFill } from "./FigmaShaders";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { Dish } from "@/lib/catalog.ts";
import { typePhoto } from "@/lib/photos.ts";
import { MAX_DINERS, seatAngles } from "@/lib/seats.ts";
import { stickerSrc } from "@/lib/stickers.ts";

export const FLING_MIN = 0.35;   // deg/ms
const HALF = 210;                // viewBox is (−HALF … HALF)²
const PLATE = 176, R = 166;      // plate rim, slices
const BAND = 28;                 // cream name band at the rim
const HUB_R = 44;                // photos start just outside the hub
const LABEL_R = R - BAND / 2 - 4, LABEL_MAX = 11;
const SEAT_R = 0.53;             // diner distance from the centre, in box widths
const BOX: CSSProperties = { aspectRatio: "1" };

type Props = {
  dishes: Dish[];
  rotation: number;
  spinning: boolean;
  /** Spin length in ms. */
  spinMs: number;
  winnerIndex: number | null;
  landedOnce: boolean;
  /** offset: degrees the plate was left turned by a slow drag (folded into the spin). */
  onSpin: (offset: number) => void;
  /** velocity: deg/ms, signed (clockwise > 0). offset: how far the plate was dragged, in degrees. */
  onFling: (velocity: number, offset: number) => void;
  onLanded: () => void;
  /** Group mode: how many diners sit at the table (1 = just you). */
  diners: number;
  /** After landing: the dish name in front of each diner (index = diner). */
  seatDishes: string[] | null;
  onSeat: (diner: number) => void;
  onAddDiner: () => void;
  onRemoveDiner: (diner: number) => void;
};

const rad = (d: number) => (d * Math.PI) / 180;
const pt = (deg: number, r: number) => [Math.sin(rad(deg)) * r, -Math.cos(rad(deg)) * r] as const;
const f = (v: number) => v.toFixed(2);
/** ring segment between radii r0 < r1, centred on 12 o'clock, a degrees wide (local coords) */
function ringSeg(a: number, r0: number, r1: number): string {
  const h = a / 2;
  const [ax, ay] = pt(-h, r1), [bx, by] = pt(h, r1), [cx, cy] = pt(h, r0), [dx, dy] = pt(-h, r0);
  const big = a > 180 ? 1 : 0;
  return `M${f(ax)} ${f(ay)}A${r1} ${r1} 0 ${big} 1 ${f(bx)} ${f(by)}L${f(cx)} ${f(cy)}A${r0} ${r0} 0 ${big} 0 ${f(dx)} ${f(dy)}Z`;
}
/** label arc across the slice at LABEL_R, read left→right; flipped when the slice is at the bottom */
function labelArc(n: number, flip: boolean): string {
  const half = 360 / n / 2 - 3;
  const [x0, y0] = pt(-half, LABEL_R), [x1, y1] = pt(half, LABEL_R);
  return flip
    ? `M${x1.toFixed(2)} ${y1.toFixed(2)}A${LABEL_R} ${LABEL_R} 0 0 0 ${x0.toFixed(2)} ${y0.toFixed(2)}`
    : `M${x0.toFixed(2)} ${y0.toFixed(2)}A${LABEL_R} ${LABEL_R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
const isBottom = (deg: number) => { const d = ((deg % 360) + 360) % 360; return d > 100 && d < 260; };

function photoOf(slug: string): string {
  const p = typePhoto(slug);
  // the optimiser keeps each wedge photo at ~384 px instead of a full-size Commons photo
  return p ? `/_next/image?url=${encodeURIComponent(p.src)}&w=384&q=75` : stickerSrc(slug);
}

function Defs({ uid }: { uid: string }) {
  return (
    <defs>
      <pattern id={`paper${uid}`} patternUnits="userSpaceOnUse" width="256" height="256">
        <image href="/collage/paper.webp" width="256" height="256" />
      </pattern>
      <filter id={`paste${uid}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.4" floodColor="#163C3A" floodOpacity="0.28" />
      </filter>
      <clipPath id={`disc${uid}`}><circle r={R} /></clipPath>
    </defs>
  );
}

export function Wheel({ dishes, rotation, spinning, spinMs, winnerIndex, landedOnce, onSpin, onFling, onLanded, diners, seatDishes, onSeat, onAddDiner }: Props) {
  const n = dishes.length;
  const a = 360 / n;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ last: number; t: number; v: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Safety net: transitionend can be skipped (tab hidden mid-spin). Land on time anyway;
  // Randomizer.onLanded is idempotent.
  const landedRef = useRef(onLanded);
  useEffect(() => { landedRef.current = onLanded; });
  useEffect(() => {
    if (!spinning) return;
    const t = window.setTimeout(() => landedRef.current(), spinMs + 400);
    return () => window.clearTimeout(t);
  }, [spinning, spinMs]);

  /** Pointer angle around the plate centre, in degrees. */
  function angleOf(e: PointerEvent): number {
    const r = svgRef.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  }
  function down(e: PointerEvent<SVGSVGElement>) {
    if (spinning || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { last: angleOf(e), t: e.timeStamp, v: 0 };
    setDragging(true);
  }
  function move(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d) return;
    const now = angleOf(e);
    const delta = ((now - d.last + 540) % 360) - 180;   // shortest way round
    const dt = Math.max(1, e.timeStamp - d.t);
    d.v = 0.6 * d.v + 0.4 * (delta / dt);
    d.last = now; d.t = e.timeStamp;
    setOffset((o) => o + delta);
  }
  function up(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragging(false);
    const v = e.timeStamp - d.t > 80 ? 0 : d.v;          // a finger that paused doesn't fling
    if (Math.abs(v) >= FLING_MIN) { onFling(v, offset); setOffset(0); }
  }

  const turn = rotation + offset;
  const discCls = spinning ? "wheel__disc wheel__disc--spinning" : "wheel__disc";
  const discStyle = { transform: `rotate(${turn}deg)`, ["--spin-ms" as string]: `${spinMs}ms` } as CSSProperties;
  const hubLabel = spinning ? "…" : dragging ? "გაუშვი!" : landedOnce ? "კიდევ!" : "დაატრიალე";

  const seats = diners > 1 ? seatAngles(diners).map((deg, i) => {
    const s = Math.sin(rad(deg)), c = Math.cos(rad(deg));
    return { i, deg, dish: seatDishes?.[i] ?? null, x: 50 + s * SEAT_R * 100, y: 50 - c * SEAT_R * 100 };
  }) : [];

  return (
    <div className={dragging ? "wheel wheel--paper wheel--dragging" : "wheel wheel--paper"} style={BOX}>
      {/* Figma 211:14: the plate is a "Water caustic" shader (wine); the SVG plate on top is transparent */}
      <div className="wheel__caustic" aria-hidden="true"><FigmaFill name="plateCaustic" className="fx--plate" /></div>
      <svg ref={svgRef} className="wheel__svg" viewBox={`${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`} role="img"
        aria-label={`ბორბალი: ${dishes.map((d) => d.name).join(", ")}. გადაატარე თითი ან დააჭირე ღილაკს.`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <Defs uid={uid} />
        {/* plain round paper plate */}
        <circle r={PLATE} className="wheel__plate" />

        {/* everything that turns */}
        <g className={discCls} style={discStyle} onTransitionEnd={(e) => { if (e.propertyName === "transform") onLanded(); }}>
          {dishes.map((d, i) => {
            const mid = i * a + a / 2;
            const flip = isBottom(mid + turn);
            const arcId = `wl${uid}-${i}`;
            const won = !spinning && winnerIndex === i;
            // photo box: the wedge's bounding box, from the hub out to the name band
            const w = 2 * (R - BAND) * Math.sin(rad(Math.min(a, 120) / 2)) + 8;
            const top = -(R - BAND), h = R - BAND - HUB_R + 6;
            return (
              <g key={d.slug} transform={`rotate(${mid})`} className={won ? "wheel__slice wheel__slice--won" : "wheel__slice"}>
                <clipPath id={`c${uid}-${i}`}><path d={ringSeg(a, HUB_R - 6, R - BAND)} /></clipPath>
                <image href={photoOf(d.slug)} x={-w / 2} y={top} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#c${uid}-${i})`} />
                <path className="wheel__band" d={ringSeg(a, R - BAND, R)} />
                {d.name.length <= LABEL_MAX && (
                  <>
                    <path id={arcId} d={labelArc(n, flip)} fill="none" />
                    <text className="wheel__label" dy={flip ? "0.7em" : "0.3em"}>
                      <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">{d.name}</textPath>
                    </text>
                  </>
                )}
              </g>
            );
          })}
          {/* thin paper dividers between slices */}
          {dishes.map((d, i) => { const [x, y] = pt(i * a, R); return <line key={`d${d.slug}`} className="wheel__divider" x1="0" y1="0" x2={f(x)} y2={f(y)} />; })}
          <circle r={R} fill="none" className="wheel__rim" />
        </g>
      </svg>


      <button className="wheel__hub" onClick={() => { const o = offset; setOffset(0); onSpin(o); }} disabled={spinning} aria-label="დაატრიალე ბორბალი">
        <span aria-hidden="true">{hubLabel}</span>
      </button>

      {seats.map((t) => (
        <div key={t.i} className={`seat seat--paper${t.deg > 0 ? " seat--r" : ""}`} style={{ left: `${t.x}%`, top: `${t.y}%` }}>
          <button className="seat__who" onClick={() => t.dish && onSeat(t.i)} disabled={!t.dish} tabIndex={-1} aria-hidden="true">
            <Image src={`/illustrations/people/diner-${t.i + 1}.webp`} alt="" width={96} height={96} />
          </button>
          {/* v10.4: only a number here; names, dishes and "×" live in the tidy list under the wheel */}
          <span className="seat__n" aria-hidden="true">{t.i + 1}</span>
        </div>
      ))}
      {diners < MAX_DINERS && !spinning && (
        <button className="wheel__add" onClick={onAddDiner} aria-label={`დაამატე სტუმარი (${diners} / ${MAX_DINERS})`}>+ სტუმარი <span>{diners}/{MAX_DINERS}</span></button>
      )}
    </div>
  );
}

/** Static shell shown while the hero loads: the same paper plate, empty. */
export function WheelShell() {
  return (
    <div className="wheel wheel--paper wheel--skeleton" aria-label="იტვირთება" style={BOX}>
      <svg className="wheel__svg" viewBox={`${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`} aria-hidden="true">
        <circle r={PLATE} className="wheel__plate" />
      </svg>
    </div>
  );
}
