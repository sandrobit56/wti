/**
 * File:        components/ResultModal.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0
 * Description: Pops up the moment the wheel lands: the dish, where to taste it
 *              nearby, delivery apps, and the two next actions (spin again /
 *              not today). Closes with ×, Esc, or a click on the backdrop.
 *              Uses the native <dialog> so focus, Esc and the top layer come
 *              from the browser instead of hand-rolled code.
 */
"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { priceBand, type Dish } from "@/lib/catalog.ts";
import { deliveryLinks, mapsDirectionsUrl, mapsSearchUrl, type RadiusKm } from "@/lib/places.ts";
import { MY_LOCATION, type Place } from "./FilterPanel";
import { km, useNearbyVenues } from "./Paths";

type Props = {
  dish: Dish;
  place: Place | null;
  radius: RadiusKm;
  onClose: () => void;
  onAgain: () => void;
  onNotToday: () => void;
  onPickPlace: () => void;
};

export function ResultModal({ dish, place, radius, onClose, onAgain, onNotToday, onPickPlace }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const venues = useNearbyVenues(dish, place, radius);
  const area = place && place.label !== MY_LOCATION ? place.label : "თბილისი";
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

        <header className="modal__hero">
          <Image src={`/icons/${dish.icon}.svg`} alt="" width={88} height={88} />
          <p className="caps">დღეს ჭამ</p>
          <h2 id="modal-title" className="modal__name">{dish.name}</h2>
          <p className="modal__meta">
            ≈ {dish.priceGel[0]}–{dish.priceGel[1]} ₾ · {"₾".repeat(priceBand(dish))} · {dish.cuisine}
            {dish.spicy ? " · ცხარე" : ""}{dish.vegan ? " · ვეგანური" : dish.vegetarian ? " · ვეგეტარიანული" : ""}
          </p>
        </header>

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
          <a className="modal__maps" href={mapsSearchUrl(`${dish.search} ${area}`)} target="_blank" rel="noreferrer">
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
          <p className="modal__hint">აპში მოძებნე: „{dish.search}“</p>
        </section>

        <footer className="modal__actions">
          <button className="pill pill--dark" onClick={onAgain}>↻ ხელახლა</button>
          <button className="pill pill--outline" onClick={onNotToday}>დღეს არა</button>
        </footer>
      </div>
    </dialog>
  );
}
