/**
 * File:        components/FoodRibbon.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v3.0 — scroll toy + "კუჭის ჩელენჯი" arcade mode
 * Description: The yellow band.
 *   SCROLL mode (default): scroll drives dishes + pellets into the mascot's mouth.
 *   GAME mode ("▶ ითამაშე"): dishes run at the mascot; tap the band (or Space) when
 *     one is in its mouth. Missed dish = −1 heart (3). Every bite speeds it up.
 *     Game over → score, personal best (localStorage), and the last dish eaten —
 *     "გახსენი" opens it as today's pick (same idea as the wheel: let fate choose).
 *   Rendering: rAF loop; dish positions live in a ref, React re-renders per frame
 *   only while a game runs (≤ 8 elements). Reduced motion: scroll drive off, game
 *   slower.
 */
"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { DISHES } from "@/lib/catalog.ts";

const BASE = ["khinkali", "pizza", "sushi", "khachapuri", "burger", "noodles", "churchkhela", "taco", "salad", "mtsvadi", "cake", "fish", "shawarma", "icecream"];
const ICONS = [...BASE, ...BASE.slice(7), ...BASE.slice(0, 7)]; // two laps, so the band never runs empty
const DISHES_TOTAL = ICONS.length;
const MOUTH_OFFSET = 14;

/** Ribbon icon → dish type it stands for (validated below). */
const ICON_DISH: Record<string, string> = {
  khinkali: "khinkali", pizza: "pizza", sushi: "sushi", khachapuri: "khachapuri", burger: "burger", noodles: "ramen",
  churchkhela: "georgian-sweets", taco: "tacos", salad: "salad-bowl", mtsvadi: "mtsvadi", cake: "cake", fish: "seafood",
  shawarma: "shawarma", icecream: "ice-cream",
};
for (const [icon, slug] of Object.entries(ICON_DISH)) if (!DISHES.some((d) => d.slug === slug)) throw new Error(`FoodRibbon: ${icon} → unknown dish ${slug}`);
const DISH_NAME = new Map(DISHES.map((d) => [d.slug, d.name]));

// Game tuning
const LIVES = 3;
const SPEED0 = 210;        // px/s
const SPEED_STEP = 1.06;   // × per bite
const SPAWN_GAP = 260;     // px between dishes
const MOUTH_W = 64;        // px window that counts as "in the mouth"
const BEST_KEY = "wti:pac-best";

type Runner = { id: number; icon: string; x: number };
type Mode = "scroll" | "game" | "over";

function readBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function writeBest(n: number) {
  try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private mode: best is per visit */ }
}

