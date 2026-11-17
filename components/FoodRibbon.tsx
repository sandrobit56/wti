/**
 * File:        components/FoodRibbon.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v2.0 — Pac-Man mini-game
 * Description: The yellow band between the wheel and the content.
 *   - Scroll drives the row of dishes (and pellets) left into the mascot's mouth;
 *     whatever passes the mouth is eaten (crumbs, "+1", chomp). Scrolling back
 *     brings them back — the scroll is the joystick.
 *   - Tap a dish to feed it directly: it flies into the mouth and stays eaten.
 *   - Everything eaten → a small win state with a link back to the wheel.
 *   One rAF per scroll frame; DOM classes are toggled directly (no React re-render
 *   per frame), React state only for the score. Reduced motion: no scroll drive,
 *   tapping still works.
 */
"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

const BASE = ["khinkali", "pizza", "sushi", "khachapuri", "burger", "noodles", "churchkhela", "taco", "salad", "mtsvadi", "cake", "fish", "shawarma", "icecream"];
const ICONS = [...BASE, ...BASE.slice(7), ...BASE.slice(0, 7)]; // two laps, so the band never runs empty
const DISHES_TOTAL = ICONS.length;
const MOUTH_OFFSET = 14; // px inside the mascot's right edge where things count as eaten

export function FoodRibbon() {
  const ribbonRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLImageElement>(null);
  const fed = useRef<Set<number>>(new Set()); // dishes eaten by tapping
  const [score, setScore] = useState(0);
  const [pop, setPop] = useState(0); // bump to replay the "+1" animation
  const lastScore = useRef(0);

  const chomp = useCallback(() => {
    const m = mascotRef.current;
    if (!m) return;
    m.classList.remove("ribbon__mascot--chomp");
    void m.offsetWidth; // restart the CSS animation
    m.classList.add("ribbon__mascot--chomp");
    setPop((p) => p + 1);
  }, []);

  // Scroll → slide the track, then decide what is past the mouth.
  const frame = useCallback(() => {
    const ribbon = ribbonRef.current, track = trackRef.current, mascot = mascotRef.current;
    if (!ribbon || !track || !mascot) return;
    const vh = window.innerHeight, r = ribbon.getBoundingClientRect();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      const travel = track.scrollWidth - r.width * 0.35;
      track.style.transform = `translateX(${-p * travel}px)`;
    }
    const mouth = mascot.getBoundingClientRect().right - MOUTH_OFFSET;
    let eaten = 0;
    track.querySelectorAll<HTMLElement>("[data-i]").forEach((el) => {
      const i = Number(el.dataset.i);
      const b = el.getBoundingClientRect();
      const gone = fed.current.has(i) || b.left + b.width / 2 < mouth;
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

  function restart() {
    fed.current.clear();
    lastScore.current = 0;
    frame();
  }

  const won = score >= DISHES_TOTAL;
  return (
    <div className={won ? "ribbon ribbon--won" : "ribbon"} ref={ribbonRef}>
      <div className="ribbon__track" ref={trackRef}>
        {ICONS.map((icon, i) => (
          <span key={i} className="ribbon__cell">
            <button type="button" data-i={i} data-kind="dish" className="ribbon__item" style={{ ["--k" as string]: i % 4 }} onClick={(e) => feed(e, i)} aria-label={`აჭამე: ${icon}`}>
              <Image src={`/icons/${icon}.svg`} alt="" width={44} height={44} />
              <i className="ribbon__crumbs" aria-hidden="true" />
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
          <>ბრავო, ყველაფერი შეჭამა! <a href="#wheel">ახლა შენი ჯერია ↑</a> <button type="button" onClick={restart}>თავიდან</button></>
        ) : (
          <>შეჭამა <b>{score}</b>/{DISHES_TOTAL} <span className="ribbon__hint">· სქროლე ან დააჭირე კერძს</span></>
        )}
      </div>
    </div>
  );
}
