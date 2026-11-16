/**
 * File:        components/FilterPanel.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v2.0 — Figma "v3/Filter panel" layout: place pill + radius in one
 *              row, budget segmented, taste + diet chips, quiz hint, two CTAs
 * Description: Controlled component, owns no state. Every change is applied to the
 *              wheel immediately by the parent; "გაფილტრე" spins with the filters,
 *              "შემთხვევით" spins ignoring taste/budget/diet (location still applies).
 */
"use client";

import Image from "next/image";
import { NEIGHBORHOODS, RADII_KM, type LatLng, type RadiusKm } from "@/lib/places.ts";
import type { Diet, Filters, Taste } from "@/lib/spin.ts";

export type Place = { label: string; center: LatLng; wolt: string | null };

const TASTES: { id: Taste; label: string }[] = [
  { id: "spicy", label: "ცხარე" },
  { id: "light", label: "მსუბუქი" },
  { id: "georgian", label: "ქართული" },
  { id: "sweet", label: "ტკბილი" },
  { id: "fast", label: "სწრაფი" },
  { id: "healthy", label: "ჯანსაღი" },
];
const DIETS: { id: Diet; label: string }[] = [
  { id: "vegetarian", label: "ვეგეტარიანული" },
  { id: "vegan", label: "ვეგანური" },
];
const GEO = "__geo";
export const MY_LOCATION = "ჩემი ლოკაცია";

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
  personaName: string | null;
  onQuiz: () => void;
};

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function FilterPanel(p: Props) {
  const { filters: f } = p;
  const value = p.locating ? GEO : p.place?.label ?? "";
  return (
    <section className="panel" aria-label="ფილტრები">
      <div className="panel__head">
        <h2>ფილტრები</h2>
        <button className="link" onClick={() => p.onFilters({ priceMax: 3, tastes: [], diet: [] })}>გასუფთავება</button>
        {p.onClose && <button className="panel__close" onClick={p.onClose} aria-label="დახურვა">×</button>}
      </div>

      <h3>სად</h3>
      <div className="panel__where">
        <label className={p.place ? "place place--on" : "place"}>
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#f1435e" /></svg>
          <span>{p.locating ? "ვეძებ…" : p.place?.label ?? "თბილისი"}</span>
          <select
            aria-label="უბანი"
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              if (v === GEO) return p.onLocate();
              const n = NEIGHBORHOODS.find((x) => x.name === v);
              p.onPlace(n ? { label: n.name, center: n.center, wolt: n.wolt } : null);
            }}
          >
            <option value="">მთელი თბილისი</option>
            <option value={GEO}>📍 {MY_LOCATION}</option>
            {p.place?.label === MY_LOCATION && <option value={MY_LOCATION}>{MY_LOCATION}</option>}
            {NEIGHBORHOODS.map((n) => <option key={n.name} value={n.name}>{n.name}</option>)}
          </select>
        </label>
        <div className="segmented" role="radiogroup" aria-label="რადიუსი" aria-disabled={!p.place}>
          {RADII_KM.map((r) => (
            <button key={r} role="radio" aria-checked={p.radius === r} disabled={!p.place} className={p.radius === r ? "on" : ""} onClick={() => p.onRadius(r)}>
              {r} კმ
            </button>
          ))}
        </div>
      </div>
      {p.locateError && <p className="hint hint--error">{p.locateError}</p>}

      <h3>ბიუჯეტი <span className="h3-note">ერთი პორცია</span></h3>
      <div className="segmented" role="radiogroup" aria-label="ბიუჯეტი">
        {([[1, "≤15"], [2, "≤35"], [3, "ნებისმიერი"]] as const).map(([v, note]) => (
          <button key={v} role="radio" aria-checked={f.priceMax === v} className={f.priceMax === v ? "on" : ""} onClick={() => p.onFilters({ ...f, priceMax: v })} title={`${note} ₾`}>
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

      <button className="panel__hint" onClick={p.onQuiz}>
        <Image src="/icons/spark.svg" alt="" width={16} height={16} />
        <span>{p.personaName ? <>პერსონა: <strong>{p.personaName}</strong> · ტესტი თავიდან</> : "ტესტი ფილტრებს თავად შეავსებს"}</span>
        <span aria-hidden="true" className="panel__hint-arrow">→</span>
      </button>

      <div className="panel__actions">
        <button className="pill pill--dark" onClick={p.onApply}>გაფილტრე</button>
        <button className="pill pill--outline" onClick={p.onRandom}>შემთხვევით</button>
      </div>
    </section>
  );
}
