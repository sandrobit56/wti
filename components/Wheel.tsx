/**
 * File:        components/Wheel.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v8.0 — the plate is a real 3D scene (components/Wheel3D.tsx, three.js);
 *              everything people click stays HTML on top of it: the hub button, diners,
 *              place cards, "+" and "×". lib/view3d.ts projects 3D points to % of the box,
 *              so the HTML lands exactly on the rendered plate.
 *              v7.x — CSS-tilted painted turntable, 2D seat layer; v6.x — painted plate, flick-to-spin
 * Description: Presentational wheel. It does NOT choose anything: it gets the dishes and a
 *              target rotation and animates there; onLanded fires when the spin settles
 *              (with a timer as a safety net in case the tab was hidden mid-spin).
 *              Two ways to spin, one result logic (Randomizer → lib/spin.ts):
 *               - the hub button (also Enter/Space) → onSpin(offset)
 *               - drag the plate and let go fast enough → onFling(velocity, offset).
 *                 While dragging, the plate follows the pointer; a slow release leaves it there.
 *              The drag zone is an HTML ellipse over the plate (clip-path), so the rest of the
 *              box stays clickable (the heads of diners standing behind the table).
 */
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { Dish } from "@/lib/catalog.ts";
import { toMtavruli } from "@/lib/mtavruli.ts";
import { MAX_DINERS, seatAngles } from "@/lib/seats.ts";
import { ASPECT, GEO, onTable, project } from "@/lib/view3d.ts";

// three.js is ~280 kB gzipped: load it after the page is interactive, show the shell meanwhile
const Wheel3D = dynamic(() => import("./Wheel3D").then((m) => m.Wheel3D), { ssr: false, loading: () => <div className="wheel3d wheel3d--loading" /> });

export const FLING_MIN = 0.35;   // deg/ms
const BOX: CSSProperties = { aspectRatio: `${ASPECT}` };

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

/* ── where things sit on screen (computed once from the camera) ── */
const C0 = project([0, GEO.top, 0]);
const RX = project(onTable(90, GEO.rim, GEO.top)).x - C0.x;
const BACK = project(onTable(0, GEO.rim, GEO.top)), FRONT = project(onTable(180, GEO.rim, GEO.top));
const PLATE = { cx: C0.x, cy: (BACK.y + FRONT.y) / 2, rx: RX, ry: (FRONT.y - BACK.y) / 2 };
const HUB_C = project([0, GEO.hubTop, 0]);
const HUB = {
  x: HUB_C.x, y: HUB_C.y,
  w: (project([GEO.hubR, GEO.hubTop, 0]).x - HUB_C.x) * 2,
  h: project([0, GEO.hubTop, GEO.hubR]).y - project([0, GEO.hubTop, -GEO.hubR]).y,
};

type Seat = { i: number; deg: number; dish: string | null; back: boolean; scale: number; fx: number; fy: number; cx: number; cy: number };
function seatAt(deg: number, i: number, dish: string | null): Seat {
  const back = Math.abs(deg) <= 90;
  // back seats stand just behind the rim (the plate hides their feet); side seats just outside it
  const foot = project(onTable(deg, back ? GEO.rim + 0.02 : GEO.rim + 0.2, back ? GEO.top : -0.1));
  const card = project(onTable(deg, back ? (GEO.plate + GEO.rim) / 2 : GEO.rim + 0.2, GEO.top));
  return {
    i, deg, dish, back,
    scale: 1 - 0.14 * Math.cos((deg * Math.PI) / 180),   // farther = smaller
    fx: foot.x, fy: foot.y + (back ? 2 : 0),
    cx: card.x, cy: back ? card.y : foot.y + 3,
  };
}

