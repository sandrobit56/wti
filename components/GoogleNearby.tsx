/**
 * File:        components/GoogleNearby.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-17
 * Version:     v1.0
 * Description: Inside the result popup: a live Google map of the dish around the
 *              chosen area (Maps Embed — free), and a button that asks Google for
 *              real nearby places (Places API — paid, so only on tap, never on open).
 */
"use client";

import { useState } from "react";
import { embedSearchUrl, TBILISI, type GooglePlace } from "@/lib/google.ts";
import type { RadiusKm } from "@/lib/places.ts";
import type { Place } from "./FilterPanel";
import { km } from "./Paths";

const EMBED_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY ?? "";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; places: GooglePlace[] }
  | { kind: "limit" }
  | { kind: "error" };

export function GoogleNearby({ term, category, cuisine, area, place, radius }: { term: string; category: string; cuisine: string; area: string | null; place: Place | null; radius: RadiusKm }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const center = place?.center ?? TBILISI;
  const r = place ? radius : 10; // whole city when no area chosen

  async function search() {
    setState({ kind: "loading" });
    const qs = new URLSearchParams({ q: term, cat: category, cuisine, lat: String(center.lat), lng: String(center.lng), r: String(r) });
    const res = await fetch(`/api/google-places?${qs}`);
    if (res.status === 429) return setState({ kind: "limit" });
    if (!res.ok) return setState({ kind: "error" });
    setState({ kind: "ready", places: (await res.json()).places });
  }

  if (!EMBED_KEY) console.error("NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY missing — Google map hidden");

  return (
    <div className="gnear">
      {EMBED_KEY && (
        <iframe
          className="gnear__map"
          title={`${term} რუკაზე`}
          src={embedSearchUrl(EMBED_KEY, term, area, center)}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      )}

      {state.kind === "idle" && <button className="pill pill--outline pill--block" onClick={search}>ახლოს მყოფი ადგილები Google-იდან</button>}
      {state.kind === "loading" && <div className="row-card row-card--empty"><span>Google-ში ვეძებ…</span></div>}
      {state.kind === "limit" && <div className="row-card row-card--empty"><span>დღევანდელი Google-ის ლიმიტი ამოიწურა — ზემოთ ჩვენი სიაა, ან გახსენი რუკა.</span></div>}
      {state.kind === "error" && <div className="row-card row-card--empty"><span>Google არ პასუხობს — სცადე მოგვიანებით.</span></div>}
      {state.kind === "ready" && state.places.length === 0 && <div className="row-card row-card--empty"><span>Google-მა ამ არეალში ვერ იპოვა.</span></div>}
      {state.kind === "ready" && state.places.map((p) => (
        <a key={p.id} className="row-card" href={p.mapsUrl} target="_blank" rel="noreferrer">
          <span className="row-card__main">
            <strong>{p.name}</strong>
            {p.address && <span className="tag">{p.address}</span>}
          </span>
          <span className="row-card__side">{km(p.distanceKm)} ↗</span>
        </a>
      ))}
      {state.kind === "ready" && <p className="gnear__attr">მონაცემები: Google Maps</p>}
    </div>
  );
}
