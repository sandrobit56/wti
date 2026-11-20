/**
 * File:        components/ResultModal.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-16
 * Version:     v3.1 — actions pinned in the Sheet footer; 3 versions; hint lines removed;
 *              v3.0 — shared Sheet: bottom sheet with drag-to-close on mobile, card-draw on desktop;
 *              v2.1 — live Google map + on-tap Google Places nearby;
 *              v2.0 — 4–5 real versions of the dish (photo + credit, description,
 *              price, per-version Maps / delivery search); "სხვა ვერსიები" reshuffles
 * Description: Pops up the moment the wheel lands: the dish, where to taste it
 *              nearby, delivery apps, and the two next actions (spin again /
 *              not today). Closes with ×, Esc, or a click on the backdrop.
 *              Shell = components/Sheet.tsx (native dialog underneath).
 */
"use client";

import Image from "next/image";
import { useState } from "react";
import { priceBand, type Dish } from "@/lib/catalog.ts";
import type { Variant } from "@/lib/variants.ts";
import { typePhoto, variantPhoto, UNSPLASH_HOME, type Photo } from "@/lib/photos.ts";
import { deliveryLinks, mapsDirectionsUrl, mapsSearchUrl, type RadiusKm } from "@/lib/places.ts";
import { MY_LOCATION, type Place } from "./FilterPanel";
import { km, useNearbyVenues } from "./Paths";
import { GoogleNearby } from "./GoogleNearby";
import { Sheet } from "./Sheet";

type Props = {
  dish: Dish;
  place: Place | null;
  radius: RadiusKm;
  onClose: () => void;
  onAgain: () => void;
  onNotToday: () => void;
  onNever: () => void;
  onPickPlace: () => void;
  why: string[];
  pickVersions: (n: number) => Variant[];
};

const VERSIONS = 3; // fewer, so the popup reads at a glance (user testing)

/**
 * Photo credit.
 * - Wikimedia (CC BY / BY-SA): attribution must stay reachable → small ⓘ, opened on tap.
 * - Unsplash: the API guidelines require the photographer + Unsplash to be credited
 *   with links wherever the photo is shown → always-visible, tiny chip.
 */
function Credit({ p }: { p: Photo }) {
  const [open, setOpen] = useState(false);
  if (p.kind === "unsplash") {
    return (
      <span className="credit-chip">
        <a href={p.authorUrl} target="_blank" rel="noreferrer">{p.author}</a> / <a href={UNSPLASH_HOME} target="_blank" rel="noreferrer">Unsplash</a>
      </span>
    );
  }
  return (
    <span className="credit-wrap">
      <button type="button" className="credit-btn" aria-expanded={open} aria-label="ფოტოს ავტორი და ლიცენზია" onClick={() => setOpen((o) => !o)}>i</button>
      {open && (
        <a className="credit-pop" href={p.source} target="_blank" rel="noreferrer">
          ფოტო: {p.author} · {p.license} ↗
        </a>
      )}
    </span>
  );
}