export function Wheel({ dishes, rotation, spinning, spinMs, landedOnce, onSpin, onFling, onLanded, diners, seatDishes, onSeat, onAddDiner, onRemoveDiner }: Props) {
  const grab = useRef<HTMLDivElement>(null);
  const drag = useRef<{ last: number; t: number; v: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Land once: the scene reports the end of the spin; the timer covers a hidden tab
  // (requestAnimationFrame pauses there). Randomizer.onLanded is idempotent.
  const landedRef = useRef(onLanded);
  useEffect(() => { landedRef.current = onLanded; });
  useEffect(() => {
    if (!spinning) return;
    const t = window.setTimeout(() => landedRef.current(), spinMs + 400);
    return () => window.clearTimeout(t);
  }, [spinning, spinMs]);

  /** Pointer angle around the plate centre, in degrees; the plate's ellipse is undone first. */
  function angleOf(e: PointerEvent): number {
    const r = grab.current!.getBoundingClientRect();
    const cx = r.left + (PLATE.cx / 100) * r.width, cy = r.top + (PLATE.cy / 100) * r.height;
    const squash = (PLATE.ry * r.height) / (PLATE.rx * r.width);
    return (Math.atan2((e.clientY - cy) / squash, e.clientX - cx) * 180) / Math.PI;
  }
  function down(e: PointerEvent<HTMLDivElement>) {
    if (spinning || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { last: angleOf(e), t: e.timeStamp, v: 0 };
    setDragging(true);
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const now = angleOf(e);
    const delta = ((now - d.last + 540) % 360) - 180;   // shortest way round
    const dt = Math.max(1, e.timeStamp - d.t);
    d.v = 0.6 * d.v + 0.4 * (delta / dt);
    d.last = now; d.t = e.timeStamp;
    setOffset((o) => o + delta);
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragging(false);
    const v = e.timeStamp - d.t > 80 ? 0 : d.v;          // a finger that paused doesn't fling
    if (Math.abs(v) >= FLING_MIN) { onFling(v, offset); setOffset(0); }
  }

  const hubLabel = spinning ? "…" : dragging ? "გაუშვი!" : landedOnce ? "კიდევ!" : "დაატრიალე";
  const seats = diners > 1 ? seatAngles(diners).map((deg, i) => seatAt(deg, i, seatDishes?.[i] ?? null)) : [];
  const seatFigure = (t: Seat) => (
    <div key={t.i} className={`seat ${t.back ? "seat--back" : "seat--front"}${t.deg > 0 ? " seat--r" : ""}`} style={{ left: `${t.fx}%`, top: `${t.fy}%`, ["--depth" as string]: t.scale }}>
      <button className="seat__who" onClick={() => t.dish && onSeat(t.i)} disabled={!t.dish} tabIndex={-1} aria-hidden="true">
        <Image src={`/illustrations/people/p${t.i + 1}.webp`} alt="" width={64} height={64} />
      </button>
      {t.i > 0 && !spinning && <button className="seat__x" onClick={() => onRemoveDiner(t.i)} aria-label={`მოაშორე სტუმარი ${t.i + 1}`}>×</button>}
    </div>
  );

  return (
    <div className={dragging ? "wheel wheel--3d wheel--dragging" : "wheel wheel--3d"} style={BOX}>
      {diners > 1 && seats.filter((t) => t.back).map(seatFigure)}
      <div className="wheel__table">
        <Wheel3D dishes={dishes} deg={rotation + offset} spinning={spinning} spinMs={spinMs} pointer={diners === 1} onSettled={() => landedRef.current()} />
        <div ref={grab} className="wheel__grab" role="img"
          aria-label={`ბორბალი: ${dishes.map((d) => d.name).join(", ")}. გადაატარე თითი ან დააჭირე ღილაკს.`}
          style={{ clipPath: `ellipse(${PLATE.rx}% ${PLATE.ry}% at ${PLATE.cx}% ${PLATE.cy}%)` }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        <button className="wheel__hub" style={{ left: `${HUB.x}%`, top: `${HUB.y}%`, width: `${HUB.w}%`, height: `${HUB.h}%` }}
          onClick={() => { const o = offset; setOffset(0); onSpin(o); }} disabled={spinning} aria-label="დაატრიალე ბორბალი">
          <span aria-hidden="true">{toMtavruli(hubLabel)}</span>
        </button>
      </div>
      {diners > 1 && seats.filter((t) => !t.back).map(seatFigure)}
      {diners > 1 && seats.map((t) => t.dish && (
        <button key={`c${t.i}`} className="seat-card" style={{ left: `${t.cx}%`, top: `${t.cy}%` }} onClick={() => onSeat(t.i)} aria-label={`${t.i === 0 ? "შენ" : `სტუმარი ${t.i + 1}`}: ${t.dish}`}>{t.dish}</button>
      ))}
      {diners < MAX_DINERS && !spinning && (
        <button className="wheel__add" onClick={onAddDiner} aria-label="დაამატე ადამიანი">+ <span>{diners}/{MAX_DINERS}</span></button>
      )}
    </div>
  );
}

/** Static shell shown while the hero loads: same box, an empty plate silhouette. */
export function WheelShell() {
  return (
    <div className="wheel wheel--3d wheel--skeleton" aria-label="იტვირთება" style={BOX}>
      <div className="wheel3d wheel3d--loading" style={{ clipPath: `ellipse(${PLATE.rx}% ${PLATE.ry * 1.25}% at ${PLATE.cx}% ${PLATE.cy + 4}%)` }} />
    </div>
  );
}
