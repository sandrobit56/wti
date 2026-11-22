/**
 * File:        components/Wheel.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v7.0 — 3/4 perspective (the table is tilted back in CSS 3D, diners stand upright),
 *              group mode: up to 5 diners around the table, each gets the slice in front of them;
 *              v6.4 — 3D miniature turntable (toy diorama style) as the plate;
 *              v6.3 — stickers sit ABOVE the glaze/grain (no blur), modern plump pointer
 *              instead of the antique fork; v6.2 — narrow rim, a sticker on every slice;
 *              v6.1 — stickers pilot, hub position/aspect computed here; v6.0 — painted plate + silver fork (raster art), glazed/painterly slices,
 *              flick-to-spin with a pointer (mouse, touch, pen); was v5.0 — vector plate
 * Description: Presentational wheel. It does NOT choose anything: it gets the dishes and a
 *              target rotation and animates there with a CSS transition; onLanded fires when
 *              the transition ends.
 *              Two ways to spin, one result logic (Randomizer → lib/spin.ts):
 *               - the hub button (also Enter/Space via the browser) → onSpin()
 *               - drag the plate and let go fast enough → onFling(velocity, offset).
 *                 While dragging, the plate follows the pointer (drag offset is local
 *                 state); a slow release just leaves the plate where it was put.
 *              Names run along each slice's outer arc (textPath), icons sit inside — on a
 *              plate this small, straight labels collided. Lower slices get a reversed arc
 *              so their names read upright.
 *              Slices are drawn in SVG (dishes change every spin); the plate and fork are
 *              painted bitmaps (public/illustrations/hero). A glaze gradient and a pre-rendered
 *              grain image sit on top, so code-drawn slices match the paint.
 */
"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import type { Dish } from "@/lib/catalog.ts";
import { toMtavruli } from "@/lib/mtavruli.ts";
import { stickerSrc } from "@/lib/stickers.ts";
import { MAX_DINERS, seatAngles } from "@/lib/seats.ts";

const SLICE_COLORS = ["#3B0D18", "#FFC93C", "#F8B4C0", "#FFF8EC"];
const INK = ["#FFF1DC", "#3B0D18", "#3B0D18", "#3B0D18"];
/** Cycle the palette; when n leaves one slice over, recolour it so it never matches slice 0. */
const colorOf = (i: number, n: number) => (i === n - 1 && n % SLICE_COLORS.length === 1 ? 2 : i % SLICE_COLORS.length);

const R = 150;         // slice radius = the turntable's cream top (rim props stay visible)
const FORK_TIP = -R - 10;                // pointer tip touches the slices' outer edge (labels stay readable)
const FORK_H = 66;                       // pointer length (see Fork)
const TOP = Math.floor(FORK_TIP - FORK_H) - 6;
export const VIEWBOX = `-200 ${TOP} 400 ${200 - TOP}`;
/** Where the plate centre sits inside the box, as a fraction of its height (CSS uses it for the hub). */
export const CENTER_Y = -TOP / (200 - TOP);
/** The box follows the viewBox, so CSS never has to know these numbers. */
const BOX = { aspectRatio: `400 / ${200 - TOP}` };

/** Release speed (degrees per millisecond) above which a drag becomes a spin. */
export const FLING_MIN = 0.35;

const isBottom = (deg: number) => { const a = ((deg % 360) + 360) % 360; return a > 90 && a < 270; };

