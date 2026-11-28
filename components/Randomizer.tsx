/**
 * File:        components/Randomizer.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     courier in the coral sun (hand did not fit section 2, Sandro); v3.7 Figma shader fills; v3.6 Figma v8 layout (Sandro 2026-11-26); v3.5 — hero calmed down (no chili, one centred column);
 *              v3.4 — clouds over the first seam, floating food cut-outs;
 *              v3.3 — collage bridges between chapters (was torn seams), hero doodles removed;
 *              v3.2 — flick-to-spin: a fast drag on the plate spins it (strength → turns and
 *              duration, direction follows the flick); v3.1 — mood chips, past winners, "never" list
 * Description: Page state: filters, place, radius → available dishes → wheel →
 *              spin → three paths. Logic lives in lib/spin.ts.
 *              Client-only (RandomizerClient) so initial state can read storage.
 *              Storage: localStorage "wti:v2" (filters, neighbourhood, radius, "not today").
 *              GPS is coarsened to ~110 m and never stored (lib/security.ts).
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DISHES, type Dish } from "@/lib/catalog.ts";
import type { RadiusKm } from "@/lib/places.ts";
import { PERSONAS } from "@/lib/personas.ts";
import { applyQuiz, scoreQuiz } from "@/lib/quiz.ts";
import { NO_PREFS, normalizeFilters, SpinError, displayName, explain, pickVariants, seeded, spin, targetRotation, type Filters, type Mood, type Prefs, type SpinContext, type Win } from "@/lib/spin.ts";
import { FilterPanel, MY_LOCATION, type Place } from "./FilterPanel";
import { coarse } from "@/lib/security.ts";
import { Paths } from "./Paths";
import { PersonaSection } from "./PersonaSection";
import { Quiz } from "./Quiz";
import { PersonaGallery } from "./PersonaGallery";
import { SupraFlyer } from "./SupraFlyer";
import { FilterTokens } from "./FilterTokens";
import { Sheet } from "./Sheet";
import Image from "next/image";
import { HeroTitle } from "./HeroTitle";
import { JoinCritics } from "./JoinCritics";
import { TABLE_MAX, addGuest } from "@/lib/table.ts";
import { TablePanel } from "./TablePanel";
const TABLE_KEY = "wti.table.names";
import { ResultModal } from "./ResultModal";
import { Wheel } from "./Wheel";

const KEY = "wti:v2";
const DAY_MS = 24 * 60 * 60 * 1000;

/** How a spin moves: the hub button uses the default; a flick sets its own. offset = drag already applied. */
type SpinHow = { turns: number; ms: number; dir: 1 | -1; offset: number };
const DEFAULT_SPIN: SpinHow = { turns: 7, ms: 2300, dir: 1, offset: 0 };

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
  // Privacy: a GPS position is never written to disk — only chosen neighbourhoods are remembered.
  const safe = s.place?.label === MY_LOCATION ? { ...s, place: null } : s;
  try { localStorage.setItem(KEY, JSON.stringify(safe)); } catch { /* storage unavailable: app still works */ }
}
function initial(): Stored & { now: Date; seed: number } {
  const s = load();
  const now = Date.now();
  const notToday = Object.fromEntries(Object.entries(s?.notToday ?? {}).filter(([, until]) => until > now));
  return { filters: normalizeFilters(s?.filters), place: s?.place ?? null, radius: s?.radius ?? 2, notToday, quizAnswers: s?.quizAnswers ?? null, never: s?.never ?? [], history: s?.history ?? [], now: new Date(), seed: Math.floor(Math.random() * 1e9) };
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
  const [spinMs, setSpinMs] = useState(DEFAULT_SPIN.ms);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<string[] | null>(init.quizAnswers ?? null);
  const prefs = useMemo(() => prefsFrom(quizAnswers), [quizAnswers]);
  const persona = prefs.persona ? PERSONAS[prefs.persona] : null;
  const [pendingSpin, setPendingSpin] = useState(0);
  const [never, setNever] = useState<string[]>(init.never ?? []);
  const [history, setHistory] = useState<Win[]>(init.history ?? []);
  const [mood, setMood] = useState<Mood | null>(null);
  // group mode: the people at the table (left panel). 1 name = just you. Kept in this browser only.
  const [names, setNamesState] = useState<string[]>(["შენ"]);
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(TABLE_KEY) ?? "null"); if (Array.isArray(v) && v.length && v.length <= TABLE_MAX && v.every((x) => typeof x === "string")) setNamesState(v); } catch { /* storage blocked */ }
  }, []);
  const setNames = (next: string[]) => {
    // going solo ↔ group changes which dishes may land, so an old result no longer fits
    if ((next.length > 1) !== (names.length > 1)) setSpun((x) => (x?.landed ? null : x));
    setNamesState(next);
    try { localStorage.setItem(TABLE_KEY, JSON.stringify(next)); } catch { /* storage blocked: names just aren't kept */ }
  };
  const diners = names.length;
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

  const ctx = (random: boolean): SpinContext => ({ filters, now: new Date(), excluded, random, available, prefs, mood, history, group: diners });

  // Live preview: recomputed on every filter / place / radius change.
  const preview = useMemo(() => {
    try {
      return { result: spin(DISHES, { filters, now: init.now, excluded, random: false, available, prefs, mood, history, group: diners }, seeded(seed)), error: null };
    } catch (e) {
      if (!(e instanceof SpinError)) throw e;
      return { result: null, error: e.matching };
    }
  }, [filters, excluded, available, seed, init.now, prefs, mood, history, diners]);

  // Any input change drops the last result and reshuffles the preview.
  /** The ribbon game hands over the last dish the mascot ate — open it like a wheel result. */
  function openDish(slug: string) {
    const d = DISHES.find((x) => x.slug === slug);
    if (!d) throw new Error(`openDish: unknown dish ${slug}`);
    // keep a full wheel (a 1-slice wheel draws as a broken disc): the dish first, the preview after it
    const rest = (preview.result?.wheel ?? DISHES).filter((x) => x.slug !== slug).slice(0, 7);
    const w = [d, ...rest];
    setSpun({ wheel: w, winner: 0, landed: true, why: [], ctx: ctx(false) });
    setRotation((cur) => targetRotation(cur, 0, w.length, 1, 1));
    setModalOpen(true);
  }

  function changed() { setSpun(null); setSpinError(null); setSeed((s) => s + 1); }
  const onFilters = (f: Filters) => { setFilters(f); changed(); };
  const onPlace = (p: Place | null) => { setPlace(p); setLocateError(null); changed(); };
  const onRadius = (r: RadiusKm) => { setRadius(r); changed(); };

  /** A flick → spin strength. Faster flick = more turns and a longer glide, capped so it never drags on. */
  function onFling(velocity: number, offset: number) {
    const strength = Math.min(1, Math.abs(velocity) / 2.2);            // 0.35…2.2 deg/ms → ~0.16…1
    const turns = Math.round(4 + strength * 5);                         // 4…9 turns
    const ms = Math.round(1700 + strength * 1500);                      // 1.7…3.2 s
    doSpin(false, [], { turns, ms, dir: velocity < 0 ? -1 : 1, offset });
  }

  function doSpin(random: boolean, extraExcluded: string[] = [], how: SpinHow = DEFAULT_SPIN) {
    if (spun && !spun.landed) return;
    try {
      const c = { ...ctx(random), excluded: [...excluded, ...extraExcluded] };
      const r = spin(DISHES, c, Math.random);
      // group mode: ONE spin, ONE dish for the whole table (they eat together)
      const dishWon = r.wheel[r.winnerIndex];
      const near = current && "counts" in current ? current.counts[dishWon.slug] : undefined;
      const why = [...explain(dishWon, c, persona?.name ?? null), ...(near ? [`${near} ადგილი ${radius} კმ-ში`] : [])].slice(0, 3);
      setSpinError(null);
      setSheetOpen(false);
      // the plate turns `aim` to the top; "your" dish is the one in front of diner 0
      const aim = r.winnerIndex;
      setSpun({ wheel: r.wheel, winner: aim, landed: false, why, ctx: c });
      setSpinMs(how.ms);
      setRotation((cur) => targetRotation(cur + how.offset, aim, r.wheel.length, how.turns, how.dir));
    } catch (e) {
      if (!(e instanceof SpinError)) throw e;
      setSpinError(`ფილტრებს მხოლოდ ${e.matching} კერძი ერგება. შეარბილე ბიუჯეტი, დიეტა ან გაზარდე რადიუსი.`);
    }
  }

  function onLanded() {
    if (!spun || spun.landed) return; // the fallback timer and transitionend may both call this
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
    setFilters(normalizeFilters({ ...a.filters, diet: [...a.filters.diet] }));
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
      (pos) => { setLocating(false); onPlace({ label: MY_LOCATION, center: coarse({ lat: pos.coords.latitude, lng: pos.coords.longitude }), wolt: null }); },
      (err) => {
        setLocating(false);
        setLocateError(err.code === err.PERMISSION_DENIED
          ? "ლოკაციაზე წვდომა დაბლოკილია. ჩართე ბრაუზერის პარამეტრებში ან აირჩიე უბანი."
          : "ლოკაცია ვერ მივიღე. სცადე თავიდან ან აირჩიე უბანი.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  // Honest labels: under a diet/taste filter a slice shows the fitting version's name.
  const labelCtx: SpinContext = spun?.ctx ?? { filters, now: init.now, excluded, random: false, available, prefs, mood, history };
  const wheel = (spun?.wheel ?? preview.result?.wheel ?? []).map((d) => {
    const name = displayName(d, labelCtx);
    return name === d.name ? d : { ...d, name, search: name }; // search Google/Maps/Wolt for the version, too
  });
  const winner = spun?.landed ? spun.winner : null;

  const dish = spun?.landed ? wheel[spun.winner] : null;
  const spinning = Boolean(spun && !spun.landed);
  const matching = preview.result?.matching ?? preview.error ?? 0;

  const status = (() => {
    if (current && "error" in current) return `ადგილები ვერ ჩაიტვირთა (${current.error}) — ბორბალი მთელ თბილისს იყენებს.`;
    if (loadingCounts) return "ვამოწმებ, რა არის ახლოს…";
    const where = place ? `${place.label}, ${radius} კმ${current && "venuesInRadius" in current ? ` · ${current.venuesInRadius} ადგილი` : ""}` : "მთელი თბილისი";
    return `${matching} კერძი ერგება · ${where}${persona ? ` · ${persona.name}` : ""}`;
  })();

  const panel = () => (
    <FilterPanel
      filters={filters} place={place} radius={radius} locating={locating} locateError={locateError}
      onFilters={onFilters} onPlace={onPlace} onRadius={onRadius} onLocate={locate}
      onApply={() => doSpin(false)} onRandom={() => doSpin(true)} inSheet
      personaName={persona?.name ?? null} onQuiz={() => { setSheetOpen(false); setQuizOpen(true); }}
    />
  );

  const addDiner = () => { if (names.length < TABLE_MAX) setNames(addGuest(names)); };

  return (
    <>
      <section className="hero" id="wheel" ref={heroRef}>
        {/* Figma 191:615: white paper with a halftone dot grid, pink clouds at the bottom, Hermes flying in */}
        <div className="hero9__clouds" aria-hidden="true"><Image src="/collage/clouds-soft.webp" alt="" width={1600} height={406} sizes="100vw" /></div>
        <Image className="hero9__hermes" src="/collage/hermes.webp" alt="" aria-hidden="true" width={888} height={1519} priority sizes="(max-width: 760px) 40vw, 391px" />
        <div className="hero__inner container">
          <HeroTitle winner={spun?.landed ? dish?.name ?? null : null} onOpen={() => pathsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
          <div className="hero__stage hero9__stage">
            {wheel.length > 0
              ? <Wheel
                  dishes={wheel} rotation={rotation} spinning={spinning} spinMs={spinMs} winnerIndex={winner} landedOnce={Boolean(spun?.landed)}
                  onSpin={(o) => doSpin(false, [], { ...DEFAULT_SPIN, offset: o })} onFling={onFling} onLanded={onLanded}
                  diners={1} seatDishes={null} onSeat={() => {}} onAddDiner={addDiner} onRemoveDiner={() => {}}
                />
              : <div className="wheel wheel--empty"><p>ფილტრებს მხოლოდ {matching} კერძი ერგება.<br />შეარბილე ბიუჯეტი, დიეტა ან გაზარდე რადიუსი.</p></div>}
            {/* Figma: "+ 1/5" sits at the wheel's lower right */}
            <button type="button" className="add-guest" onClick={addDiner} disabled={diners >= TABLE_MAX} aria-label={`დაამატე სტუმარი (${diners} / ${TABLE_MAX})`}>+ <span>{diners}/{TABLE_MAX}</span></button>
          </div>
          {/* group mode lives in its own column left of the wheel */}
          <TablePanel names={names} onChange={setNames} disabled={spinning} />
          <div className="hero__controls">
            <FilterTokens filters={filters} place={place?.label ?? null} radius={radius} onOpen={() => setSheetOpen(true)} />
            <p className="hero__status" aria-live="polite">{status}</p>
            {spinError && <p className="hero__error" role="alert">{spinError}</p>}
          </div>
        </div>
      </section>

      {sheetOpen && (
        <Sheet
          className="filters-sheet"
          labelledBy="filters-title"
          onClose={() => setSheetOpen(false)}
          footer={
            <div className="modal__actions">
              <button className="pill pill--dark" onClick={() => doSpin(false)}>დაატრიალე</button>
              <button className="pill pill--outline" onClick={() => doSpin(true)}>შემთხვევით</button>
            </div>
          }
        >
          {panel()}
          <div className="moods-block">
            <h3 className="panel__title">განწყობა</h3>
            <div className="moods" role="group" aria-label="განწყობა">
              {MOODS.map((m) => (
                <button key={m.id} className={mood === m.id ? "mood on" : "mood"} aria-pressed={mood === m.id} onClick={() => pickMood(m.id)}>{m.label}</button>
              ))}
            </div>
          </div>
          {/* "not today" / "never" lists live here now — the hero stays: title, wheel, filters */}
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
        </Sheet>
      )}

      {modalOpen && dish && (
        <ResultModal
          dish={dish} place={place} radius={radius}
          why={spun?.why ?? []}
          pickVersions={(n) => (spun ? pickVariants(dish, spun.ctx, Math.random, n) : [])}
          onClose={() => setModalOpen(false)} onAgain={spinAgain} onNotToday={notTodayWinner} onNever={neverWinner} onPickPlace={pickPlace}
        />
      )}

      {quizOpen && <Quiz onClose={() => setQuizOpen(false)} onApply={applyPersona} onDish={(slug) => { setQuizOpen(false); openDish(slug); }} />}

      <div className="chapter chapter--cream chapter--plain chapter--blush9">
      <div ref={pathsRef} className="paths-anchor">
        <Paths
          dish={dish} place={place} radius={radius} onPickPlace={pickPlace}
          group={diners > 1 && dish ? { dishes: names, summary: `${diners} ადამიანი, ერთი სუფრა — ${dish.name}`, searchTerm: null } : null}
          onSpin={() => heroRef.current?.scrollIntoView({ behavior: "smooth" })}
        />
      </div>
      </div>
      <div className="chapter chapter--plain chapter--ink">
        <SupraFlyer onDish={openDish} />
      </div>
      <div className="chapter chapter--plain chapter--dots">
        <PersonaSection persona={persona} onStart={() => setQuizOpen(true)} onGallery={() => setGalleryOpen(true)} />
      {galleryOpen && <PersonaGallery current={prefs.persona} onClose={() => setGalleryOpen(false)} onStart={() => { setGalleryOpen(false); setQuizOpen(true); }} onDish={(slug) => { setGalleryOpen(false); openDish(slug); }} />}
      </div>
      <div className="chapter chapter--plain chapter--paper">
        <JoinCritics />
      </div>
    </>
  );
}
