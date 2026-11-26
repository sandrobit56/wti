/**
 * File:        components/Paths.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-27
 * Version:     v6.0 — Figma 191:615: title + switch + venue rows + one button on the left,
 *              the dish photo with a coral name bar on the right; no labels, strips or tiles.
 *              v5.2 chapter label, lead line, three ways; v5.1 one-strip title; v5.0 — one result card: dish photo + name on the left, way / main action /
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

  // the one main action for the chosen way (Figma: "იპოვე რუკაზე" under the venue rows)
  const main = !dish ? null
    : way === "order" ? { href: delivery[0].url, label: `შეუკვეთე ${delivery[0].name}-ზე` }
    : { href: mapsSearchUrl(term, nearArea), label: "იპოვე რუკაზე" };

  return (
    <section className="paths9 sect" id="paths" aria-labelledby="paths-title">
      <div className="paths9__card">
        <div className="paths9__how">
          <h2 id="paths-title" className="title9">სად შეჭამ?</h2>
          {!dish ? (
            <>
              <p className="paths9__hint">ბორბალი ჯერ არ დაგიტრიალებია. ჯერ კერძი ამოიღე, მერე აქ გაჩვენებ, სად შეჭამ.</p>
              <button className="btn9" onClick={onSpin}>დაატრიალე ბორბალი ↑</button>
            </>
          ) : (
            <>
              <div className="seg9" role="radiogroup" aria-label="როგორ">
                <button role="radio" aria-checked={way === "go"} className={way === "go" ? "on" : ""} onClick={() => setWay("go")}>მივალ</button>
                <button role="radio" aria-checked={way === "order"} className={way === "order" ? "on" : ""} onClick={() => setWay("order")}>შევუკვეთავ</button>
              </div>
              <div className="paths9__act">
                <ul className="rows9">
                  {way === "go" && venues.kind === "no-place" && (
                    <li className="rows9__note"><button className="link" onClick={onPickPlace}>აირჩიე უბანი</button> — და ახლომახლო ადგილებს გაჩვენებ.</li>
                  )}
                  {way === "go" && venues.kind === "loading" && <li className="rows9__note">ვეძებ ახლოს…</li>}
                  {way === "go" && venues.kind === "error" && <li className="rows9__note">ადგილები ვერ ჩაიტვირთა ({venues.message})</li>}
                  {way === "go" && venues.kind === "ready" && near.length === 0 && <li className="rows9__note">{radius} კმ-ში ვერ ვიპოვე — სცადე რუკაზე.</li>}
                  {way === "go" && near.map((v) => (
                    <li key={v.id}><a className="row9" href={mapsDirectionsUrl(v)} target="_blank" rel="noreferrer"><span>{v.name}</span><span>{km(v.distanceKm)}</span></a></li>
                  ))}
                  {way === "order" && delivery.slice(1).map((d) => (
                    <li key={d.id}><a className="row9" href={d.url} target="_blank" rel="noreferrer"><span><i style={{ background: d.dot }} />{d.name}</span><span>↗</span></a></li>
                  ))}
                </ul>
                {group && <p className="paths9__group"><strong>{group.summary}</strong><br />{group.dishes.join(" · ")}</p>}
                {main && <a className="btn9" href={main.href} target="_blank" rel="noreferrer">{main.label}</a>}
              </div>
            </>
          )}
        </div>

        <figure className={dish ? "dish9" : "dish9 dish9--empty"}>
          {dish ? (
            <>
              <Image key={dish.slug} className="dish9__photo" src={typePhoto(dish.slug)?.src ?? stickerSrc(dish.slug)} alt={dish.name} width={1054} height={672} sizes="(max-width: 760px) 92vw, 527px" />
              <figcaption className="dish9__bar"><h3>{dish.name}</h3><p>{dish.priceGel[0]}–{dish.priceGel[1]} ₾ &nbsp; {dish.cuisine}</p></figcaption>
            </>
          ) : (
            <figcaption className="dish9__bar"><h3>შენი კერძი</h3><p>აქ გამოჩნდება</p></figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}
