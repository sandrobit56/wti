"use client";
/**
 * File:        components/SupraFlyer.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-25
 * Version:     v8.1 one-strip title; v8 — surreal sky: Hermes flies over a supra floating on pink clouds
 *              with marble ruins (parallax, mirrored tiles); start screen explains the goal;
 *              v7.4 collage chili + toast art, no emoji; v1.0 — replaces "კუჭის ჩელენჯი" (no story arc, per Sandro's review)
 * Description: "სუფრის მფრინავი". Hermes flies over a supra floating in a pink sky.
 *              Four courses = a story line (stepper above the stage); the tamada's toast is the
 *              break between them; the end reveals your stomach's persona (tarot card).
 *              Rules live in lib/flyer.ts (tested); this file only draws and reads input.
 *              Canvas, one rAF loop, refs for per-frame state; React state only for the HUD and
 *              screens, so the page doesn't re-render 60×/s. Pointer (mouse/touch) steers;
 *              ↑ ↓ work when the stage is focused.
 */
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { COURSES, START, gapOf, hits, nextCourse, onCatch, spawn, speedOf, type Spawn, type State } from "@/lib/flyer.ts";
import { stomachPersona } from "@/lib/game.ts";
import { PERSONAS } from "@/lib/personas.ts";
import { DISHES } from "@/lib/catalog.ts";
import { stickerSrc } from "@/lib/stickers.ts";
import { toMtavruli } from "@/lib/mtavruli.ts";
import type { PersonaId } from "@/lib/quiz.ts";
import { TarotCard } from "./TarotCard";
import { Strip } from "./Strip";

type Item = { x: number; y: number; bob: number; what: Spawn };
type Pop = { x: number; y: number; t: number; text: string; bad: boolean };
type Screen = "idle" | "play" | "toast" | "won" | "lost";

const MASCOT_R = 30, ITEM_R = 26, TOAST_MS = 1900;
const NAME = new Map(DISHES.map((d) => [d.slug, d.name]));

