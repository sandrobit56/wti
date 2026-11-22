/**
 * File:        components/Randomizer.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v3.2 — flick-to-spin: a fast drag on the plate spins it (strength → turns and
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
import { NO_PREFS, normalizeFilters, SpinError, displayName, explain, pickVariants, seeded, spin, targetRotation, type Filters, type Mood, type Prefs, type SpinContext, type Win, isAllowed } from "@/lib/spin.ts";
import { FilterPanel, MY_LOCATION, type Place } from "./FilterPanel";
import { coarse } from "@/lib/security.ts";
import { Paths } from "./Paths";
import { PersonaSection } from "./PersonaSection";
import { Quiz } from "./Quiz";
import { PersonaGallery } from "./PersonaGallery";
import { SupraFlyer } from "./SupraFlyer";
import { FilterTokens } from "./FilterTokens";
import { Sheet } from "./Sheet";
import { HeroTitle } from "./HeroTitle";
import { WaveBand } from "./WaveBand";
import { JoinCritics } from "./JoinCritics";
import { mapsSearchUrl } from "@/lib/places.ts";
import { MAX_DINERS, fillSeats, seatAngles, seatsFor, sharedVenue, sliceAt, venueLabel } from "@/lib/seats.ts";
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
  const [diners, setDiners] = useState(1); // group mode: people around the table (1 = just you)
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
  /** The ribbon game hands over the last dish the mascot ate — open it like a wheel result. */
  function openDish(slug: string) {
    const d = DISHES.find((x) => x.slug === slug);
    if (!d) throw new Error(`openDish: unknown dish ${slug}`);
    setSpun({ wheel: [d], winner: 0, landed: true, why: [], ctx: ctx(false) });
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
      let r = spin(DISHES, c, Math.random);
      if (diners > 1) {
        // Group: everyone should eat at ONE place. Your random dish (diner 0) decides the venue
        // type — sushi → a sushi bar, khinkali → a Georgian place — so the type still varies;
        // diners whose slice doesn't fit get an allowed dish of that type instead.
        const seats = seatsFor(r.winnerIndex, r.wheel.length, Math.min(diners, r.wheel.length));
        const mineDish = r.wheel[seats[0]];
        const cat = [...mineDish.venue.cats].sort((x, y) =>
          seats.filter((i) => r.wheel[i].venue.cats.includes(y)).length - seats.filter((i) => r.wheel[i].venue.cats.includes(x)).length)[0];
        const pool = DISHES.filter((d) => isAllowed(d, c));
        if (cat) r = { ...r, wheel: fillSeats(r.wheel, seats, cat, pool, Math.random) };
        // too few dishes of that type (e.g. donuts)? fall back to the type the seated dishes share most
        const left = sharedVenue(seats.map((i) => r.wheel[i]));
        if (left.covered < seats.length) {
          const cats = [...new Set(seats.flatMap((i) => r.wheel[i].venue.cats))];
          const roomiest = cats.sort((x, y) => pool.filter((d) => d.venue.cats.includes(y)).length - pool.filter((d) => d.venue.cats.includes(x)).length)[0];
          if (roomiest) r = { ...r, wheel: fillSeats(r.wheel, seats, roomiest, pool, Math.random) };
        }
      }
      const dishWon = r.wheel[r.winnerIndex];
      const near = current && "counts" in current ? current.counts[dishWon.slug] : undefined;
      const why = [...explain(dishWon, c, persona?.name ?? null), ...(near ? [`${near} ადგილი ${radius} კმ-ში`] : [])].slice(0, 3);
      setSpinError(null);
      setSheetOpen(false);
      // the plate turns `aim` to the top; "your" dish is the one in front of diner 0
      const aim = r.winnerIndex;
      const mine = diners > 1 ? seatsFor(aim, r.wheel.length, Math.min(diners, r.wheel.length))[0] : aim;
      setSpun({ wheel: r.wheel, winner: mine, landed: false, why: mine === aim ? why : [], ctx: c });
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
    if (diners === 1) window.setTimeout(() => setModalOpen(true), 350); // let the eye see the pointer settle first
    // group mode: no popup — each diner's dish appears at their seat; tap a seat to open it
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
  // Group mode: never more seats than slices, so nobody shares a slice by accident.
  const seated = Math.min(diners, Math.max(1, wheel.length));
  const seatSlices = spun?.landed && seated > 1 ? seatAngles(seated).map((deg) => sliceAt(rotation, deg, wheel.length)) : null;
  const together = seatSlices ? sharedVenue(seatSlices.map((i) => wheel[i])) : null;
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

  return (
    <>
      <section className="hero" id="wheel" ref={heroRef}>
        <div className="hero__inner container">
          <HeroTitle winner={spun?.landed ? dish?.name ?? null : null} onOpen={() => pathsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
          <div className="hero__stage">
            {wheel.length > 0
              ? <Wheel
                  dishes={wheel} rotation={rotation} spinning={spinning} spinMs={spinMs} winnerIndex={winner} landedOnce={Boolean(spun?.landed)}
                  onSpin={(o) => doSpin(false, [], { ...DEFAULT_SPIN, offset: o })} onFling={onFling} onLanded={onLanded}
                  diners={seated} seatDishes={seatSlices ? seatSlices.map((i) => wheel[i].name) : null}
                  onSeat={(d) => { if (!seatSlices) return; const i = seatSlices[d]; setSpun((s) => (s ? { ...s, winner: i, why: d === 0 ? s.why : [] } : s)); setModalOpen(true); }}
                  onAddDiner={() => { setDiners((n) => Math.min(MAX_DINERS, n + 1)); setSpun((s) => (s?.landed ? null : s)); }}
                  onRemoveDiner={(d) => { void d; setDiners((n) => Math.max(1, n - 1)); setSpun((s) => (s?.landed ? null : s)); }}
                />
              : <div className="wheel wheel--empty"><p>ფილტრებს მხოლოდ {matching} კერძი ერგება.<br />შეარბილე ბიუჯეტი, დიეტა ან გაზარდე რადიუსი.</p></div>}
          </div>
          {together && seatSlices && (
            <p className="group-note" role="status">
              {together.covered === seatSlices.length ? "ყველა ერთად" : `${together.covered} / ${seatSlices.length} ერთად`} — <strong>{venueLabel(together.cat)}</strong>
              {together.cat && <a href={mapsSearchUrl(together.cat.replace(/_/g, " ") + " restaurant", place?.label ?? null)} target="_blank" rel="noopener noreferrer">იპოვე რუკაზე ↗</a>}
            </p>
          )}
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

      <div className="chapter chapter--cream">
      <WaveBand tone="wine" text="ბედმა აირჩია — ახლა შენი ჯერია" />
      <div ref={pathsRef} className="paths-anchor">
        <Paths
          dish={dish} place={place} radius={radius} onPickPlace={pickPlace}
          group={together && seatSlices ? {
            dishes: seatSlices.map((i) => wheel[i].name),
            summary: `${together.covered === seatSlices.length ? "ყველა ერთად" : `${together.covered} / ${seatSlices.length} ერთად`} — ${venueLabel(together.cat)}`,
            searchTerm: together.cat ? `${together.cat.replace(/_/g, " ")} restaurant` : null,
          } : null}
          onSpin={() => heroRef.current?.scrollIntoView({ behavior: "smooth" })}
          onAgain={spinAgain}
        />
      </div>
      </div>
      <div className="chapter chapter--wine">
        <WaveBand tone="mustard" curve="b" text="მშიერი კაცი ბორბალს არ ეკამათება" />
        <SupraFlyer onDish={openDish} />
      </div>
      <div className="chapter chapter--mustard">
        <WaveBand tone="brand" text="სუფრასთან ყველა ვიღაცაა" />
        <PersonaSection persona={persona} onStart={() => setQuizOpen(true)} onGallery={() => setGalleryOpen(true)} />
      {galleryOpen && <PersonaGallery current={prefs.persona} onClose={() => setGalleryOpen(false)} onStart={() => { setGalleryOpen(false); setQuizOpen(true); }} onDish={(slug) => { setGalleryOpen(false); openDish(slug); }} />}
      </div>
      <div className="chapter chapter--blush">
        <WaveBand tone="wine" curve="b" text="გემოზე არ დავობთ — ვაფასებთ" />
        <JoinCritics />
      </div>
    </>
  );
}
