/**
 * File:        components/StomachChallenge.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-20
 * Version:     v1.1 — food creatures in the lanes; game over reveals "your stomach's
 *              card" (stomachPersona) as a tarot card; start screen = challenge card
 * Description: „კუჭის ჩელენჯი" — the game gets its own section (user testing: the
 *   yellow band was too small to play on).
 *   - 3 lanes, 60 s, 3 hearts. Tap/click a lane (or ↑ ↓ / W S) to move the mascot.
 *   - Dishes = +1 (persona dish +2). Chili = −1 heart.
 *   - ORDER TICKET: 3 dishes from the user's current wheel; eating one stamps it +3.
 *   - Game over: score, best (localStorage "wti:stomach-best"), and the 3 most
 *     eaten dishes as tags → the dish popup (versions, places, delivery).
 *   Rules live in lib/game.ts. Rendering: positions in a ref, one React render per
 *   animation frame only while playing.
 */
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DISHES } from "@/lib/catalog.ts";
import { CREATURE_OF } from "@/lib/creatures.ts";
import { LANES, LIVES, ROUND_S, makeTicket, pace, pickSpawn, points, stomachPersona, topEaten } from "@/lib/game.ts";
import { PERSONAS } from "@/lib/personas.ts";
import type { PersonaId } from "@/lib/quiz.ts";
import { DishTag } from "./DishTag";
import { TarotCard } from "./TarotCard";

const BY_SLUG = new Map(DISHES.map((d) => [d.slug, d]));
const BEST_KEY = "wti:stomach-best";
const MASCOT_X = 64;   // px, centre of the mascot
const HIT_R = 40;      // px, eat radius

type Item = { id: number; lane: number; x: number; kind: "dish" | "chili"; slug?: string };
type Phase = "idle" | "play" | "over";
type Pop = { id: number; lane: number; text: string; bad: boolean };

function readBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function writeBest(n: number) {
  try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private mode: best is per visit */ }
}

type Props = { wheelSlugs: string[]; personaId: PersonaId | null; onDish: (slug: string) => void };

