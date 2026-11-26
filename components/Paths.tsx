/**
 * File:        components/Paths.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-25
 * Version:     v5.1 one-strip title; v5.0 — one result card: dish photo + name on the left, way / main action /
 *              places on the right; clear empty state. (v4 stacked 9 centred blocks.)
 *              v4.1 — collage: a marble hand offers the dish, the name is a paper strip;
 *              v4.0 — one object, one choice, one button (Sandro's UX review: 4 boxes,
 *              5 buttons, 5 links and 6 moving illustrations slowed the decision down).
 *              (v3.0 — three cards: read / go / order)
 * Description: Section 2, "სად შეჭამ?". The dish the wheel picked lands on a plate in the
 *              centre (its 3D sticker drops in as the section scrolls into view — the link
 *              from the wheel above). Under it: a two-way switch (მიდი / გამოიძახე), ONE main
 *              button for the chosen way, and at most three quiet rows (nearest venues, or the
 *              other delivery apps). Blogs are not built yet → one honest line, no empty card.
 *              Group mode: the line names the shared venue type and the group's dishes.
 */
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Dish } from "@/lib/catalog.ts";
import { stickerSrc } from "@/lib/stickers.ts";
import { typePhoto } from "@/lib/photos.ts";
import { Strip } from "./Strip";
import { deliveryLinks, mapsDirectionsUrl, mapsSearchUrl, type RadiusKm, type VenueMatch } from "@/lib/places.ts";
import { MY_LOCATION, type Place } from "./FilterPanel";

export type VenueState =
  | { kind: "no-place" }
  | { kind: "loading" }
  | { kind: "ready"; venues: VenueMatch[] }
  | { kind: "error"; message: string };

type Way = "go" | "order";

/** Group mode summary from the wheel: everyone's dishes and the venue type they share. */
export type GroupPick = { dishes: string[]; summary: string; searchTerm: string | null };

type Props = { dish: Dish | null; place: Place | null; radius: RadiusKm; group: GroupPick | null; onPickPlace: () => void; onSpin: () => void };


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

export function Paths({ dish, place, radius, group, onPickPlace, onSpin }: Props) {
  const [way, setWay] = useState<Way>("go");
  const venues = useNearbyVenues(dish, place, radius);
  const nearArea = place && place.label !== MY_LOCATION ? place.label : null;
  const term = group?.searchTerm ?? dish?.search ?? "";
  const delivery = deliveryLinks(place?.wolt ?? null);
  const near = venues.kind === "ready" ? venues.venues.slice(0, 3) : [];

  // the one main action for the chosen way
  const main = !dish ? null
    : way === "order" ? { href: delivery[0].url, label: `შეუკვეთე ${delivery[0].name}-ზე` }
    : near[0] && !group ? { href: mapsDirectionsUrl(near[0]), label: `გზა: ${near[0].name}` }
    : { href: mapsSearchUrl(term, nearArea), label: "იპოვე რუკაზე" };

  return (
    <section className="paths2 sect" id="paths" aria-labelledby="paths-title">
      <div className="container paths2__inner">
        <h2 id="paths-title" className="section-title display paths2__title">
          <Strip text="სად შეჭამ?" straight className="title-strip title-strip--action" />
        </h2>

        {!dish ? (
          /* empty state: one picture, one sentence, one button */
          <div className="result result--empty">
            <Image className="result__hand" src="/collage/palm.webp" alt="" width={1000} height={494} sizes="(max-width: 640px) 80vw, 420px" />
            <p className="result__hint">ბორბალი ჯერ არ დაგიტრიალებია. ჯერ კერძი ამოიღე, მერე აქ გაჩვენებ, სად შეჭამ.</p>
            <button className="btn" onClick={onSpin}>დაატრიალე ბორბალი ↑</button>
          </div>
        ) : (
          /* v5: one result card — left: the dish, right: how to get it */
          <div className="result">
            <figure className="result__dish">
              <Image key={dish.slug} className="result__photo paths2__dish" src={typePhoto(dish.slug)?.src ?? stickerSrc(dish.slug)} alt={dish.name} width={640} height={640} sizes="(max-width: 640px) 90vw, 420px" />
              <figcaption>
                <div className="result__title"><h3 className="result__name">{dish.name}</h3><p className="result__meta">{dish.priceGel[0]}–{dish.priceGel[1]} ₾ · {dish.cuisine}</p></div>
                {group && <p className="result__group"><strong>{group.summary}</strong><br />{group.dishes.join(" · ")}</p>}
              </figcaption>
            </figure>

            <div className="result__how">
              <div className="seg" role="radiogroup" aria-label="როგორ">
                <button role="radio" aria-checked={way === "go"} className={way === "go" ? "on" : ""} onClick={() => setWay("go")}>მივალ</button>
                <button role="radio" aria-checked={way === "order"} className={way === "order" ? "on" : ""} onClick={() => setWay("order")}>შევუკვეთავ</button>
              </div>

              <ul className="result__list">
                {way === "go" && venues.kind === "no-place" && (
                  <li className="result__note"><button className="link" onClick={onPickPlace}>აირჩიე უბანი</button> — და ახლომახლო ადგილებს გაჩვენებ.</li>
                )}
                {way === "go" && venues.kind === "loading" && <li className="result__note">ვეძებ ახლოს…</li>}
                {way === "go" && venues.kind === "error" && <li className="result__note">ადგილები ვერ ჩაიტვირთა ({venues.message})</li>}
                {way === "go" && venues.kind === "ready" && near.length === 0 && <li className="result__note">{radius} კმ-ში ვერ ვიპოვე — სცადე რუკაზე.</li>}
                {way === "go" && near.slice(group ? 0 : 1).map((v) => (
                  <li key={v.id}><a className="row" href={mapsDirectionsUrl(v)} target="_blank" rel="noreferrer"><span>{v.name}</span><span>{km(v.distanceKm)} ↗</span></a></li>
                ))}
                {way === "order" && delivery.slice(1).map((d) => (
                  <li key={d.id}><a className="row" href={d.url} target="_blank" rel="noreferrer"><span><i style={{ background: d.dot }} />{d.name}</span><span>↗</span></a></li>
                ))}
              </ul>

              {main && <a className="btn btn--lg result__main" href={main.href} target="_blank" rel="noreferrer">{main.label} ↗</a>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