export function ResultModal({ dish, place, radius, onClose, onAgain, onNotToday, onNever, onPickPlace, why, pickVersions }: Props) {
  const [versions, setVersions] = useState(() => pickVersions(VERSIONS));
  const hero = typePhoto(dish.slug);
  const venues = useNearbyVenues(dish, place, radius);
  const area = place && place.label !== MY_LOCATION ? place.label : "თბილისი";
  const nearArea = place && place.label !== MY_LOCATION ? place.label : null;
  const delivery = deliveryLinks(place?.wolt ?? null);

  return (
    <Sheet
      labelledBy="modal-title"
      onClose={onClose}
      footer={
        <div className="modal__actions">
          <button className="pill pill--dark" onClick={onAgain}>↻ ხელახლა</button>
          <button className="pill pill--outline" onClick={onNotToday}>დღეს არა</button>
          <button className="link modal__never" onClick={onNever}>„{dish.name}“ არ მიყვარს</button>
        </div>
      }
    >

        <header className={hero ? "modal__hero modal__hero--photo" : "modal__hero"}>
          {hero ? (
            <figure className="modal__photo">
              {/* plain <img>: Commons files are local 640px; Unsplash must be hotlinked (API guideline) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.src} alt={dish.name} loading="eager" />
              <figcaption><Credit p={hero} /></figcaption>
            </figure>
          ) : (
            <Image src={`/icons/${dish.icon}.svg`} alt="" width={88} height={88} />
          )}
          <p className="caps">დღეს ჭამ</p>
          <h2 id="modal-title" className="modal__name">{dish.name}</h2>
          <p className="modal__meta">
            ≈ {dish.priceGel[0]}–{dish.priceGel[1]} ₾ · {"₾".repeat(priceBand(dish))} · {dish.cuisine}
            {dish.spicy ? " · ცხარე" : ""}{dish.vegan ? " · ვეგანური" : dish.vegetarian ? " · ვეგეტარიანული" : ""}
          </p>
          {why.length > 0 && (
            <ul className="why" aria-label="რატომ ეს კერძი">
              {why.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
        </header>

        <section className="modal__section">
          <h3>
            <span className="dot dot--pink" />ვერსიები
            {versions.length > 1 && (
              <button className="link modal__reshuffle" onClick={() => setVersions(pickVersions(VERSIONS))}>სხვა ვერსიები ↻</button>
            )}
          </h3>
          {versions.length === 0 && <p className="modal__hint">შენს ფილტრებს ვერსია არ ერგება.</p>}
          <ul className="versions">
            {versions.map((v) => {
              const p = variantPhoto(v);
              return (
                <li key={v.slug} className="version">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p ? <img className="version__img" src={p.src} alt="" loading="lazy" /> : <span className="version__icon"><Image src={`/icons/${dish.icon}.svg`} alt="" width={40} height={40} /></span>}
                  {p?.kind === "commons" && <Credit p={p} />}
                  <div className="version__body">
                    <strong>{v.name}</strong>
                    <span className="version__desc">{v.desc}</span>
                    <span className="version__meta">
                      ≈ {v.priceGel[0]}–{v.priceGel[1]} ₾
                      {v.spicy === 2 ? " · 🌶🌶" : v.spicy ? " · 🌶" : ""}
                      {v.vegan ? " · ვეგანური" : v.vegetarian ? " · ვეგეტარიანული" : ""}
                      {v.healthy ? " · ჯანსაღი" : ""}
                    </span>
                    {p?.kind === "unsplash" && <span className="version__credit">ფოტო: <Credit p={p} /></span>}
                  </div>
                  <a className="version__go" href={mapsSearchUrl(v.name, nearArea)} target="_blank" rel="noreferrer" aria-label={`${v.name} Google Maps-ზე`}>↗</a>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="modal__section">
          <h3><span className="dot dot--green" />გასინჯე ახლოს{place ? <span className="modal__where"> · {area}, {radius} კმ</span> : null}</h3>
          {venues.kind === "no-place" && (
            <div className="row-card row-card--empty">
              <span>აირჩიე უბანი ან ჩართე ლოკაცია — გაჩვენებ, სად არის ახლოს.</span>
              <button className="link" onClick={onPickPlace}>უბნის არჩევა →</button>
            </div>
          )}
          {venues.kind === "loading" && <div className="row-card row-card--empty"><span>ვეძებ…</span></div>}
          {venues.kind === "error" && <div className="row-card row-card--empty"><span>ვერ ჩაიტვირთა: {venues.message}</span></div>}
          {venues.kind === "ready" && venues.venues.length === 0 && (
            <div className="row-card row-card--empty"><span>ამ რადიუსში ვერ ვიპოვე — გაზარდე რადიუსი ან მოძებნე Google Maps-ზე.</span></div>
          )}
          {venues.kind === "ready" && venues.venues.slice(0, 4).map((v) => (
            <a key={v.id} className="row-card" href={mapsDirectionsUrl(v)} target="_blank" rel="noreferrer">
              <span className="row-card__main">
                <strong>{v.name}</strong>
                <span className={v.byName ? "tag tag--green" : "tag"}>{v.byName ? "სახელით ემთხვევა" : "სავარაუდოდ"}</span>
              </span>
              <span className="row-card__side">{km(v.distanceKm)} ↗</span>
            </a>
          ))}
          <GoogleNearby term={dish.search} category={dish.category} cuisine={dish.cuisine} area={nearArea} place={place} radius={radius} />
          <a className="modal__maps" href={mapsSearchUrl(dish.search, nearArea)} target="_blank" rel="noreferrer">
            ყველა „{dish.name}“ Google Maps-ზე ↗
          </a>
        </section>

        <section className="modal__section">
          <h3><span className="dot dot--orange" />გამოიძახე სახლში</h3>
          <div className="modal__delivery">
            {delivery.map((d) => (
              <a key={d.id} className="delivery" href={d.url} target="_blank" rel="noreferrer">
                <i style={{ background: d.dot }} />
                <strong>{d.name}</strong>
                <span>↗</span>
              </a>
            ))}
          </div>
        </section>
    </Sheet>
  );
}
