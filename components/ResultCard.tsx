/**
 * File:        components/ResultCard.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0
 * Description: The three paths for the winning dish:
 *   1. "ახლოს" — our Overture venues within the radius (needs a place)
 *   2. Google Maps search — every restaurant Google knows, via a Maps URL
 *   3. Delivery — Wolt / Glovo / Bolt Food Tbilisi pages
 */
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Dish } from "@/lib/catalog.ts";
import { DELIVERY, mapsDirectionsUrl, mapsSearchUrl, mapsVenueUrl, type RadiusKm, type VenueMatch } from "@/lib/places.ts";
import type { Place } from "./FilterPanel";

type VenueState =
  | { kind: "no-place" }
  | { kind: "loading" }
  | { kind: "ready"; datasetReady: boolean; venues: VenueMatch[] }
  | { kind: "error"; message: string };

type Props = {
  dish: Dish;
  place: Place | null;
  radius: RadiusKm;
  onAgain: () => void;
  onNotToday: () => void;
  onPickPlace: () => void;
};

export function ResultCard({ dish, place, radius, onAgain, onNotToday, onPickPlace }: Props) {
  const key = place ? `${dish.slug}|${place.center.lat}|${place.center.lng}|${radius}` : null;
  const [fetched, setFetched] = useState<{ key: string; state: VenueState } | null>(null);

  // Subscribe to the network; setState only in callbacks (no cascading renders).
  useEffect(() => {
    if (!key || !place) return;
    const ctrl = new AbortController();
    const q = new URLSearchParams({ dish: dish.slug, lat: String(place.center.lat), lng: String(place.center.lng), r: String(radius) });
    fetch(`/api/venues?${q}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.json()).error}`);
        return res.json();
      })
      .then((j) => setFetched({ key, state: { kind: "ready", datasetReady: j.datasetReady, venues: j.venues } }))
      .catch((e: Error) => { if (e.name !== "AbortError") setFetched({ key, state: { kind: "error", message: e.message } }); });
    return () => ctrl.abort();
  }, [key, dish.slug, place, radius]);

  const state: VenueState = !key ? { kind: "no-place" } : fetched?.key === key ? fetched.state : { kind: "loading" };

  const area = place && place.label !== "ჩემი ლოკაცია" ? place.label : "თბილისი";

  return (
    <article className="result" aria-live="polite">
      <div className="result__hero">
        <Image src={`/icons/${dish.icon}.svg`} alt="" width={72} height={72} />
        <div>
          <p className="caps">დღეს ჭამ</p>
          <h2 className="result__name">{dish.name}</h2>
          <p className="meta">{"₾".repeat(dish.price)} · {dish.cuisine}{dish.spicy ? " · ცხარე" : ""}{dish.vegan ? " · ვეგანური" : dish.vegetarian ? " · ვეგეტარიანული" : ""}</p>
        </div>
      </div>

      <section>
        <h3>ახლოს{place ? ` · ${place.label}, ${radius} კმ` : ""}</h3>
        {state.kind === "no-place" && (
          <p className="hint">აირჩიე უბანი ან ჩართე ლოკაცია, რომ ახლომახლო ადგილები გაჩვენო. <button className="link" onClick={onPickPlace}>არჩევა →</button></p>
        )}
        {state.kind === "loading" && <p className="hint">ვეძებ…</p>}
        {state.kind === "error" && <p className="hint hint--error">ვერ ჩაიტვირთა: {state.message}</p>}
        {state.kind === "ready" && !state.datasetReady && (
          <p className="hint">ადგილების ბაზა ჯერ არ არის ჩატვირთული. ჯერჯერობით მოძებნე Google Maps-ზე ↓</p>
        )}
        {state.kind === "ready" && state.datasetReady && state.venues.length === 0 && (
          <p className="hint">ამ რადიუსში ვერაფერი ვიპოვე. გაზარდე რადიუსი ან მოძებნე Google Maps-ზე ↓</p>
        )}
        {state.kind === "ready" && state.venues.length > 0 && (
          <ul className="venues">
            {state.venues.map((v) => (
              <li key={v.id}>
                <a href={mapsVenueUrl(v)} target="_blank" rel="noreferrer" className="venue__name">{v.name}</a>
                <span className="meta">
                  {v.distanceKm < 1 ? `${Math.round(v.distanceKm * 1000)} მ` : `${v.distanceKm.toFixed(1)} კმ`}
                  {v.byName ? "" : " · სავარაუდოდ"}
                </span>
                <a href={mapsDirectionsUrl(v)} target="_blank" rel="noreferrer" className="link">მარშრუტი</a>
              </li>
            ))}
          </ul>
        )}
        <a className="pill pill--outline pill--block" href={mapsSearchUrl(`${dish.search} ${area}`)} target="_blank" rel="noreferrer">
          ყველა „{dish.name}“ Google Maps-ზე
        </a>
      </section>

      <section>
        <h3>შეუკვეთე სახლში</h3>
        <div className="row">
          {DELIVERY.map((d) => (
            <a key={d.id} className="pill pill--outline" href={d.url} target="_blank" rel="noreferrer">{d.name}</a>
          ))}
        </div>
        <p className="meta">აპში მოძებნე: „{dish.search}“</p>
      </section>

      <div className="result__actions">
        <button className="pill pill--dark" onClick={onAgain}>თავიდან</button>
        <button className="pill pill--outline" onClick={onNotToday}>დღეს არა</button>
      </div>
    </article>
  );
}
