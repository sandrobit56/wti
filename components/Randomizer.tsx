/**
 * File:        components/Randomizer.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0
 * Description: Phase-1 screen state: filters, place, spin → land → result.
 *              Client-only (RandomizerClient) so initial state can read storage.
 *              Logic lives in lib/spin.ts; this file only wires state + storage.
 *              Storage: localStorage "wti:v1" (filters, place, "not today" list).
 *              Nothing leaves the browser.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { DISHES, type Dish } from "@/lib/catalog.ts";
import type { RadiusKm } from "@/lib/places.ts";
import { DEFAULT_FILTERS, SpinError, spin, targetRotation, type Filters } from "@/lib/spin.ts";
import { FilterPanel, type Place } from "./FilterPanel";
import { ResultCard } from "./ResultCard";
import { Wheel } from "./Wheel";

const KEY = "wti:v1";
const DAY_MS = 24 * 60 * 60 * 1000;

type Stored = { filters: Filters; place: Place | null; radius: RadiusKm; notToday: Record<string, number> };

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null; // private mode / corrupted value → start clean
  }
}
function save(s: Stored) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable: app still works */ }
}

type Phase = "idle" | "spinning" | "landed";

function initial() {
  const s = load();
  const now = Date.now();
  const notToday = Object.fromEntries(Object.entries(s?.notToday ?? {}).filter(([, until]) => until > now));
  const filters = s?.filters ?? DEFAULT_FILTERS;
  let wheel: Dish[];
  try {
    wheel = spin(DISHES, { filters, now: new Date(), excluded: Object.keys(notToday), random: false }, Math.random).wheel;
  } catch (e) {
    if (!(e instanceof SpinError)) throw e;
    wheel = spin(DISHES, { filters, now: new Date(), excluded: Object.keys(notToday), random: true }, Math.random).wheel;
  }
  return { filters, place: s?.place ?? null, radius: s?.radius ?? (2 as RadiusKm), notToday, wheel };
}

export function Randomizer() {
  // Runs once, in the browser only (see RandomizerClient).
  const [init] = useState(initial);
  const [filters, setFilters] = useState<Filters>(init.filters);
  const [place, setPlace] = useState<Place | null>(init.place);
  const [radius, setRadius] = useState<RadiusKm>(init.radius);
  const [notToday, setNotToday] = useState<Record<string, number>>(init.notToday);
  const [wheel, setWheel] = useState<Dish[]>(init.wheel);
  const [winner, setWinner] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => { save({ filters, place, radius, notToday }); }, [filters, place, radius, notToday]);

  function ctx(f: Filters, nt: Record<string, number>, random: boolean) {
    return { filters: f, now: new Date(), excluded: Object.keys(nt), random };
  }

  function doSpin(random: boolean, nt = notToday) {
    if (phase === "spinning") return;
    try {
      const r = spin(DISHES, ctx(filters, nt, random), Math.random);
      setError(null);
      setSheetOpen(false);
      setWheel(r.wheel);
      setWinner(r.winnerIndex);
      setPhase("spinning");
      setRotation((cur) => targetRotation(cur, r.winnerIndex, r.wheel.length));
    } catch (e) {
      if (!(e instanceof SpinError)) throw e;
      setError(`ფილტრებს მხოლოდ ${e.matching} კერძი ერგება. შეარბილე ბიუჯეტი ან დიეტა.`);
    }
  }

  function onLanded() {
    setPhase("landed");
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function onNotToday() {
    if (winner === null) return;
    const nt = { ...notToday, [wheel[winner].slug]: Date.now() + DAY_MS };
    setNotToday(nt);
    doSpin(false, nt);
  }

  function locate() {
    if (!("geolocation" in navigator)) { setLocateError("ბრაუზერს ლოკაცია არ აქვს. აირჩიე უბანი."); return; }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPlace({ label: "ჩემი ლოკაცია", center: { lat: pos.coords.latitude, lng: pos.coords.longitude } }); setLocating(false); },
      () => { setLocateError("ლოკაცია ვერ მივიღე. აირჩიე უბანი."); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const activeCount = (filters.priceMax < 3 ? 1 : 0) + filters.tastes.length + filters.diet.length + (place ? 1 : 0);
  const panel = (onClose?: () => void) => (
    <FilterPanel
      filters={filters} place={place} radius={radius} locating={locating} locateError={locateError}
      onFilters={setFilters} onPlace={setPlace} onRadius={setRadius} onLocate={locate}
      onApply={() => doSpin(false)} onRandom={() => doSpin(true)} onClose={onClose}
    />
  );

  return (
    <>
      <section className="hero">
        <div className="hero__stage">
          <svg className="hero__title" viewBox="-200 -40 400 120" aria-hidden="true">
            <path id="arc" d="M-170 70 A190 190 0 0 1 170 70" fill="none" />
            <text><textPath href="#arc" startOffset="50%" textAnchor="middle">რა ვჭამოთ დღეს?</textPath></text>
          </svg>
          <h1 className="sr-only">რა ვჭამოთ დღეს?</h1>
          <Wheel dishes={wheel} rotation={rotation} spinning={phase === "spinning"} winnerIndex={phase === "landed" ? winner : null} onSpin={() => doSpin(false)} onLanded={onLanded} />
          {error && <p className="hero__error" role="alert">{error}</p>}
          <div className="hero__actions">
            <button className="pill pill--dark only-mobile" onClick={() => setSheetOpen(true)}>ფილტრები{activeCount ? ` · ${activeCount}` : ""}</button>
            <button className="pill pill--outline" onClick={() => doSpin(true)} disabled={phase === "spinning"}>შემთხვევით</button>
          </div>
        </div>
        <aside className="hero__panel only-desktop">{panel()}</aside>
      </section>

      {sheetOpen && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="ფილტრები" onClick={() => setSheetOpen(false)}>
          <div className="sheet__body" onClick={(e) => e.stopPropagation()}>
            <div className="sheet__handle" />
            {panel(() => setSheetOpen(false))}
          </div>
        </div>
      )}

      <div ref={resultRef} className="result-wrap">
        {phase === "landed" && winner !== null && (
          <ResultCard
            dish={wheel[winner]} place={place} radius={radius}
            onAgain={() => doSpin(false)} onNotToday={onNotToday}
            onPickPlace={() => (window.matchMedia("(min-width: 1024px)").matches ? window.scrollTo({ top: 0, behavior: "smooth" }) : setSheetOpen(true))}
          />
        )}
      </div>
    </>
  );
}
