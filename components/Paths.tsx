/**
 * File:        components/Paths.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-17
 * Version:     v3.0 — card art, "მალე" sticker, scroll-reveal hooks (CSS only);
 *              (was v1.0 — Figma "ნახე, გამოიძახე ან მიდი": three cards)
 * Description: The three paths for the dish the wheel picked:
 *   წაიკითხე (yellow) — verified blogs (none yet: honest empty state)
 *   მიდი     (green)  — our Overture venues in the radius + Google Maps search
 *   გამოიძახე (orange) — Wolt / Glovo / Bolt Food pages
 *   Mobile shows the three as tiles (Figma L2) and one card at a time.
 */
"use client";

import { Words } from "./Words";
import Image from "next/image";
import { useEffect, useState } from "react";
import { priceBand, type Dish } from "@/lib/catalog.ts";
import type { Persona } from "@/lib/personas.ts";
import { PERSONA_IDS, type PersonaId } from "@/lib/quiz.ts";
import { TarotCard } from "./TarotCard";
import { deliveryLinks, mapsDirectionsUrl, mapsSearchUrl, type RadiusKm, type VenueMatch } from "@/lib/places.ts";
import { MY_LOCATION, type Place } from "./FilterPanel";

export type VenueState =
  | { kind: "no-place" }
  | { kind: "loading" }
  | { kind: "ready"; venues: VenueMatch[] }
  | { kind: "error"; message: string };

type Tab = "read" | "go" | "order";

type Props = { dish: Dish | null; place: Place | null; radius: RadiusKm; onPickPlace: () => void };


/** Nearby venues for a dish (≤6). Network subscription: setState only in callbacks. */
export function useNearbyVenues(dish: Dish | null, place: Place | null, radius: RadiusKm): VenueState {
  const key = dish && place ? `${dish.slug}|${place.center.lat}|${place.center.lng}|${radius}` : null;
  const [fetched, setFetched] = useState<{ key: string; state: VenueState } | null>(null);
  useEffect(() => {
    if (!key || !dish || !place) return;
    const ctrl = new AbortController();
    const q = new URLSearchParams({ dish: dish.slug, lat: String(place.center.lat), lng: String(place.center.lng), r: String(radius) });
    fetch(`/api/venues?${q}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.json()).error}`);
        return res.json();
      })
      .then((j) => setFetched({ key, state: { kind: "ready", venues: j.venues } }))
      .catch((e: Error) => { if (e.name !== "AbortError") setFetched({ key, state: { kind: "error", message: e.message } }); });
    return () => ctrl.abort();
  }, [key, dish, place, radius]);
  return !place ? { kind: "no-place" } : fetched?.key === key ? fetched.state : { kind: "loading" };
}

export const km = (d: number) => (d < 1 ? `${Math.round(d * 1000)} მ` : `${d.toFixed(1)} კმ`);

