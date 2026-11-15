/**
 * File:        components/Randomizer.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v2.0 — location drives the wheel; every filter change updates the
 *              wheel immediately; Figma L1/L2 page structure
 * Description: Page state: filters, place, radius → available dishes → wheel →
 *              spin → three paths. Logic lives in lib/spin.ts.
 *              Client-only (RandomizerClient) so initial state can read storage.
 *              Storage: localStorage "wti:v2" (filters, place, radius, "not today").
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DISHES, type Dish } from "@/lib/catalog.ts";
import type { RadiusKm } from "@/lib/places.ts";
import { DEFAULT_FILTERS, SpinError, seeded, spin, targetRotation, type Filters, type SpinContext } from "@/lib/spin.ts";
import { FilterPanel, MY_LOCATION, type Place } from "./FilterPanel";
import { Paths, PersonaTeaser, TrustCard } from "./Paths";
import { Wheel } from "./Wheel";

const KEY = "wti:v2";
const DAY_MS = 24 * 60 * 60 * 1000;

type Stored = { filters: Filters; place: Place | null; radius: RadiusKm; notToday: Record<string, number> };
type Counts = { key: string; counts: Record<string, number>; venuesInRadius: number } | { key: string; error: string };
type Spun = { wheel: Dish[]; winner: number; landed: boolean };

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
function initial(): Stored & { now: Date; seed: number } {
  const s = load();
  const now = Date.now();
  const notToday = Object.fromEntries(Object.entries(s?.notToday ?? {}).filter(([, until]) => until > now));
  return { filters: s?.filters ?? DEFAULT_FILTERS, place: s?.place ?? null, radius: s?.radius ?? 2, notToday, now: new Date(), seed: Math.floor(Math.random() * 1e9) };
}
const placeKey = (p: Place | null, r: RadiusKm) => (p ? `${p.center.lat},${p.center.lng},${r}` : null);

export function Randomizer() {
  const [init] = useState(initial);
  const [filters, setFilters] = useState<Filters>(init.filters);
  const [place, setPlace] = useState<Place | null>(init.place);
  const [radius, setRadius] = useState<RadiusKm>(init.radius);
  const [notToday, setNotToday] = useState<Record<string, number>>(init.notToday);
  const [seed, setSeed] = useState(init.seed);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [spun, setSpun] = useState<Spun | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const pathsRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => { save({ filters, place, radius, notToday }); }, [filters, place, radius, notToday]);

  // Which dishes exist near the chosen place (server counts venues per dish).
  const key = placeKey(place, radius);
  useEffect(() => {
    if (!key || !place) return;
    const ctrl = new AbortController();
    const q = new URLSearchParams({ lat: String(place.center.lat), lng: String(place.center.lng), r: String(radius) });
    fetch(`/api/available?${q}`, { signal: ctrl.signal })
      .then(async (res) => {
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
        setCounts({ key, counts: j.counts, venuesInRadius: j.venuesInRadius });
      })
      .catch((e: Error) => { if (e.name !== "AbortError") setCounts({ key, error: e.message }); });
    return () => ctrl.abort();
  }, [key, place, radius]);

  const current = key && counts?.key === key ? counts : null;
  const loadingCounts = Boolean(key) && !current;
  const available = useMemo(() => (current && "counts" in current ? new Set(Object.keys(current.counts)) : null), [current]);

  const ctx = (random: boolean): SpinContext => ({ filters, now: init.now, excluded: Object.keys(notToday), random, available });

  // Live preview: recomputed on every filter / place / radius change.
  const preview = useMemo(() => {
    try {
      return { result: spin(DISHES, { filters, now: init.now, excluded: Object.keys(notToday), random: false, available }, seeded(seed)), error: null };
    } catch (e) {
      if (!(e instanceof SpinError)) throw e;
      return { result: null, error: e.matching };
    }
  }, [filters, notToday, available, seed, init.now]);

  // Any input change drops the last result and reshuffles the preview.
  function changed() { setSpun(null); setSpinError(null); setSeed((s) => s + 1); }
  const onFilters = (f: Filters) => { setFilters(f); changed(); };
  const onPlace = (p: Place | null) => { setPlace(p); setLocateError(null); changed(); };
  const onRadius = (r: RadiusKm) => { setRadius(r); changed(); };

  function doSpin(random: boolean, nt = notToday) {
    if (spun && !spun.landed) return;
    try {
      const r = spin(DISHES, { ...ctx(random), excluded: Object.keys(nt) }, Math.random);
      setSpinError(null);
      setSheetOpen(false);
      setSpun({ wheel: r.wheel, winner: r.winnerIndex, landed: false });
      setRotation((cur) => targetRotation(cur, r.winnerIndex, r.wheel.length));
    } catch (e) {
      if (!(e instanceof SpinError)) throw e;
      setSpinError(`ფილტრებს მხოლოდ ${e.matching} კერძი ერგება. შეარბილე ბიუჯეტი, დიეტა ან გაზარდე რადიუსი.`);
    }
  }

  function onLanded() {
    setSpun((s) => (s ? { ...s, landed: true } : s));
    window.setTimeout(() => pathsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 450);
  }

  function notTodayWinner() {
    if (!spun) return;
    const nt = { ...notToday, [spun.wheel[spun.winner].slug]: Date.now() + DAY_MS };
    setNotToday(nt);
    setSpun(null);
    heroRef.current?.scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => doSpin(false, nt), 500);
  }

  function locate() {
    if (!("geolocation" in navigator)) { setLocateError("ბრაუზერს ლოკაცია არ აქვს. აირჩიე უბანი."); return; }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); onPlace({ label: MY_LOCATION, center: { lat: pos.coords.latitude, lng: pos.coords.longitude }, wolt: null }); },
      (err) => {
        setLocating(false);
        setLocateError(err.code === err.PERMISSION_DENIED
          ? "ლოკაციაზე წვდომა დაბლოკილია. ჩართე ბრაუზერის პარამეტრებში ან აირჩიე უბანი."
          : "ლოკაცია ვერ მივიღე. სცადე თავიდან ან აირჩიე უბანი.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const wheel = spun?.wheel ?? preview.result?.wheel ?? [];
  const winner = spun?.landed ? spun.winner : null;
  const dish = spun?.landed ? spun.wheel[spun.winner] : null;
  const spinning = Boolean(spun && !spun.landed);
  const matching = preview.result?.matching ?? preview.error ?? 0;
  const activeCount = (filters.priceMax < 3 ? 1 : 0) + filters.tastes.length + filters.diet.length + (place ? 1 : 0);

  const status = (() => {
    if (current && "error" in current) return `ადგილები ვერ ჩაიტვირთა (${current.error}) — ბორბალი მთელ თბილისს იყენებს.`;
    if (loadingCounts) return "ვამოწმებ, რა არის ახლოს…";
    const where = place ? `${place.label}, ${radius} კმ${current && "venuesInRadius" in current ? ` · ${current.venuesInRadius} ადგილი` : ""}` : "მთელი თბილისი";
    return `${matching} კერძი ერგება · ${where}`;
  })();

  const panel = (onClose?: () => void) => (
    <FilterPanel
      filters={filters} place={place} radius={radius} locating={locating} locateError={locateError}
      onFilters={onFilters} onPlace={onPlace} onRadius={onRadius} onLocate={locate}
      onApply={() => doSpin(false)} onRandom={() => doSpin(true)} onClose={onClose}
    />
  );

  return (
    <>
      <section className="hero" id="wheel" ref={heroRef}>
        <div className="hero__inner container">
          <div className="hero__stage">
            <svg className="hero__title" viewBox="0 0 560 300" aria-hidden="true">
              <path id="title-arc" d="M20 300 C 110 110, 340 20, 620 60" fill="none" />
              <text><textPath href="#title-arc" startOffset="2%"><tspan className="t-sm">რა ვჭამოთ </tspan><tspan className="t-lg">დღეს?</tspan></textPath></text>
            </svg>
            <h1 className="sr-only">რა ვჭამოთ დღეს?</h1>
            {wheel.length > 0
              ? <Wheel dishes={wheel} rotation={rotation} spinning={spinning} winnerIndex={winner} onSpin={() => doSpin(false)} onLanded={onLanded} />
              : <div className="wheel wheel--empty"><p>ფილტრებს მხოლოდ {matching} კერძი ერგება.<br />შეარბილე ბიუჯეტი, დიეტა ან გაზარდე რადიუსი.</p></div>}
            <p className="hero__status" aria-live="polite">{status}</p>
            {Object.keys(notToday).length > 0 && (
              <div className="hidden-today">
                <span>დღეს დამალული:</span>
                {Object.keys(notToday).map((slug) => (
                  <button key={slug} className="chip chip--sm" onClick={() => { const { [slug]: _gone, ...rest } = notToday; void _gone; setNotToday(rest); changed(); }} aria-label={`დააბრუნე ${DISHES.find((d) => d.slug === slug)?.name}`}>
                    {DISHES.find((d) => d.slug === slug)?.name ?? slug} ×
                  </button>
                ))}
              </div>
            )}
            {spinError && <p className="hero__error" role="alert">{spinError}</p>}
            {dish && (
              <button className="hero__winner" onClick={() => pathsRef.current?.scrollIntoView({ behavior: "smooth" })}>
                ბორბალმა აირჩია: <strong>{dish.name}</strong> ↓
              </button>
            )}
            <div className="hero__actions only-mobile">
              <button className="pill pill--dark" onClick={() => setSheetOpen(true)}>ფილტრები{activeCount ? ` · ${activeCount}` : ""}</button>
              <button className="pill pill--outline" onClick={() => doSpin(true)} disabled={spinning}>შემთხვევით</button>
            </div>
          </div>
          <aside className="hero__panel only-desktop">{panel()}</aside>
        </div>
      </section>

      {sheetOpen && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="ფილტრები" onClick={() => setSheetOpen(false)}>
          <div className="sheet__body" onClick={(e) => e.stopPropagation()}>
            <div className="sheet__handle" />
            {panel(() => setSheetOpen(false))}
          </div>
        </div>
      )}

      <PersonaTeaser />
      <TrustCard />

      <div ref={pathsRef} className="paths-anchor">
        <Paths
          dish={dish} place={place} radius={radius}
          onPickPlace={() => (window.matchMedia("(min-width: 1024px)").matches ? heroRef.current?.scrollIntoView({ behavior: "smooth" }) : setSheetOpen(true))}
        />
        {dish && (
          <div className="container again">
            <button className="pill pill--dark" onClick={() => { heroRef.current?.scrollIntoView({ behavior: "smooth" }); window.setTimeout(() => doSpin(false), 500); }}>კიდევ დაატრიალე</button>
            <button className="pill pill--outline" onClick={notTodayWinner}>„{dish.name}“ დღეს არა</button>
          </div>
        )}
      </div>
    </>
  );
}
