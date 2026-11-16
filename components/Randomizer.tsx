/**
 * File:        components/Randomizer.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v3.1 — mood chips, memory of past winners, "never" list, "why this"
 * Description: Page state: filters, place, radius → available dishes → wheel →
 *              spin → three paths. Logic lives in lib/spin.ts.
 *              Client-only (RandomizerClient) so initial state can read storage.
 *              Storage: localStorage "wti:v2" (filters, place, radius, "not today").
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DISHES, type Dish } from "@/lib/catalog.ts";
import type { RadiusKm } from "@/lib/places.ts";
import { PERSONAS } from "@/lib/personas.ts";
import { applyQuiz, scoreQuiz } from "@/lib/quiz.ts";
import { DEFAULT_FILTERS, NO_PREFS, SpinError, explain, pickVariants, seeded, spin, targetRotation, type Filters, type Mood, type Prefs, type SpinContext, type Win } from "@/lib/spin.ts";
import { FilterPanel, MY_LOCATION, type Place } from "./FilterPanel";
import { Paths, PersonaTeaser, TrustCard } from "./Paths";
import { Quiz } from "./Quiz";
import { ResultModal } from "./ResultModal";
import { Wheel } from "./Wheel";

const KEY = "wti:v2";
const DAY_MS = 24 * 60 * 60 * 1000;

type Stored = { filters: Filters; place: Place | null; radius: RadiusKm; notToday: Record<string, number>; quizAnswers?: string[] | null; never?: string[]; history?: Win[] };
const HISTORY_MAX = 30;
const MOODS: { id: Mood; label: string }[] = [
  { id: "hungry", label: "მგელივით მშიერი" },
  { id: "light", label: "რაღაც მსუბუქი" },
  { id: "new", label: "ახალი რამე" },
];
type Counts = { key: string; counts: Record<string, number>; venuesInRadius: number } | { key: string; error: string };
type Spun = { wheel: Dish[]; winner: number; landed: boolean; why: string[]; ctx: SpinContext };

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
  return { filters: s?.filters ?? DEFAULT_FILTERS, place: s?.place ?? null, radius: s?.radius ?? 2, notToday, quizAnswers: s?.quizAnswers ?? null, never: s?.never ?? [], history: s?.history ?? [], now: new Date(), seed: Math.floor(Math.random() * 1e9) };
}
/** Stored answers → soft prefs. Answers from an older quiz version are dropped (fail safe, not silent: user just sees no persona). */
function prefsFrom(answers: string[] | null | undefined): Prefs {
  if (!answers) return NO_PREFS;
  try { return applyQuiz(scoreQuiz(answers)).prefs; } catch { return NO_PREFS; }
}
const nameOf = (slug: string) => DISHES.find((d) => d.slug === slug)?.name ?? slug;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<string[] | null>(init.quizAnswers ?? null);
  const prefs = useMemo(() => prefsFrom(quizAnswers), [quizAnswers]);
  const persona = prefs.persona ? PERSONAS[prefs.persona] : null;
  const [pendingSpin, setPendingSpin] = useState(0);
  const [never, setNever] = useState<string[]>(init.never ?? []);
  const [history, setHistory] = useState<Win[]>(init.history ?? []);
  const [mood, setMood] = useState<Mood | null>(null);
  const excluded = useMemo(() => [...Object.keys(notToday), ...never], [notToday, never]);
  const doSpinRef = useRef<(random: boolean) => void>(() => {});
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const pathsRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => { save({ filters, place, radius, notToday, quizAnswers, never, history }); }, [filters, place, radius, notToday, quizAnswers, never, history]);

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

  const ctx = (random: boolean): SpinContext => ({ filters, now: new Date(), excluded, random, available, prefs, mood, history });

  // Live preview: recomputed on every filter / place / radius change.
  const preview = useMemo(() => {
    try {
      return { result: spin(DISHES, { filters, now: init.now, excluded, random: false, available, prefs, mood, history }, seeded(seed)), error: null };
    } catch (e) {
      if (!(e instanceof SpinError)) throw e;
      return { result: null, error: e.matching };
    }
  }, [filters, excluded, available, seed, init.now, prefs, mood, history]);

  // Any input change drops the last result and reshuffles the preview.
  function changed() { setSpun(null); setSpinError(null); setSeed((s) => s + 1); }
  const onFilters = (f: Filters) => { setFilters(f); changed(); };
  const onPlace = (p: Place | null) => { setPlace(p); setLocateError(null); changed(); };
  const onRadius = (r: RadiusKm) => { setRadius(r); changed(); };

  function doSpin(random: boolean, extraExcluded: string[] = []) {
    if (spun && !spun.landed) return;
    try {
      const c = { ...ctx(random), excluded: [...excluded, ...extraExcluded] };
      const r = spin(DISHES, c, Math.random);
      const dishWon = r.wheel[r.winnerIndex];
      const near = current && "counts" in current ? current.counts[dishWon.slug] : undefined;
      const why = [...explain(dishWon, c, persona?.name ?? null), ...(near ? [`${near} ადგილი ${radius} კმ-ში`] : [])].slice(0, 3);
      setSpinError(null);
      setSheetOpen(false);
      setSpun({ wheel: r.wheel, winner: r.winnerIndex, landed: false, why, ctx: c });
      setRotation((cur) => targetRotation(cur, r.winnerIndex, r.wheel.length));
    } catch (e) {
      if (!(e instanceof SpinError)) throw e;
      setSpinError(`ფილტრებს მხოლოდ ${e.matching} კერძი ერგება. შეარბილე ბიუჯეტი, დიეტა ან გაზარდე რადიუსი.`);
    }
  }

  function onLanded() {
    setSpun((s) => (s ? { ...s, landed: true } : s));
    if (spun) setHistory((h) => [...h, { slug: spun.wheel[spun.winner].slug, at: Date.now() }].slice(-HISTORY_MAX));
    window.setTimeout(() => setModalOpen(true), 350); // let the eye see the pointer settle first
  }

  function pickPlace() {
    setModalOpen(false);
    if (window.matchMedia("(min-width: 1024px)").matches) heroRef.current?.scrollIntoView({ behavior: "smooth" });
    else setSheetOpen(true);
  }

  function notTodayWinner() {
    if (!spun) return;
    const slug = spun.wheel[spun.winner].slug;
    setModalOpen(false);
    setNotToday({ ...notToday, [slug]: Date.now() + DAY_MS });
    heroRef.current?.scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => doSpin(false, [slug]), 400);
  }

  function neverWinner() {
    if (!spun) return;
    const slug = spun.wheel[spun.winner].slug;
    setModalOpen(false);
    setNever((n) => (n.includes(slug) ? n : [...n, slug]));
    heroRef.current?.scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => doSpin(false, [slug]), 400);
  }

  function pickMood(m: Mood) {
    setMood((cur) => (cur === m ? null : m));
    changed();
  }

  function spinAgain() {
    setModalOpen(false);
    heroRef.current?.scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => doSpin(false), 300);
  }

  // Spin once the quiz's filters have been rendered (the latest doSpin sees them).
  useEffect(() => { doSpinRef.current = doSpin; });
  useEffect(() => {
    if (!pendingSpin) return;
    const t = window.setTimeout(() => doSpinRef.current(false), 450);
    return () => window.clearTimeout(t);
  }, [pendingSpin]);

  function applyPersona(answers: string[]) {
    const a = applyQuiz(scoreQuiz(answers));
    setFilters({ ...a.filters, diet: [...a.filters.diet] });
    setQuizAnswers(answers);
    changed();
    setQuizOpen(false);
    heroRef.current?.scrollIntoView({ behavior: "smooth" });
    setPendingSpin((n) => n + 1);
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
    return `${matching} კერძი ერგება · ${where}${persona ? ` · ${persona.name}` : ""}`;
  })();

  const panel = (onClose?: () => void) => (
    <FilterPanel
      filters={filters} place={place} radius={radius} locating={locating} locateError={locateError}
      onFilters={onFilters} onPlace={onPlace} onRadius={onRadius} onLocate={locate}
      onApply={() => doSpin(false)} onRandom={() => doSpin(true)} onClose={onClose}
      personaName={persona?.name ?? null} onQuiz={() => { setSheetOpen(false); setQuizOpen(true); }}
    />
  );

  return (
    <>
      <section className="hero" id="wheel" ref={heroRef}>
        <div className="hero__inner container">
          <div className="hero__stage">
            <h1 className="sr-only">რა ვჭამოთ დღეს?</h1>
            {wheel.length > 0
              ? <Wheel dishes={wheel} rotation={rotation} spinning={spinning} winnerIndex={winner} onSpin={() => doSpin(false)} onLanded={onLanded} />
              : <div className="wheel wheel--empty"><p>ფილტრებს მხოლოდ {matching} კერძი ერგება.<br />შეარბილე ბიუჯეტი, დიეტა ან გაზარდე რადიუსი.</p></div>}
            <div className="moods" role="group" aria-label="განწყობა">
              {MOODS.map((m) => (
                <button key={m.id} className={mood === m.id ? "mood on" : "mood"} aria-pressed={mood === m.id} onClick={() => pickMood(m.id)}>{m.label}</button>
              ))}
            </div>
            <p className="hero__status" aria-live="polite">{status}</p>
            {(Object.keys(notToday).length > 0 || never.length > 0) && (
              <div className="hidden-today">
                {Object.keys(notToday).length > 0 && <span>დღეს დამალული:</span>}
                {Object.keys(notToday).map((slug) => (
                  <button key={slug} className="chip chip--sm" onClick={() => { const { [slug]: _gone, ...rest } = notToday; void _gone; setNotToday(rest); changed(); }} aria-label={`დააბრუნე ${nameOf(slug)}`}>
                    {nameOf(slug)} ×
                  </button>
                ))}
                {never.length > 0 && <span>არ მიყვარს:</span>}
                {never.map((slug) => (
                  <button key={slug} className="chip chip--sm chip--never" onClick={() => { setNever((n) => n.filter((x) => x !== slug)); changed(); }} aria-label={`დააბრუნე ${nameOf(slug)}`}>
                    {nameOf(slug)} ×
                  </button>
                ))}
              </div>
            )}
            {spinError && <p className="hero__error" role="alert">{spinError}</p>}
            {dish && (
              <button className="hero__winner" onClick={() => setModalOpen(true)}>
                ბორბალმა აირჩია: <strong>{dish.name}</strong> · ნახე
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

      {modalOpen && dish && (
        <ResultModal
          dish={dish} place={place} radius={radius}
          why={spun?.why ?? []}
          pickVersions={(n) => (spun ? pickVariants(dish, spun.ctx, Math.random, n) : [])}
          onClose={() => setModalOpen(false)} onAgain={spinAgain} onNotToday={notTodayWinner} onNever={neverWinner} onPickPlace={pickPlace}
        />
      )}

      {quizOpen && <Quiz onClose={() => setQuizOpen(false)} onApply={applyPersona} />}

      <PersonaTeaser persona={persona} onStart={() => setQuizOpen(true)} />
      <TrustCard />

      <div ref={pathsRef} className="paths-anchor">
        <Paths
          dish={dish} place={place} radius={radius}
          onPickPlace={pickPlace}
        />
        {dish && (
          <div className="container again">
            <button className="pill pill--dark" onClick={spinAgain}>კიდევ დაატრიალე</button>
            <button className="pill pill--outline" onClick={notTodayWinner}>„{dish.name}“ დღეს არა</button>
          </div>
        )}
      </div>
    </>
  );
}
