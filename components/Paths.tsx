/**
 * File:        components/Paths.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v4.0 — one object, one choice, one button (Sandro's UX review: 4 boxes,
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

import { ArcText } from "./ArcText";
import Image from "next/image";
import { useEffect, useState } from "react";
import { priceBand, type Dish } from "@/lib/catalog.ts";
import { stickerSrc } from "@/lib/stickers.ts";
import { toMtavruli } from "@/lib/mtavruli.ts";
import { Words } from "./Words";
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

type Props = { dish: Dish | null; place: Place | null; radius: RadiusKm; group: GroupPick | null; onPickPlace: () => void; onSpin: () => void; onAgain: () => void };


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

export function Paths({ dish, place, radius, group, onPickPlace, onSpin, onAgain }: Props) {
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
          <Words caps parts={["სად ", ["შეჭამ?", "accent"]]} />
        </h2>

        <div className="paths2__plate" aria-hidden={!dish}>
          <ArcText className="paths2__arc" text={dish ? "დღეს შენი სუფრაა" : "ჯერ არაფერია"} />
          {dish
            ? <Image key={dish.slug} className="paths2__dish" src={stickerSrc(dish.slug)} alt="" width={256} height={256} />
            : <button className="paths2__empty" onClick={onSpin}>{toMtavruli("ჯერ დაატრიალე")} ↑</button>}
        </div>

        {dish && (
          <>
            <p className="paths2__name">{dish.name}</p>
            <p className="paths2__meta">
              ≈ {dish.priceGel[0]}–{dish.priceGel[1]} ₾ · {"₾".repeat(priceBand(dish))} · {dish.cuisine}
              {group && <> · <strong>{group.summary}</strong></>}
            </p>
            {group && <p className="paths2__group">{group.dishes.join(" · ")}</p>}

            <div className="paths2__switch" role="radiogroup" aria-label="როგორ">
              <button role="radio" aria-checked={way === "go"} className={way === "go" ? "on" : ""} onClick={() => setWay("go")}>მიდი</button>
              <button role="radio" aria-checked={way === "order"} className={way === "order" ? "on" : ""} onClick={() => setWay("order")}>გამოიძახე</button>
            </div>

            {main && <a className="btn" href={main.href} target="_blank" rel="noreferrer">{main.label} ↗</a>}

            <ul className="paths2__rows">
              {way === "go" && venues.kind === "no-place" && (
                <li><button className="link" onClick={onPickPlace}>აირჩიე უბანი — ახლომახლო ადგილებს გაჩვენებ →</button></li>
              )}
              {way === "go" && venues.kind === "loading" && <li className="muted">ვეძებ ახლოს…</li>}
              {way === "go" && venues.kind === "error" && <li className="muted">ადგილები ვერ ჩაიტვირთა ({venues.message})</li>}
              {way === "go" && venues.kind === "ready" && near.length === 0 && <li className="muted">{radius} კმ-ში ვერ ვიპოვე — სცადე რუკაზე.</li>}
              {way === "go" && near.slice(group ? 0 : 1).map((v) => (
                <li key={v.id}><a href={mapsDirectionsUrl(v)} target="_blank" rel="noreferrer"><span>{v.name}</span><span>{km(v.distanceKm)}</span></a></li>
              ))}
              {way === "order" && delivery.slice(1).map((d) => (
                <li key={d.id}><a href={d.url} target="_blank" rel="noreferrer"><span><i style={{ background: d.dot }} />{d.name}</span><span>↗</span></a></li>
              ))}
            </ul>

            <p className="paths2__foot">
              <button className="link" onClick={onAgain}>კიდევ დაატრიალე</button>
              <span>ბლოგები და შეფასებები — მალე</span>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