export function FoodRibbon({ onPick }: { onPick: (dishSlug: string) => void }) {
  const ribbonRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLImageElement>(null);
  const fed = useRef<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [pop, setPop] = useState(0);
  const lastScore = useRef(0);

  const [mode, setMode] = useState<Mode>("scroll");
  const game = useRef({ runners: [] as Runner[], speed: SPEED0, next: 0, lives: LIVES, bites: 0, last: null as string | null, t: 0, raf: 0 });
  const [, setFrame] = useState(0);
  const [hud, setHud] = useState({ bites: 0, lives: LIVES, best: 0, last: null as string | null, shake: 0 });

  const chomp = useCallback(() => {
    const m = mascotRef.current;
    if (!m) return;
    m.classList.remove("ribbon__mascot--chomp");
    void m.offsetWidth;
    m.classList.add("ribbon__mascot--chomp");
    setPop((p) => p + 1);
  }, []);

  /* ── SCROLL mode ─────────────────────────────────────────── */
  const frame = useCallback(() => {
    const ribbon = ribbonRef.current, track = trackRef.current, mascot = mascotRef.current;
    if (!ribbon || !track || !mascot) return;
    const vh = window.innerHeight, r = ribbon.getBoundingClientRect();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      track.style.transform = `translateX(${-p * (track.scrollWidth - r.width * 0.35)}px)`;
    }
    const mouth = mascot.getBoundingClientRect().right - MOUTH_OFFSET;
    let eaten = 0;
    track.querySelectorAll<HTMLElement>("[data-i]").forEach((el) => {
      const b = el.getBoundingClientRect();
      const gone = fed.current.has(Number(el.dataset.i)) || b.left + b.width / 2 < mouth;
      el.classList.toggle("eaten", gone);
      if (gone && el.dataset.kind === "dish") eaten++;
    });
    if (eaten !== lastScore.current) {
      if (eaten > lastScore.current) chomp();
      lastScore.current = eaten;
      setScore(eaten);
    }
  }, [chomp]);

  useEffect(() => {
    if (mode !== "scroll") return;
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, [frame, mode]);

  function feed(e: MouseEvent<HTMLButtonElement>, i: number) {
    const el = e.currentTarget, m = mascotRef.current;
    if (!m || fed.current.has(i) || el.classList.contains("eaten")) return;
    const a = el.getBoundingClientRect(), b = m.getBoundingClientRect();
    el.style.setProperty("--fx", `${b.left + b.width * 0.6 - (a.left + a.width / 2)}px`);
    el.style.setProperty("--fy", `${b.top + b.height / 2 - (a.top + a.height / 2)}px`);
    el.classList.add("fly");
    window.setTimeout(() => { el.classList.remove("fly"); fed.current.add(i); frame(); }, 420);
  }

  function restartScroll() { fed.current.clear(); lastScore.current = 0; frame(); }

  /* ── GAME mode ───────────────────────────────────────────── */
  const mouthX = () => {
    const ribbon = ribbonRef.current, m = mascotRef.current;
    if (!ribbon || !m) return 100;
    return m.getBoundingClientRect().right - ribbon.getBoundingClientRect().left - 20;
  };

  const stopGame = useCallback(() => {
    const g = game.current;
    cancelAnimationFrame(g.raf);
    const best = Math.max(readBest(), g.bites);
    writeBest(best);
    setHud({ bites: g.bites, lives: 0, best, last: g.last, shake: 0 });
    setMode("over");
  }, []);

  const loop = useCallback(function step(t: number) {
    const g = game.current, ribbon = ribbonRef.current;
    if (!ribbon) return;
    const dt = g.t ? Math.min(0.05, (t - g.t) / 1000) : 0;
    g.t = t;
    const width = ribbon.clientWidth, mouth = mouthX();
    for (const r of g.runners) r.x -= g.speed * dt;
    // spawn: keep a dish every SPAWN_GAP px, entering from the right edge
    const lastX = g.runners.length ? g.runners[g.runners.length - 1].x : -Infinity;
    if (lastX < width - SPAWN_GAP) g.runners.push({ id: g.next++, icon: BASE[Math.floor(Math.random() * BASE.length)], x: width + 40 });
    // a dish that slipped past the mouth is a miss
    const missed = g.runners.filter((r) => r.x < mouth - MOUTH_W);
    if (missed.length) {
      g.runners = g.runners.filter((r) => r.x >= mouth - MOUTH_W);
      g.lives -= missed.length;
      setHud((h) => ({ ...h, lives: Math.max(0, g.lives), shake: h.shake + 1 }));
      if (g.lives <= 0) return stopGame();
    }
    setFrame((f) => f + 1);
    g.raf = requestAnimationFrame(step);
  }, [stopGame]);

  const bite = useCallback(() => {
    const g = game.current, mouth = mouthX();
    chomp();
    const hit = g.runners.find((r) => Math.abs(r.x - mouth) <= MOUTH_W / 2 + 8);
    if (!hit) return; // empty bite: just a chomp
    g.runners = g.runners.filter((r) => r !== hit);
    g.bites++;
    g.last = ICON_DISH[hit.icon];
    g.speed *= SPEED_STEP;
    setHud((h) => ({ ...h, bites: g.bites }));
  }, [chomp]);

  function startGame() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    game.current = { runners: [], speed: reduce ? SPEED0 * 0.7 : SPEED0, next: 0, lives: LIVES, bites: 0, last: null, t: 0, raf: 0 };
    setHud({ bites: 0, lives: LIVES, best: readBest(), last: null, shake: 0 });
    setMode("game");
    game.current.raf = requestAnimationFrame(loop);
  }

  // Space / Enter bites while a game runs; the loop is cancelled when the mode changes or on unmount.
  useEffect(() => {
    if (mode !== "game") return;
    const key = (e: KeyboardEvent) => { if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); bite(); } };
    window.addEventListener("keydown", key);
    const g = game.current;
    return () => { window.removeEventListener("keydown", key); cancelAnimationFrame(g.raf); };
  }, [mode, bite]);

  /* ── render ──────────────────────────────────────────────── */
  const won = mode === "scroll" && score >= DISHES_TOTAL;
  const lastName = hud.last ? DISH_NAME.get(hud.last) : null;
  return (
    <section aria-label="პეკმენის თამაში">
      <div
        className={`ribbon ribbon--${mode}${won ? " ribbon--won" : ""}${mode === "game" && hud.shake ? ` ribbon--hit${hud.shake % 2}` : ""}`}
        ref={ribbonRef}
        onPointerDown={mode === "game" ? (e) => { e.preventDefault(); bite(); } : undefined}
      >
        {mode === "scroll" && (
          <div className="ribbon__track" ref={trackRef}>
            {ICONS.map((icon, i) => (
              <span key={i} className="ribbon__cell">
                <button type="button" data-i={i} data-kind="dish" className="ribbon__item" style={{ ["--k" as string]: i % 4 }} onClick={(e) => feed(e, i)} aria-label={`აჭამე: ${DISH_NAME.get(ICON_DISH[icon])}`}>
                  <Image src={`/icons/${icon}.svg`} alt="" width={44} height={44} />
                </button>
                <span data-i={100 + i} data-kind="pellet" className="ribbon__pellet" aria-hidden="true" />
                <span data-i={200 + i} data-kind="pellet" className="ribbon__pellet" aria-hidden="true" />
              </span>
            ))}
          </div>
        )}

        {mode === "game" && (
          <div className="ribbon__lane" aria-hidden="true">
            <span className="ribbon__mouth" style={{ left: mouthX() - MOUTH_W / 2 }} />
            {game.current.runners.map((r) => (
              <span key={r.id} className="ribbon__runner" style={{ transform: `translateX(${r.x - 32}px)` }}>
                <Image src={`/icons/${r.icon}.svg`} alt="" width={44} height={44} />
              </span>
            ))}
          </div>
        )}

        {mode === "over" && (
          <div className="ribbon__over" role="status">
            <strong className="ribbon__big">{hud.bites}</strong>
            <span>
              კერძი შეჭამა{hud.bites >= hud.best && hud.bites > 0 ? " — ახალი რეკორდი! 🎉" : ` · რეკორდი ${hud.best}`}
              {lastName && <> · ბოლოს: <b>{lastName}</b></>}
            </span>
            <span className="ribbon__actions">
              {hud.last && <button type="button" className="pill pill--dark" onClick={() => onPick(hud.last!)}>„{lastName}“ — გახსენი</button>}
              <button type="button" className="pill pill--white" onClick={startGame}>ისევ</button>
              <button type="button" className="link" onClick={() => { setMode("scroll"); window.setTimeout(restartScroll, 0); }}>გამოსვლა</button>
            </span>
          </div>
        )}

        <Image ref={mascotRef} className="ribbon__mascot" src="/icons/mascot.svg" alt="" width={72} height={74} />
        <span key={pop} className={pop ? "ribbon__plus" : "ribbon__plus ribbon__plus--idle"} aria-hidden="true">+1</span>

        <div className="ribbon__score" aria-live="polite">
          {mode === "scroll" && (won ? (
            <>ბრავო, ყველაფერი შეჭამა! <button type="button" onClick={restartScroll}>თავიდან</button></>
          ) : (
            <>შეჭამა <b>{score}</b>/{DISHES_TOTAL} <span className="ribbon__hint">· სქროლე ან დააჭირე კერძს</span></>
          ))}
          {mode === "game" && (
            <><b>{hud.bites}</b> <span className="ribbon__lives" aria-label={`სიცოცხლე ${hud.lives}`}>{"♥".repeat(hud.lives)}<i>{"♥".repeat(LIVES - hud.lives)}</i></span> <span className="ribbon__hint">· დააჭირე ან Space, როცა კერძი პირშია</span></>
          )}
        </div>
        {mode === "scroll" && (
          <button type="button" className="ribbon__play" onClick={startGame}>▶ ითამაშე</button>
        )}
      </div>
    </section>
  );
}
