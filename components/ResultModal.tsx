/**
 * File:        components/ResultModal.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-16
 * Version:     v2.1 — live Google map + on-tap Google Places nearby;
 *              v2.0 — 4–5 real versions of the dish (photo + credit, description,
 *              price, per-version Maps / delivery search); "სხვა ვერსიები" reshuffles
 * Description: Pops up the moment the wheel lands: the dish, where to taste it
 *              nearby, delivery apps, and the two next actions (spin again /
 *              not today). Closes with ×, Esc, or a click on the backdrop.
 *              Uses the native <dialog> so focus, Esc and the top layer come
 *              from the browser instead of hand-rolled code.
 */
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import photos from "@/data/photos.json";
import { priceBand, type Dish } from "@/lib/catalog.ts";
import { TYPE_WIKI, type Variant } from "@/lib/variants.ts";
import { deliveryLinks, mapsDirectionsUrl, mapsSearchUrl, type RadiusKm } from "@/lib/places.ts";
import { MY_LOCATION, type Place } from "./FilterPanel";
import { km, useNearbyVenues } from "./Paths";
import { GoogleNearby } from "./GoogleNearby";

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

type Photo = { src: string; author: string; license: string; licenseUrl: string | null; source: string };
const PHOTOS = photos as Record<string, Photo>;
const VERSIONS = 5;

/** Attribution is the license condition for CC BY / BY-SA — always shown next to the photo. */
function Credit({ p }: { p: Photo }) {
  return (
    <a className="credit" href={p.source} target="_blank" rel="noreferrer">
      ფოტო: {p.author} · {p.license}
    </a>
  );
}

export function ResultModal({ dish, place, radius, onClose, onAgain, onNotToday, onNever, onPickPlace, why, pickVersions }: Props) {
  const [versions, setVersions] = useState(() => pickVersions(VERSIONS));
  const hero = PHOTOS[TYPE_WIKI[dish.slug]];
  const ref = useRef<HTMLDialogElement>(null);
  const venues = useNearbyVenues(dish, place, radius);
  const area = place && place.label !== MY_LOCATION ? place.label : "თბილისი";
  const nearArea = place && place.label !== MY_LOCATION ? place.label : null;
  const delivery = deliveryLinks(place?.wolt ?? null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal__card">
        <button className="modal__close" onClick={onClose} aria-label="დახურვა" autoFocus>×</button>

        <header className={hero ? "modal__hero modal__hero--photo" : "modal__hero"}>
          {hero ? (
            <figure className="modal__photo">
              {/* plain <img>: local, already 640px; next/image would re-encode for no gain */}
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
          <ul className="versions">
            {versions.map((v) => {
              const p = v.wiki ? PHOTOS[v.wiki] : undefined;
              return (
                <li key={v.slug} className="version">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p ? <img className="version__img" src={p.src} alt="" loading="lazy" /> : <span className="version__icon"><Image src={`/icons/${dish.icon}.svg`} alt="" width={40} height={40} /></span>}
                  <div className="version__body">
                    <strong>{v.name}</strong>
                    <span className="version__desc">{v.desc}</span>
                    <span className="version__meta">
                      ≈ {v.priceGel[0]}–{v.priceGel[1]} ₾
                      {v.spicy === 2 ? " · 🌶🌶" : v.spicy ? " · 🌶" : ""}
                      {v.vegan ? " · ვეგანური" : v.vegetarian ? " · ვეგეტარიანული" : ""}
                      {v.healthy ? " · ჯანსაღი" : ""}
                    </span>
                    {p && <Credit p={p} />}
                  </div>
                  <a className="version__go" href={mapsSearchUrl(v.name, nearArea)} target="_blank" rel="noreferrer" aria-label={`${v.name} Google Maps-ზე`}>↗</a>
                </li>
              );
            })}
          </ul>
          <p className="modal__hint">ფასი — ტიპური დიაპაზონი თბილისში, ერთ პორციაზე.</p>
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
          <GoogleNearby term={dish.search} area={nearArea} place={place} radius={radius} />
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
          <p className="modal__hint">აპში მოძებნე: „{versions[0]?.name ?? dish.search}“</p>
        </section>

        <footer className="modal__actions">
          <button className="pill pill--dark" onClick={onAgain}>↻ ხელახლა</button>
          <button className="pill pill--outline" onClick={onNotToday}>დღეს არა</button>
          <button className="link modal__never" onClick={onNever}>„{dish.name}“ არ მიყვარს — აღარ შემომთავაზო</button>
        </footer>
      </div>
    </dialog>
  );
}
