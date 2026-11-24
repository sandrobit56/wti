/**
 * File:        components/Wheel.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-23
 * Version:     v9.1 — real paper texture (public/collage/paper.webp) instead of SVG noise;
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

import Image from "next/image";
import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { Dish } from "@/lib/catalog.ts";
import { cutPoints, deckle } from "@/lib/cutout.ts";
import { toMtavruli } from "@/lib/mtavruli.ts";
import { typePhoto } from "@/lib/photos.ts";
import { MAX_DINERS, seatAngles } from "@/lib/seats.ts";
import { stickerSrc } from "@/lib/stickers.ts";
import { Scribble } from "./Scribble";

export const FLING_MIN = 0.35;   // deg/ms
const HALF = 210;                // viewBox is (−HALF … HALF)²
const PLATE = 182, R = 160;      // torn paper plate, slices
const PHOTO_R = 96, PHOTO = 70;  // where the cut-out photo sits, its size
const LABEL_R = 138, LABEL_MAX = 11;
const SEAT_R = 0.53;             // diner distance from the centre, in box widths
const SLICE = ["#163C3A", "#FFC93C", "#F8B4C0", "#FFFAF2"];
const INK = ["#FFF1DC", "#163C3A", "#163C3A", "#D92F4C"];
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
/** the last slice must not share a colour with the first */
const colorOf = (i: number, n: number) => (i === n - 1 && n % SLICE.length === 1 ? 2 : i % SLICE.length);

function slicePath(i: number, n: number): string {
  const a = 360 / n, gap = 0.9;
  const [x0, y0] = pt(i * a + gap, R), [x1, y1] = pt((i + 1) * a - gap, R);
  const [cx, cy] = pt(i * a + a / 2, 4);
  return `M${cx.toFixed(2)} ${cy.toFixed(2)}L${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
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
  // the optimiser keeps each cut-out at ~256 px instead of a full-size Commons photo
  return p ? `/_next/image?url=${encodeURIComponent(p.src)}&w=256&q=75` : stickerSrc(slug);
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

export function Wheel({ dishes, rotation, spinning, spinMs, winnerIndex, landedOnce, onSpin, onFling, onLanded, diners, seatDishes, onSeat, onAddDiner, onRemoveDiner }: Props) {
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
      <svg ref={svgRef} className="wheel__svg" viewBox={`${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`} role="img"
        aria-label={`ბორბალი: ${dishes.map((d) => d.name).join(", ")}. გადაატარე თითი ან დააჭირე ღილაკს.`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <Defs uid={uid} />
        {/* the paper plate, pasted on the page */}
        <path d={deckle("plate", PLATE, 3.2)} fill="#FFF1DC" filter={`url(#paste${uid})`} />
        <path d={deckle("plate", PLATE, 3.2)} fill={`url(#paper${uid})`} style={{ mixBlendMode: "multiply" }} />
        <path d={deckle("plate-in", PLATE - 9, 1.6)} fill="none" stroke="#163C3A" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="1 5" strokeLinecap="round" />

        {/* everything that turns */}
        <g className={discCls} style={discStyle} onTransitionEnd={(e) => { if (e.propertyName === "transform") onLanded(); }}>
          {dishes.map((d, i) => <path key={`s${d.slug}`} d={slicePath(i, n)} fill={SLICE[colorOf(i, n)]} />)}
          <rect x={-R} y={-R} width={R * 2} height={R * 2} fill={`url(#paper${uid})`} clipPath={`url(#disc${uid})`} style={{ mixBlendMode: "multiply" }} pointerEvents="none" />
          {dishes.map((d, i) => {
            const mid = i * a + a / 2;
            const ci = colorOf(i, n);
            const flip = isBottom(mid + turn);
            const arcId = `wl${uid}-${i}`;
            const tilt = ((i * 37) % 11) - 5;   // each cut-out pasted a little crooked
            const poly = cutPoints(d.slug, PHOTO, PHOTO);
            const inner = cutPoints(`${d.slug}-in`, PHOTO - 8, PHOTO - 8, 3, 0.05);
            const won = !spinning && winnerIndex === i;
            return (
              <g key={d.slug} transform={`rotate(${mid})`}>
                <g transform={`translate(0 ${-PHOTO_R}) rotate(${(flip ? 180 : 0) + tilt})`} className={won ? "wheel__cut wheel__cut--won" : "wheel__cut"}>
                  <polygon points={poly} fill="#FFFAF2" filter={`url(#paste${uid})`} />
                  <clipPath id={`c${uid}-${i}`}><polygon points={inner} /></clipPath>
                  <image href={photoOf(d.slug)} x={-(PHOTO - 8) / 2} y={-(PHOTO - 8) / 2} width={PHOTO - 8} height={PHOTO - 8} preserveAspectRatio="xMidYMid slice" clipPath={`url(#c${uid}-${i})`} />
                </g>
                {d.name.length <= LABEL_MAX && (
                  <>
                    <path id={arcId} d={labelArc(n, flip)} fill="none" />
                    <text className={won ? "wheel__label wheel__label--won" : "wheel__label"} style={{ fill: INK[ci] }} dy={flip ? "0.75em" : "0"}>
                      <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">{toMtavruli(d.name)}</textPath>
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
        {/* tape holding the plate (static, over the slices) */}
        <rect className="wheel__tape" x="-34" y={-PLATE - 12} width="68" height="22" transform="rotate(-38)" />
        <rect className="wheel__tape" x="-30" y={-PLATE - 10} width="60" height="20" transform="rotate(142)" />
      </svg>

      {diners === 1 && <Scribble kind="arrowDown" className="wheel__arrow" width={4} />}

      <button className="wheel__hub" onClick={() => { const o = offset; setOffset(0); onSpin(o); }} disabled={spinning} aria-label="დაატრიალე ბორბალი">
        <span aria-hidden="true">{toMtavruli(hubLabel)}</span>
      </button>

      {seats.map((t) => (
        <div key={t.i} className={`seat seat--paper${t.deg > 0 ? " seat--r" : ""}`} style={{ left: `${t.x}%`, top: `${t.y}%` }}>
          <button className="seat__who" onClick={() => t.dish && onSeat(t.i)} disabled={!t.dish} tabIndex={-1} aria-hidden="true">
            <Image src={`/illustrations/people/diner-${t.i + 1}.webp`} alt="" width={96} height={96} />
          </button>
          {t.i > 0 && !spinning && <button className="seat__x" onClick={() => onRemoveDiner(t.i)} aria-label={`მოაშორე სტუმარი ${t.i + 1}`}>×</button>}
          {t.dish && <button className="seat-card" onClick={() => onSeat(t.i)} aria-label={`${t.i === 0 ? "შენ" : `სტუმარი ${t.i + 1}`}: ${t.dish}`}>{t.dish}</button>}
        </div>
      ))}
      {diners < MAX_DINERS && !spinning && (
        <button className="wheel__add" onClick={onAddDiner} aria-label="დაამატე ადამიანი">+ <span>{diners}/{MAX_DINERS}</span></button>
      )}
    </div>
  );
}

/** Static shell shown while the hero loads: the same paper plate, empty. */
export function WheelShell() {
  return (
    <div className="wheel wheel--paper wheel--skeleton" aria-label="იტვირთება" style={BOX}>
      <svg className="wheel__svg" viewBox={`${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`} aria-hidden="true">
        <path d={deckle("plate", PLATE, 3.2)} fill="#FFF1DC" />
      </svg>
    </div>
  );
}
