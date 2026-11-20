/**
 * File:        components/FoodRibbon.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v4.0 — scroll toy only; "▶" leads to the „კუჭის ჩელენჯი" section
 *              (the arcade mode moved there: user testing said the band was too small)
 * Description: The yellow band: scroll drives dishes + pellets into the mascot's
 *   mouth; tapping a dish feeds it. "▶ კუჭის ჩელენჯი" jumps to the game section.
 *   Reduced motion: scroll drive off (tap-to-feed still works).
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


export function FoodRibbon() {
  const ribbonRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLImageElement>(null);
  const fed = useRef<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [pop, setPop] = useState(0);
  const lastScore = useRef(0);

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
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, [frame]);

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

  /* ── render ──────────────────────────────────────────────── */
  const won = score >= DISHES_TOTAL;
  return (
    <section aria-label="პეკმენი">
      <div className={`ribbon${won ? " ribbon--won" : ""}`} ref={ribbonRef}>
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

        <Image ref={mascotRef} className="ribbon__mascot" src="/icons/mascot.svg" alt="" width={72} height={74} />
        <span key={pop} className={pop ? "ribbon__plus" : "ribbon__plus ribbon__plus--idle"} aria-hidden="true">+1</span>

        <div className="ribbon__score" aria-live="polite">
          {won ? (
            <>ბრავო, ყველაფერი შეჭამა! <button type="button" onClick={restartScroll}>თავიდან</button></>
          ) : (
            <>შეჭამა <b>{score}</b>/{DISHES_TOTAL} <span className="ribbon__hint">· სქროლე ან დააჭირე კერძს</span></>
          )}
        </div>
        <a className="ribbon__play" href="#game">▶ კუჭის ჩელენჯი</a>
      </div>
    </section>
  );
}
