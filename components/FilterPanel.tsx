/**
 * File:        components/FilterPanel.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0
 * Description: Figma "v3/Filter panel": სად / ბიუჯეტი / გემო / დიეტა.
 *              Budget + diet are hard filters; taste chips only boost (×1.5).
 *              Controlled component — owns no state.
 */
"use client";

import Image from "next/image";
import { NEIGHBORHOODS, RADII_KM, type LatLng, type RadiusKm } from "@/lib/places.ts";
import type { Diet, Filters, Taste } from "@/lib/spin.ts";

export type Place = { label: string; center: LatLng };

const TASTES: { id: Taste; label: string }[] = [
  { id: "spicy", label: "ცხარე" },
  { id: "light", label: "მსუბუქი" },
  { id: "georgian", label: "ქართული" },
  { id: "sweet", label: "ტკბილი" },
  { id: "fast", label: "სწრაფი" },
];
const DIETS: { id: Diet; label: string }[] = [
  { id: "vegetarian", label: "ვეგეტარიანული" },
  { id: "vegan", label: "ვეგანური" },
];

type Props = {
  filters: Filters;
  place: Place | null;
  radius: RadiusKm;
  locating: boolean;
  locateError: string | null;
  onFilters: (f: Filters) => void;
  onPlace: (p: Place | null) => void;
  onRadius: (r: RadiusKm) => void;
  onLocate: () => void;
  onApply: () => void;
  onRandom: () => void;
  onClose?: () => void;
};

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function FilterPanel(p: Props) {
  const { filters: f } = p;
  return (
    <section className="panel" aria-label="ფილტრები">
      <div className="panel__head">
        <h2>ფილტრები</h2>
        <button className="link" onClick={() => p.onFilters({ priceMax: 3, tastes: [], diet: [] })}>გასუფთავება</button>
        {p.onClose && <button className="panel__close" onClick={p.onClose} aria-label="დახურვა">×</button>}
      </div>

      <h3>სად</h3>
      <div className="row">
        <select
          className="pill pill--place"
          value={p.place?.label ?? ""}
          onChange={(e) => {
            const n = NEIGHBORHOODS.find((x) => x.name === e.target.value);
            p.onPlace(n ? { label: n.name, center: n.center } : null);
          }}
        >
          <option value="">აირჩიე უბანი</option>
          {p.place?.label === "ჩემი ლოკაცია" && <option value="ჩემი ლოკაცია">ჩემი ლოკაცია</option>}
          {NEIGHBORHOODS.map((n) => <option key={n.name} value={n.name}>{n.name}</option>)}
        </select>
        <button className="pill pill--outline" onClick={p.onLocate} disabled={p.locating}>
          <Image src="/icons/pin.svg" alt="" width={18} height={18} />
          {p.locating ? "ვეძებ…" : "ჩემი ლოკაცია"}
        </button>
      </div>
      {p.locateError && <p className="hint hint--error">{p.locateError}</p>}
      <div className="segmented" role="radiogroup" aria-label="რადიუსი">
        {RADII_KM.map((r) => (
          <button key={r} role="radio" aria-checked={p.radius === r} className={p.radius === r ? "on" : ""} onClick={() => p.onRadius(r)}>
            {r} კმ
          </button>
        ))}
      </div>

      <h3>ბიუჯეტი</h3>
      <div className="segmented" role="radiogroup" aria-label="ბიუჯეტი">
        {([1, 2, 3] as const).map((v) => (
          <button key={v} role="radio" aria-checked={f.priceMax === v} className={f.priceMax === v ? "on" : ""} onClick={() => p.onFilters({ ...f, priceMax: v })}>
            {"₾".repeat(v)}
          </button>
        ))}
      </div>

      <h3>გემო</h3>
      <div className="chips">
        {TASTES.map((t) => (
          <button key={t.id} aria-pressed={f.tastes.includes(t.id)} className={f.tastes.includes(t.id) ? "chip on" : "chip"} onClick={() => p.onFilters({ ...f, tastes: toggle(f.tastes, t.id) })}>
            {t.label}
          </button>
        ))}
      </div>

      <h3>დიეტა</h3>
      <div className="chips">
        {DIETS.map((d) => (
          <button key={d.id} aria-pressed={f.diet.includes(d.id)} className={f.diet.includes(d.id) ? "chip on" : "chip"} onClick={() => p.onFilters({ ...f, diet: toggle(f.diet, d.id) })}>
            {d.label}
          </button>
        ))}
      </div>

      <div className="panel__actions">
        <button className="pill pill--dark" onClick={p.onApply}>გაფილტრე</button>
        <button className="pill pill--outline" onClick={p.onRandom}>შემთხვევით</button>
      </div>
    </section>
  );
}