export function StomachChallenge({ wheelSlugs, personaId, onDish }: Props) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const persona = personaId ? PERSONAS[personaId] : null;
  const wheelKey = wheelSlugs.join(",");
  // A fresh ticket whenever the wheel (= the filters) changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ticket = useMemo(() => makeTicket(wheelSlugs, Math.random), [wheelKey]);

  const [phase, setPhase] = useState<Phase>("idle");
  const g = useRef({ items: [] as Item[], lane: 1, t0: 0, last: 0, spawnIn: 0, next: 0, lives: LIVES, score: 0, eaten: [] as string[], stamped: [] as string[], raf: 0, reduce: false });
  const [, setFrame] = useState(0);
  const [pops, setPops] = useState<Pop[]>([]);
  const [result, setResult] = useState({ score: 0, best: 0, top: [] as string[], stamped: [] as string[], record: false, card: null as PersonaId | null });

  const pop = (lane: number, text: string, bad = false) => {
    const id = g.current.next++;
    setPops((p) => [...p.slice(-5), { id, lane, text, bad }]);
    window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 700);
  };

  const finish = useCallback(() => {
    const s = g.current;
    cancelAnimationFrame(s.raf);
    const prev = readBest();
    writeBest(Math.max(prev, s.score));
    setResult({ score: s.score, best: Math.max(prev, s.score), top: topEaten(s.eaten), stamped: [...s.stamped], record: s.score > prev && s.score > 0, card: stomachPersona(s.eaten) });
    setPhase("over");
  }, []);

  const step = useCallback(function loop(t: number) {
    const s = g.current, arena = arenaRef.current;
    if (!arena) return;
    if (!s.t0) { s.t0 = t; s.last = t; }
    const dt = Math.min(0.05, (t - s.last) / 1000);
    s.last = t;
    const elapsed = (t - s.t0) / 1000;
    const progress = elapsed / ROUND_S;
    if (progress >= 1) return finish();
    const { speed, gap } = pace(progress, s.reduce);
    const width = arena.clientWidth;

    s.spawnIn -= dt;
    if (s.spawnIn <= 0) {
      const sp = pickSpawn(Math.random, ticket.filter((x) => !s.stamped.includes(x)), progress);
      s.items.push({ id: s.next++, lane: Math.floor(Math.random() * LANES), x: width + 40, ...sp });
      s.spawnIn = gap;
    }
    for (const it of s.items) it.x -= speed * dt;

    const keep: Item[] = [];
    for (const it of s.items) {
      if (it.lane === s.lane && Math.abs(it.x - MASCOT_X) < HIT_R) {
        if (it.kind === "chili") {
          s.lives--;
          pop(it.lane, "−♥", true);
          if (s.lives <= 0) { s.items = []; return finish(); }
        } else {
          const slug = it.slug!;
          const stamps = ticket.includes(slug) && !s.stamped.includes(slug);
          if (stamps) s.stamped.push(slug);
          const pts = points(slug, stamps, persona?.matches ?? null);
          s.score += pts;
          s.eaten.push(slug);
          pop(it.lane, stamps ? `+${pts} შეკვეთა!` : `+${pts}`);
        }
        continue;
      }
      if (it.x > -60) keep.push(it);
    }
    s.items = keep;
    setFrame((f) => f + 1);
    s.raf = requestAnimationFrame(loop);
  }, [finish, ticket, persona]);

  function start() {
    const s = g.current;
    cancelAnimationFrame(s.raf);
    g.current = { items: [], lane: 1, t0: 0, last: 0, spawnIn: 0.4, next: 0, lives: LIVES, score: 0, eaten: [], stamped: [], raf: 0, reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches };
    setPops([]);
    setPhase("play");
    g.current.raf = requestAnimationFrame(step);
    arenaRef.current?.focus({ preventScroll: true });
  }

  const move = (lane: number) => { g.current.lane = Math.max(0, Math.min(LANES - 1, lane)); setFrame((f) => f + 1); };

  useEffect(() => {
    if (phase !== "play") return;
    const key = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); move(g.current.lane - 1); }
      if (e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); move(g.current.lane + 1); }
    };
    window.addEventListener("keydown", key);
    const s = g.current;
    return () => { window.removeEventListener("keydown", key); cancelAnimationFrame(s.raf); };
  }, [phase]);

  const s = g.current;
  const left = phase === "play" && s.t0 ? Math.max(0, Math.ceil(ROUND_S - (s.last - s.t0) / 1000)) : ROUND_S;
  const laneTop = (lane: number) => `${((lane + 0.5) / LANES) * 100}%`;

  return (
    <section id="game" className="game container sect" aria-labelledby="game-title">
      <div className="game__head">
        <h2 id="game-title" className="game__title">კუჭის ჩელენჯი</h2>
        <p className="game__sub">60 წამი. შეჭამე, აარიდე წიწაკას.</p>
      </div>

      <div className="game__ticket" aria-label="დღის შეკვეთა">
        <span className="game__ticket-h" title="3 კერძი შენი ბორბლიდან — თითო +3 ქულა">შეკვეთა +3</span>
        <span className="game__ticket-orders">
          {ticket.map((slug) => {
            const d = BY_SLUG.get(slug)!;
            const done = (phase === "over" ? result.stamped : s.stamped).includes(slug);
            return (
              <span key={slug} className={done ? "game__order done" : "game__order"}>
                <Image src={`/icons/${d.icon}.svg`} alt="" width={26} height={26} />{d.name}
                {done && <span className="game__stamp" aria-label="შესრულდა">✓</span>}
              </span>
            );
          })}
        </span>
        {persona && <span className="game__persona">{persona.name}: ×2</span>}
      </div>

      <div
        ref={arenaRef}
        tabIndex={-1}
        className={`game__arena game__arena--${phase}`}
        onPointerDown={phase === "play" ? (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          move(Math.floor(((e.clientY - r.top) / r.height) * LANES));
        } : undefined}
      >
        {Array.from({ length: LANES - 1 }, (_, i) => <span key={i} className="game__line" style={{ top: `${((i + 1) / LANES) * 100}%` }} aria-hidden="true" />)}

        {phase === "play" && (
          <>
            <div className="game__hud" aria-live="off">
              <b>{s.score}</b>
              <span className="game__lives" aria-label={`სიცოცხლე ${s.lives}`}>{"♥".repeat(s.lives)}<i>{"♥".repeat(LIVES - s.lives)}</i></span>
              <span className="game__time">{left} წმ</span>
            </div>
            {s.items.map((it) => (
              <span key={it.id} className={it.kind === "chili" ? "game__item game__item--chili" : "game__item"} style={{ top: laneTop(it.lane), transform: `translate(${it.x - 30}px, -50%)` }} aria-hidden="true">
                <Image src={it.kind === "chili" ? "/icons/chili.svg" : CREATURE_OF.get(it.slug!) ?? `/icons/${BY_SLUG.get(it.slug!)!.icon}.svg`} alt="" width={44} height={44} />
              </span>
            ))}
            {pops.map((p) => <span key={p.id} className={p.bad ? "game__pop game__pop--bad" : "game__pop"} style={{ top: laneTop(p.lane) }} aria-hidden="true">{p.text}</span>)}
            <Image className="game__mascot" src="/icons/mascot.svg" alt="" width={64} height={66} style={{ top: laneTop(s.lane) }} />
          </>
        )}

        {phase === "idle" && (
          <div className="game__screen">
            <div className="game__card">
              <Image className="game__hero-mascot" src="/icons/mascot.svg" alt="" width={88} height={91} />
              <ul className="game__rules" aria-label="წესები">
                <li><span className="game__key" aria-hidden="true">↑↓</span><span className="game__rule-txt">მოძრაობა</span></li>
                <li><Image src="/illustrations/creatures/khinkali.webp" alt="" width={28} height={28} />+1</li>
                <li><Image src="/icons/chili.svg" alt="" width={24} height={24} />−♥</li>
              </ul>
              <button type="button" className="pill pill--dark game__start" onClick={start}>▶ დაწყება</button>
            </div>
          </div>
        )}

        {phase === "over" && (
          <div className="game__screen" role="status">
            <div className="game__card game__card--over">
            {result.card && (
              <div className="game__reveal">
                <TarotCard id={result.card} size="sm" tilt={false} />
                <span className="game__reveal-cap">შენმა კუჭმა გამოავლინა:<b>{PERSONAS[result.card].name}</b></span>
              </div>
            )}
            <strong className="game__big">{result.score}</strong>
            <span className="game__verdict">{result.record ? "ახალი რეკორდი! 🎉" : `ქულა · რეკორდი ${result.best}`}{result.stamped.length === ticket.length ? " · შეკვეთა სრულად შესრულდა" : ""}</span>
            {result.top.length > 0 && (
              <div className="game__top">
                <span>შენმა კუჭმა აირჩია — სად ვჭამოთ?</span>
                <div className="dtags">{result.top.map((slug) => <DishTag key={slug} slug={slug} onOpen={onDish} />)}</div>
              </div>
            )}
            <button type="button" className="pill pill--dark game__start" onClick={start}>ისევ</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