export function Paths({ dish, place, radius, onPickPlace }: Props) {
  const [tab, setTab] = useState<Tab>("go");
  const venues = useNearbyVenues(dish, place, radius);
  const area = place && place.label !== MY_LOCATION ? place.label : "თბილისი";
  const nearArea = place && place.label !== MY_LOCATION ? place.label : null;
  const term = dish?.search ?? "";
  const delivery = deliveryLinks(place?.wolt ?? null);

  return (
    <section className="paths sect" id="paths" aria-labelledby="paths-title">
      <div className="container">
        <h2 id="paths-title" className="section-title paths__title display">
          <Image className="paths__peek paths__peek--a" src="/illustrations/creatures/khinkali.webp" alt="" width={72} height={72} aria-hidden="true" />
          <Words caps parts={["სად ", ["შეჭამ?", "accent"]]} />
          <Image className="paths__peek paths__peek--b" src="/illustrations/creatures/sushi.webp" alt="" width={64} height={64} aria-hidden="true" />
          <Image className="paths__peek paths__peek--c" src="/illustrations/creatures/pizza.webp" alt="" width={56} height={56} aria-hidden="true" />
        </h2>
        {dish ? (
          <div className="pick">
            <Image src={`/icons/${dish.icon}.svg`} alt="" width={56} height={56} />
            <div>
              <p className="caps">ბორბალმა აირჩია</p>
              <p className="pick__name">{dish.name}</p>
            </div>
            <p className="pick__meta">
              <strong>≈ {dish.priceGel[0]}–{dish.priceGel[1]} ₾</strong> · {"₾".repeat(priceBand(dish))} · {dish.cuisine}
              {dish.spicy ? " · ცხარე" : ""}{dish.vegan ? " · ვეგანური" : dish.vegetarian ? " · ვეგეტარიანული" : ""}
            </p>
          </div>
        ) : null}

        <div className="tiles only-mobile" role="tablist" aria-label="გზები">
          {([["read", "წაიკითხე", "ბლოგი", "book", "tile--yellow"], ["go", "მიდი", "ადგილები", "pin", "tile--green"], ["order", "გამოიძახე", "მიტანა", "scooter", "tile--orange"]] as const).map(([id, t, s, icon, cls]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={`tile ${cls}${tab === id ? " on" : ""}`} onClick={() => setTab(id)}>
              <span className="tile__icon"><Image src={`/icons/${icon}.svg`} alt="" width={40} height={40} /></span>
              <strong>{t}</strong><span>{s}</span>
            </button>
          ))}
        </div>

        <div className="cards stagger">
          <article className={`card card--yellow${tab === "read" ? " on" : ""}`}>
            <Image className="card__art" src="/icons/book.svg" alt="" width={120} height={120} aria-hidden="true" />
            <header className="card__head">
              <Image src="/icons/book.svg" alt="" width={44} height={44} />
              <div><h3>წაიკითხე</h3><p>ვერიფიცირებული გამოცდილება</p></div>
            </header>
            <div className="card__body">
              <div className="row-card row-card--empty">
                <strong>ბლოგები ჯერ არ გამოქვეყნებულა</strong>
                <span>პირველ ავტორებს ახლა ვამოწმებთ: საკუთარი ხარჯით, ჩეკით.</span>
              </div>
            </div>
            <span className="soon">✦ ბლოგები მალე ✦</span>
          </article>

          <article className={`card card--green${tab === "go" ? " on" : ""}`}>
            <Image className="card__art" src="/icons/pin.svg" alt="" width={120} height={120} aria-hidden="true" />
            <header className="card__head">
              <Image src="/icons/pin.svg" alt="" width={44} height={44} />
              <div><h3>მიდი</h3><p>{place ? `${area} · ${radius} კმ` : "ადგილები ახლოს"}</p></div>
            </header>
            <div className="card__body">
              {!dish && <div className="row-card row-card--empty"><span>ჯერ დაატრიალე ბორბალი.</span></div>}
              {dish && venues.kind === "no-place" && (
                <div className="row-card row-card--empty">
                  <span>აირჩიე უბანი ან ჩართე ლოკაცია, რომ ახლომახლო ადგილები გაჩვენო.</span>
                  <button className="link" onClick={onPickPlace}>უბნის არჩევა →</button>
                </div>
              )}
              {dish && venues.kind === "loading" && <div className="row-card row-card--empty"><span>ვეძებ…</span></div>}
              {dish && venues.kind === "error" && <div className="row-card row-card--empty"><span>ვერ ჩაიტვირთა: {venues.message}</span></div>}
              {dish && venues.kind === "ready" && venues.venues.length === 0 && (
                <div className="row-card row-card--empty"><span>ამ რადიუსში ვერ ვიპოვე. გაზარდე რადიუსი ან მოძებნე Google Maps-ზე.</span></div>
              )}
              {dish && venues.kind === "ready" && venues.venues.slice(0, 4).map((v) => (
                <a key={v.id} className="row-card" href={mapsDirectionsUrl(v)} target="_blank" rel="noreferrer">
                  <span className="row-card__main">
                    <strong>{v.name}</strong>
                    <span className={v.byName ? "tag tag--green" : "tag"}>{v.byName ? `სახელში: ${dish.name.split(" ")[0]}` : "სავარაუდოდ"}</span>
                  </span>
                  <span className="row-card__side">{km(v.distanceKm)}</span>
                </a>
              ))}
            </div>
            {dish ? (
              <a className="pill pill--dark pill--block" href={mapsSearchUrl(term, nearArea)} target="_blank" rel="noreferrer">
              ყველა Google Maps-ზე
            </a>
            ) : (
              <span className="pill pill--dark pill--block is-disabled" aria-disabled="true">
              ყველა Google Maps-ზე
            </span>
            )}
          </article>

          <article className={`card card--orange${tab === "order" ? " on" : ""}`}>
            <Image className="card__art" src="/icons/scooter.svg" alt="" width={120} height={120} aria-hidden="true" />
            <header className="card__head">
              <Image src="/icons/scooter.svg" alt="" width={44} height={44} />
              <div><h3>გამოიძახე</h3><p>მიტანა 30–50 წუთში</p></div>
            </header>
            <div className="card__body">
              {delivery.map((d) => (
                <a key={d.id} className="row-card" href={d.url} target="_blank" rel="noreferrer">
                  <span className="row-card__main">
                    <strong>{d.name}</strong>
                    <span className="row-card__hint"><i style={{ background: d.dot }} />{dish ? `აპში მოძებნე: „${term}“` : "თბილისის რესტორნები"}</span>
                  </span>
                  <span className="row-card__side" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
            <a className="pill pill--dark pill--block" href={delivery[0].url} target="_blank" rel="noreferrer">შეკვეთა Wolt-ზე</a>
          </article>
        </div>
      </div>
    </section>
  );
}

/** Three cards fanned out: the user's persona in the middle, or three crowd favourites. */
function fanOf(persona: Persona | null): PersonaId[] {
  if (!persona) return ["spice", "tamada", "khinkali"];
  const i = PERSONA_IDS.indexOf(persona.id);
  return [PERSONA_IDS[(i + 11) % 12], persona.id, PERSONA_IDS[(i + 1) % 12]];
}

export function PersonaTeaser({ persona, onStart, onGallery }: { persona: Persona | null; onStart: () => void; onGallery: () => void }) {
  const fan = fanOf(persona);
  return (
    <section className="container sect" id="persona">
      <div className="persona reveal-pop">
        <div className="persona__copy">
          {persona ? (
            <>
              <p className="caps">შენი პერსონა</p>
              <h2>{persona.name}</h2>
              <p>{persona.line}</p>
              <div className="row persona__actions">
                <button className="pill pill--dark" onClick={onStart}>ტესტი თავიდან</button>
                <button className="pill pill--white" onClick={onGallery}>12 პერსონა</button>
              </div>
            </>
          ) : (
            <>
              <h2 className="display"><Words caps parts={["გაიგე შენი ", ["პერსონა", "accent"]]} /></h2>
              <p><Words parts={["7 კითხვა, ერთი წუთი — ბორბალი შენს გემოზე მოირგება."]} /></p>
              <div className="row persona__actions">
                <button className="pill pill--dark" onClick={onStart}>ტესტის დაწყება</button>
                <button className="pill pill--white" onClick={onGallery}>12 პერსონა</button>
              </div>
            </>
          )}
        </div>
        <button type="button" className="persona__fan" onClick={onGallery} aria-label="12 პერსონის ბარათი">
          {fan.map((id, i) => (
            <span key={id} className="persona__fan-card" style={{ ["--i" as string]: i - 1 }}>
              <TarotCard id={id} size="md" tilt={false} me={persona?.id === id} />
            </span>
          ))}
        </button>
      </div>
    </section>
  );
}

