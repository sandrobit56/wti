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

import Image from "next/image";
import { useEffect, useState } from "react";
import { priceBand, type Dish } from "@/lib/catalog.ts";
import type { Persona } from "@/lib/personas.ts";
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
    <section className="paths" id="paths" aria-labelledby="paths-title">
      <div className="container">
        <h2 id="paths-title" className="section-title reveal">ნახე, <span className="hl hl--green">მიდი</span> ან <span className="hl hl--orange">გამოიძახე</span></h2>
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
        ) : (
          <p className="paths__lead">დაატრიალე ბორბალი — აქ გამოჩნდება, სად ჭამო ახლოს ან საიდან შეუკვეთო.</p>
        )}

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
            <a className={dish ? "pill pill--dark pill--block" : "pill pill--dark pill--block is-disabled"} href={dish ? mapsSearchUrl(term, nearArea) : undefined} target="_blank" rel="noreferrer" aria-disabled={!dish}>
              ყველა Google Maps-ზე
            </a>
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

export function PersonaTeaser({ persona, onStart }: { persona: Persona | null; onStart: () => void }) {
  return (
    <section className="container" id="persona">
      <div className="persona reveal-pop">
        <div className="persona__copy">
          <Image className="only-mobile" src={`/icons/${persona?.icon ?? "mascot"}.svg`} alt="" width={64} height={66} />
          {persona ? (
            <>
              <p className="caps">შენი პერსონა</p>
              <h2>{persona.name}</h2>
              <p>{persona.line} ბორბალი შენს გემოზეა აწყობილი — მისი კერძები უფრო ხშირად ამოდის.</p>
              <div className="row">
                <button className="pill pill--dark" onClick={onStart}>ტესტი თავიდან</button>
                <a className="pill pill--white" href="#wheel">დაატრიალე</a>
              </div>
            </>
          ) : (
            <>
              <h2>გაიგე შენი პერსონა</h2>
              <p>7 კითხვა, ერთი წუთი. პასუხების მიხედვით ბორბალი თავად დააყენებს ფილტრებს — ბიუჯეტს, გემოს, დიეტას. რეგისტრაცია არ სჭირდება.</p>
              <div className="row">
                <button className="pill pill--dark" onClick={onStart}>ტესტის დაწყება</button>
                <a className="pill pill--white only-desktop" href="#persona-list" onClick={(e) => { e.preventDefault(); onStart(); }}>12 პერსონა</a>
              </div>
            </>
          )}
        </div>
        <div className="persona__art only-desktop" aria-hidden="true">
          <div className="qcard">
            <p className="caps">კითხვა 4 / 7</p>
            <p className="qcard__q">აჯიკა მაგიდაზეა. შენ?</p>
            <span className="qcard__a">ცოტას, გემოსთვის</span>
            <span className="qcard__a qcard__a--on">ყველაფერს ვუსვამ</span>
          </div>
          <div className="pcard">
            <Image src={`/icons/${persona?.icon ?? "mascot"}.svg`} alt="" width={56} height={58} />
            <p className="caps">შენი პერსონა</p>
            <p className="pcard__name">{persona?.name ?? "ცხარის მონადირე"}</p>
            <div className="row"><span className="mini">₾₾</span><span className="mini mini--dark">ცხარე</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TrustCard() {
  return (
    <section className="container" id="trust">
      <div className="trust reveal">
        <div>
          <h2>„ჩანგალი“ შეფასება, რომელსაც ვერ იყიდი</h2>
          <p>ანონიმური ვიზიტები, ვიხდით ჩვენ, მინიმუმ 2 ინსპექტორი, ხელახლა ყოველ 6 თვეში. პირველი შეფასებები მალე.</p>
        </div>
        <Image src="/icons/rosette.svg" alt="" width={64} height={64} />
      </div>
    </section>
  );
}