function topThree(eaten: string[]): string[] {
  const n = new Map<string, number>();
  for (const s of eaten) n.set(s, (n.get(s) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);
}

export function SupraFlyer({ onDish }: { onDish: (slug: string) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<Screen>("idle");
  const [hud, setHud] = useState<State>(START);
  const [persona, setPersona] = useState<PersonaId | null>(null);

  // per-frame state (never triggers renders)
  const game = useRef<State>(START);
  const items = useRef<Item[]>([]);
  const pops = useRef<Pop[]>([]);
  const me = useRef({ x: 120, y: 160, ty: 160, tx: 120, vy: 0 });
  const clock = useRef({ spawnIn: 0.6, spin: 0, shake: 0 });
  const imgs = useRef<Record<string, HTMLImageElement>>({});

  // preload art once
  useEffect(() => {
    const load = (key: string, src: string) => { const im = new window.Image(); im.src = src; imgs.current[key] = im; };
    for (const c of COURSES) for (const s of c.dishes) load(s, stickerSrc(s));
    load("chili", "/collage/chili.webp");   // collage cut-out (v7.4)
    load("mascot", "/collage/hermes-sm.webp");   // v8: Hermes, god of delivery, flies the supra
    load("supra", "/collage/supra-clouds.webp");  // feast table on pink clouds with marble ruins
    load("clouds", "/collage/clouds-soft.webp");   // bottom faded, no hard edge in the sky
  }, []);

  const finish = useCallback((s: State) => {
    setPersona(stomachPersona(s.eaten));
    setScreen(s.phase === "won" ? "won" : "lost");
  }, []);

  function start() {
    game.current = START; items.current = []; pops.current = [];
    clock.current = { spawnIn: 0.6, spin: 0, shake: 0 };
    setHud(START); setPersona(null); setScreen("play");
    stageRef.current?.focus({ preventScroll: true });
  }

  // toast → next course after a beat
  useEffect(() => {
    if (screen !== "toast") return;
    const t = window.setTimeout(() => {
      game.current = nextCourse(game.current); setHud(game.current); setScreen("play");
    }, TOAST_MS);
    return () => window.clearTimeout(t);
  }, [screen]);

  // the loop: runs while playing or toasting (the table keeps turning under the toast)
  useEffect(() => {
    if (screen !== "play" && screen !== "toast") return;
    const cv = canvasRef.current!, ctx = cv.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = game.current, c = clock.current, m = me.current;
      const speed = speedOf(g.course) * (reduce ? 0.7 : 1);
      const skyTop = H * 0.14, skyBottom = H * 0.62;

      // ── update
      c.spin += dt * speed * 0.0009;
      m.ty = Math.max(skyTop, Math.min(skyBottom, m.ty));
      m.tx = Math.max(W * 0.1, Math.min(W * 0.5, m.tx));
      const py = m.y; m.y += (m.ty - m.y) * Math.min(1, dt * 7); m.x += (m.tx - m.x) * Math.min(1, dt * 4);
      m.vy = (m.y - py) / Math.max(dt, 0.001);
      if (screen === "play") {
        c.spawnIn -= dt;
        if (c.spawnIn <= 0) {
          c.spawnIn = gapOf(g.course) * (0.75 + Math.random() * 0.5);
          items.current.push({ x: W + 40, y: skyTop + Math.random() * (skyBottom - skyTop), bob: Math.random() * 6, what: spawn(g.course, Math.random) });
        }
      }
      for (const it of items.current) { it.x -= speed * dt; it.bob += dt * 3; }
      if (screen === "play") {
        for (const it of items.current) {
          if (it.x < -100 || !hits(m.x, m.y, MASCOT_R, it.x, it.y + Math.sin(it.bob) * 6, ITEM_R)) continue;
          it.x = -999;
          const s = onCatch(game.current, it.what);
          game.current = s; setHud(s);
          const bad = it.what.kind === "chili";
          if (bad) c.shake = 0.35;
          pops.current.push({ x: m.x, y: m.y - 30, t: 0, bad, text: bad ? "−♥" : "+1" });
          if (s.phase === "toast") { items.current = []; setScreen("toast"); }
          if (s.phase === "won" || s.phase === "lost") { finish(s); return; }
        }
      }
      items.current = items.current.filter((it) => it.x > -100);
      for (const p of pops.current) { p.t += dt; p.y -= dt * 50; }
      pops.current = pops.current.filter((p) => p.t < 0.8);
      c.shake = Math.max(0, c.shake - dt);

      // ── draw
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (c.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * c.shake, (Math.random() - 0.5) * 10 * c.shake);
      // v8 surreal sky: far clouds (slow) and the floating supra (faster), mirrored tiles so the seam never shows
      const tile = (im: HTMLImageElement | undefined, h: number, y: number, rate: number, alpha: number) => {
        if (!im?.complete || !im.naturalWidth) return;
        const w = h * (im.naturalWidth / im.naturalHeight);
        const off = (c.spin * rate) % (w * 2);
        ctx.globalAlpha = alpha;
        for (let x = -off; x < W + w; x += w * 2) {
          ctx.drawImage(im, x, y, w, h);
          ctx.save(); ctx.translate(x + w * 2, y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, w, h); ctx.restore();
        }
        ctx.globalAlpha = 1;
      };
      tile(imgs.current.clouds, H * 0.34, H * 0.06, 260, 0.55);
      const groundH = Math.min(H * 0.36, W * 0.62);   // phones are tall and narrow: size by width there
      tile(imgs.current.supra, groundH, H - groundH * 0.82, 700, 1);
      // dishes & chili
      for (const it of items.current) {
        const im = imgs.current[it.what.kind === "chili" ? "chili" : it.what.slug];
        const y = it.y + Math.sin(it.bob) * 6, s = ITEM_R * 2.4;
        if (im?.complete) ctx.drawImage(im, it.x - s / 2, y - s / 2, s, s);
      }
      // mascot, tilted by its climb
      const mascot = imgs.current.mascot;
      if (mascot?.complete) {
        ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(Math.max(-0.5, Math.min(0.5, m.vy * 0.0012)));
        const h = MASCOT_R * 3.6, w = h * (444 / 759); ctx.drawImage(mascot, -w / 2, -h * 0.55, w, h); ctx.restore();
      }
      ctx.font = "900 22px 'Google Sans Variable', sans-serif"; ctx.textAlign = "center";
      for (const p of pops.current) { ctx.globalAlpha = 1 - p.t / 0.8; ctx.fillStyle = p.bad ? "#D92F4C" : "#1C1A17"; ctx.fillText(p.text, p.x, p.y); }
      ctx.globalAlpha = 1; ctx.restore();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [screen, finish]);

  // steering
  const steer = (e: React.PointerEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    me.current.ty = e.clientY - r.top; me.current.tx = e.clientX - r.left;
  };
  const keys = (e: React.KeyboardEvent) => {
    if (screen !== "play") return;
    if (e.key === "ArrowUp") { me.current.ty -= 48; e.preventDefault(); }
    if (e.key === "ArrowDown") { me.current.ty += 48; e.preventDefault(); }
  };

  const course = COURSES[hud.course];
  return (
    <section className="game2 sect" id="game" aria-labelledby="game-title">
      <div className="container game2__inner">
        <h2 id="game-title" className="section-title display game2__title"><Strip text={toMtavruli("სუფრის მფრინავი")} straight className="title-strip title-strip--action" /></h2>
        <p className="game2__sub">გაიფრინე სუფრაზე: შეჭამე ყველა კერძი, აარიდე წიწაკას. თამადა ელოდება.</p>

        <ol className="game2__steps" aria-label="სუფრის რიგი">
          {COURSES.map((c, i) => (
            <li key={c.name} className={i < hud.course || screen === "won" ? "done" : i === hud.course && screen !== "idle" ? "on" : ""}>{c.name}</li>
          ))}
        </ol>

        <div
          ref={stageRef} className={`game2__stage game2__stage--${screen}`} tabIndex={0}
          onPointerMove={steer} onPointerDown={steer} onKeyDown={keys}
          aria-label="თამაშის ველი: მაუსით ან თითით მართე, ან ისრებით ↑ ↓"
        >
          <canvas ref={canvasRef} className="game2__canvas" />

          {(screen === "play" || screen === "toast") && (
            <div className="game2__hud" aria-live="polite">
              <span className="game2__course">{course.name} · {hud.got}/{course.need}</span>
              <span className="game2__lives" aria-label={`სიცოცხლე ${hud.lives}`}>{"♥".repeat(hud.lives)}<i>{"♥".repeat(3 - hud.lives)}</i></span>
            </div>
          )}

          {screen === "idle" && (
            /* Figma v8 start frame: soft clouds (55%) and the supra on clouds, drawn as still images until play starts */
            <div className="game2__scene" aria-hidden="true">
              <Image className="game2__scene-clouds" src="/collage/clouds-soft.webp" alt="" width={1600} height={406} sizes="1040px" />
              <Image className="game2__scene-supra" src="/collage/supra-clouds.webp" alt="" width={1600} height={571} sizes="1040px" />
            </div>
          )}
          {screen === "idle" && (
            <div className="game2__screen">
              <Image className="game2__hero" src="/collage/hermes-sm.webp" alt="" width={444} height={759} sizes="120px" />
              <p className="game2__how"><b>ჰერმესს შია.</b> თითით ან მაუსით ატარე სუფრაზე, შეჭამე კერძები, აარიდე წიწაკას.</p>
              <p className="game2__rules">4 რიგი · 3 სიცოცხლე</p>
              <button className="btn" onClick={start}>აფრენა</button>
            </div>
          )}

          {screen === "toast" && (
            <div className="game2__toast" role="status">
              <Image className="game2__glass" src="/collage/khinkali-hand.webp" alt="" aria-hidden="true" width={605} height={1000} sizes="84px" />
              <p>{toMtavruli(course.toast)}</p>
              <small>შემდეგი: {COURSES[hud.course + 1]?.name}</small>
            </div>
          )}

          {(screen === "won" || screen === "lost") && (
            <div className="game2__screen game2__screen--over" role="status">
              <p className="game2__verdict">{screen === "won" ? "სუფრა დაასრულე!" : `წიწაკამ გაჯობა · ${course.name}`}</p>
              {persona && (
                <div className="game2__reveal">
                  <TarotCard id={persona} size="sm" tilt={false} />
                  <span>შენმა კუჭმა გამოავლინა: <b>{PERSONAS[persona].name}</b></span>
                </div>
              )}
              {hud.eaten.length > 0 && (
                <div className="game2__ate">
                  {topThree(hud.eaten).map((s) => (
                    <button key={s} onClick={() => onDish(s)} aria-label={`ნახე ${NAME.get(s)}`}>
                      <Image src={stickerSrc(s)} alt="" width={48} height={48} />{NAME.get(s)}
                    </button>
                  ))}
                </div>
              )}
              <button className="btn" onClick={start}>↻ თავიდან</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