function slicePath(i: number, n: number): string {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const large = 1 / n > 0.5 ? 1 : 0;
  return `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
}

/** Arc a label rides on, inside the slice that points up (the group is rotated per slice).
 *  flip: drawn right→left with the baseline nearer the rim, so it reads upright at the bottom. */
function labelArc(n: number, flip: boolean): string {
  const h = (Math.PI / n) * 0.92;
  const r = flip ? R - 4 : R - 13;
  const x = r * Math.sin(h), y = -r * Math.cos(h);
  return flip ? `M${x} ${y} A${r} ${r} 0 0 0 ${-x} ${y}` : `M${-x} ${y} A${r} ${r} 0 0 1 ${x} ${y}`;
}
const ICON_R = R - 58;   // sticker centre, measured from the plate centre
const STICKER = 66;      // sticker box (the food fills most of it)

/** Names longer than this are not printed on the wheel — the icon carries the slice. */
export const LABEL_MAX = 8;

type Props = {
  dishes: Dish[];
  rotation: number;
  spinning: boolean;
  /** Spin length in ms; the CSS transition reads it. */
  spinMs: number;
  winnerIndex: number | null;
  landedOnce: boolean;
  /** offset: degrees the plate was left turned by a slow drag (folded into the spin). */
  onSpin: (offset: number) => void;
  /** velocity: deg/ms, signed (clockwise > 0). offset: how far the plate was dragged, in degrees. */
  onFling: (velocity: number, offset: number) => void;
  onLanded: () => void;
  /** Group mode: how many diners sit at the table (1 = just you, the fork). */
  diners: number;
  /** After landing: the dish name in front of each diner (index = diner). */
  seatDishes: string[] | null;
  onSeat: (diner: number) => void;
  onAddDiner: () => void;
  onRemoveDiner: (diner: number) => void;
};

/** Table tilt (degrees). Keep in sync with --tilt in globals.css. */
const TILT = 26;
const SEAT_R = 52;   // diner distance from the centre, in cqw of the wheel box (rim ≈ 49)

export function Wheel({ dishes, rotation, spinning, spinMs, winnerIndex, landedOnce, onSpin, onFling, onLanded, diners, seatDishes, onSeat, onAddDiner, onRemoveDiner }: Props) {
  const n = dishes.length;
  const a = 360 / n;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ last: number; t: number; v: number } | null>(null);
  const [offset, setOffset] = useState(0);

  // Safety net: transitionend can be skipped (tab hidden mid-spin, transition interrupted).
  // Without it the wheel stayed "spinning" and the hub stayed disabled. Land on time anyway.
  const landedRef = useRef(onLanded);
  useEffect(() => { landedRef.current = onLanded; });
  useEffect(() => {
    if (!spinning) return;
    const t = window.setTimeout(() => landedRef.current(), spinMs + 400);
    return () => window.clearTimeout(t);
  }, [spinning, spinMs]);
  const [dragging, setDragging] = useState(false);

  /** Pointer angle around the plate centre, in degrees (clockwise from 3 o'clock). */
  function angleOf(e: PointerEvent): number {
    const r = svgRef.current!.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * CENTER_Y;
    // the table is tilted back, so vertical distances look shorter by cos(tilt)
    return (Math.atan2((e.clientY - cy) / Math.cos((TILT * Math.PI) / 180), e.clientX - cx) * 180) / Math.PI;
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
    const delta = ((now - d.last + 540) % 360) - 180; // shortest way round, so ±180° never jumps
    const dt = Math.max(1, e.timeStamp - d.t);
    d.v = 0.6 * d.v + 0.4 * (delta / dt);             // smoothed angular speed
    d.last = now; d.t = e.timeStamp;
    setOffset((o) => o + delta);
  }
  function up(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragging(false);
    // a finger that stopped before lifting should not fling: decay speed by the pause
    const v = e.timeStamp - d.t > 80 ? 0 : d.v;
    if (Math.abs(v) >= FLING_MIN) { onFling(v, offset); setOffset(0); }
  }

  const spinCls = spinning ? "wheel__disc wheel__disc--spinning" : "wheel__disc";
  const discStyle = { transform: `rotate(${rotation + offset}deg)`, ["--spin-ms" as string]: `${spinMs}ms` };
  const hubLabel = spinning ? "…" : dragging ? "გაუშვი!" : landedOnce ? "კიდევ!" : "დაატრიალე";

  return (
    <div className={dragging ? "wheel wheel--dragging" : "wheel"} style={BOX}>
      <div className="wheel__table">
      <svg
        ref={svgRef}
        viewBox={VIEWBOX}
        role="img"
        aria-label={`ბორბალი: ${dishes.map((d) => d.name).join(", ")}. გადაატარე თითი ან დააჭირე ღილაკს.`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <Defs />
        <Plate />
        {/* 1 · slices (rotate) */}
        <g className={spinCls} style={discStyle}>
          <g>
            {dishes.map((d, i) => (
              <path key={d.slug} d={slicePath(i, n)} fill={SLICE_COLORS[colorOf(i, n)]} stroke="#FFF1DC" strokeWidth={3} strokeLinejoin="round" />
            ))}
          </g>
        </g>
        {/* 2 · glaze + grain on the slices only (static light, like a real glazed plate) */}
        
        <circle r={R} fill="url(#wheel-glaze)" pointerEvents="none" />
        <circle r={R} fill="url(#wheel-edge)" pointerEvents="none" />
        <image href="/illustrations/hero/grain.webp" x={-R} y={-R} width={R * 2} height={R * 2} clipPath="url(#wheel-well)" preserveAspectRatio="none" pointerEvents="none" opacity={0.4} />
        {/* 3 · stickers + names (rotate with the slices; above the grain so food stays crisp) */}
        <g className={spinCls} style={discStyle} onTransitionEnd={(e) => { if (e.propertyName === "transform") onLanded(); }}>
          {dishes.map((d, i) => {
            const mid = i * a + a / 2;
            const won = !spinning && winnerIndex === i;
            const ci = colorOf(i, n);
            const flip = isBottom(mid + rotation + offset);
            const arcId = `wl${uid}-${i}`;
            return (
              <g key={d.slug} transform={`rotate(${mid})`}>
                <g transform={flip ? `rotate(180 0 ${-ICON_R})` : undefined}>
                  <image className="wheel__sticker" href={stickerSrc(d.slug)} x={-STICKER / 2} y={-ICON_R - STICKER / 2} width={STICKER} height={STICKER} />
                </g>
                {d.name.length <= LABEL_MAX && (
                  <>
                    <path id={arcId} d={labelArc(n, flip)} fill="none" />
                    <text className={won ? "wheel__label wheel__label--won" : "wheel__label"} style={{ fill: INK[ci] }}>
                      <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">{d.name}</textPath>
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
        {diners === 1 && <Fork />}
      </svg>
      <button className="wheel__hub" style={{ top: `${CENTER_Y * 100}%` }} onClick={() => { const o = offset; setOffset(0); onSpin(o); }} disabled={spinning} aria-label="დაატრიალე ბორბალი">
        <span aria-hidden="true">{toMtavruli(hubLabel)}</span>
      </button>
      {diners > 1 && seatAngles(diners).map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const dish = seatDishes?.[i];
        return (
          <div key={i} className={deg > 0 ? "seat seat--r" : "seat"} style={{ left: `calc(50% + ${Math.sin(rad) * SEAT_R}cqw)`, top: `calc(${CENTER_Y * 100}% - ${Math.cos(rad) * SEAT_R}cqw)` }}>
            <button className="seat__who" onClick={() => dish && onSeat(i)} disabled={!dish} aria-label={dish ? `${i === 0 ? "შენ" : `სტუმარი ${i + 1}`}: ${dish}` : `სტუმარი ${i + 1}`}>
              <Image src={`/illustrations/people/p${i + 1}.webp`} alt="" width={64} height={64} />
              {dish && <span className="seat__dish">{dish}</span>}
            </button>
            {i > 0 && !spinning && <button className="seat__x" onClick={() => onRemoveDiner(i)} aria-label={`მოაშორე სტუმარი ${i + 1}`}>×</button>}
          </div>
        );
      })}
      </div>
      {diners < MAX_DINERS && !spinning && (
        <button className="wheel__add" onClick={onAddDiner} aria-label="დაამატე ადამიანი">+ <span>{diners}/{MAX_DINERS}</span></button>
      )}
    </div>
  );
}

/** Shared gradients + clip. No SVG filters: they re-run on every frame of a spin (slow on phones);
 *  the paint texture is a pre-rendered grain image instead. */
function Defs() {
  return (
    <defs>
      <radialGradient id="wheel-glaze" cx="0.32" cy="0.28" r="0.75">
        <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
        <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="wheel-edge" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0.78" stopColor="#3B0D18" stopOpacity="0" />
        <stop offset="1" stopColor="#3B0D18" stopOpacity="0.28" />
      </radialGradient>
      <clipPath id="wheel-well"><circle r={R} /></clipPath>
    </defs>
  );
}

/** The turntable: a miniature 3D diorama (plate.webp, 867×851 crop). Its cream top is not
 *  centred in the image (the side of the disc shows at the bottom), so the image is offset to
 *  put that top's centre on (0,0). Numbers measured from the image. */
const PLATE_W = R / 0.3927 / 0.97;
const PLATE_H = PLATE_W * (851 / 867);
function Plate() {
  return <image className="wheel__plate" href="/illustrations/hero/plate.webp" x={-PLATE_W * 0.4723} y={-PLATE_H * 0.4824} width={PLATE_W} height={PLATE_H} />;
}

/** The pointer: a plump cream-outlined fork in brand coral — toy-like, not antique. */
function Fork() {
  const y = FORK_TIP - FORK_H;
  return (
    <g className="wheel__fork" transform={`translate(0 ${y})`}>
      <path d="M-6 0 h12 a3 3 0 0 1 3 3 v28 c0 4 9 3 9 10 v20 a3.5 3.5 0 0 1 -7 0 v-13 h-4 v17 a3.5 3.5 0 0 1 -7 0 v-17 h-4 v13 a3.5 3.5 0 0 1 -7 0 v-20 c0 -7 9 -6 9 -10 v-28 a3 3 0 0 1 3 -3 z"
        fill="#F1435E" stroke="#FFF1DC" strokeWidth={3.5} strokeLinejoin="round" paintOrder="stroke" />
      <path d="M-2.5 5 v22" stroke="#fff" strokeOpacity={0.55} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
}

/** Static shell shown while the interactive wheel loads: same box, plate and fork. */
export function WheelShell() {
  return (
    <div className="wheel wheel--skeleton" aria-label="იტვირთება" style={BOX}>
      <svg viewBox={VIEWBOX} aria-hidden="true">
        <Plate />
        <Fork />
      </svg>
    </div>
  );
}
