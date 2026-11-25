/**
 * File:        components/FilterPanel.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-17
 * Version:     no emoji in place select; v3.1 — "მეტი ფილტრი": collapsed <details> with cuisine / dish type / meal
 *              time (compact text chips, count badge, opens itself when something is set)
 *              v3.0 — stylized: sticker chips with food icons, hover lift,
 *              press-down click, sliding segmented thumb, icon pop on select
 *              (layout still Figma "v3/Filter panel"; motion off for reduced-motion)
 * Description: Controlled component, owns no state. Every change is applied to the
 *              wheel immediately by the parent; "გაფილტრე" spins with the filters,
 *              "შემთხვევით" spins ignoring taste/budget/diet (location still applies).
 */
"use client";

import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import type { Category, Cuisine, MealTime } from "@/lib/catalog.ts";
import { NEIGHBORHOODS, RADII_KM, type LatLng, type RadiusKm } from "@/lib/places.ts";
import { DEFAULT_FILTERS, type Diet, type Filters, type Taste } from "@/lib/spin.ts";

export type Place = { label: string; center: LatLng; wolt: string | null };

const TASTES: { id: Taste; label: string; icon: string }[] = [
  { id: "spicy", label: "ცხარე", icon: "chili" },
  { id: "light", label: "მსუბუქი", icon: "salad" },
  { id: "georgian", label: "ქართული", icon: "khinkali" },
  { id: "sweet", label: "ტკბილი", icon: "cake" },
  { id: "fast", label: "სწრაფი", icon: "burger" },
  { id: "healthy", label: "ჯანსაღი", icon: "apple" },
];
const DIETS: { id: Diet; label: string; icon: string }[] = [
  { id: "vegetarian", label: "ვეგეტარიანული", icon: "leaf" },
  { id: "vegan", label: "ვეგანური", icon: "sprout" },
];
const CUISINES: Cuisine[] = ["ქართული", "ევროპული", "იტალიური", "აზიური", "ახლოაღმოსავლური", "ამერიკული", "ლათინური", "ინდური"];
const CATEGORIES: Category[] = ["ხორცი", "ცომეული", "წვნიანი", "კერძი", "სალათი", "ზღვის", "სტრიტფუდი", "საუზმე", "დესერტი"];
const CATEGORY_LABEL: Partial<Record<Category, string>> = { "ზღვის": "ზღვის პროდუქტი", "კერძი": "ცხელი კერძი" };
const MEALS: MealTime[] = ["საუზმე", "სადილი", "ვახშამი", "ღამე"];
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
  /** Inside the shared Sheet: no own × (Sheet has one), actions go to the Sheet footer. */
  inSheet?: boolean;
  onClose?: () => void;
  personaName: string | null;
  onQuiz: () => void;
};

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Sticker chip: food icon + label; pressed state pops the icon and shows a tick. */
function Chip({ on, icon, label, onClick }: { on: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button aria-pressed={on} className={on ? "chip chip--icon on" : "chip chip--icon"} onClick={onClick}>
      <span className="chip__ico" aria-hidden="true"><Image src={`/icons/${icon}.svg`} alt="" width={22} height={22} /></span>
      {label}
      <span className="chip__tick" aria-hidden="true">✓</span>
    </button>
  );
}

/** Compact text chip for the "მეტი ფილტრი" groups — no icons, so 21 options stay calm. */
function Mini({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return <button aria-pressed={on} className={on ? "chip chip--mini on" : "chip chip--mini"} onClick={onClick}>{label}</button>;
}

/** Section title with a small icon. */
const Title = ({ icon, children }: { icon: string; children: ReactNode }) => (
  <h3 className="panel__title"><Image src={`/icons/${icon}.svg`} alt="" width={18} height={18} />{children}</h3>
);

export function FilterPanel(p: Props) {
  const { filters: f } = p;
  const value = p.locating ? GEO : p.place?.label ?? "";
  const moreCount = f.cuisines.length + f.categories.length + f.meals.length;
  // Opens itself when the quiz or a saved session already set something inside.
  const [moreOpen, setMoreOpen] = useState(moreCount > 0);
  return (
    <section className="panel" aria-label="ფილტრები">
      <div className="panel__head">
        <h2 id="filters-title">ფილტრები</h2>
        <button className="link" onClick={() => p.onFilters(DEFAULT_FILTERS)}>გასუფთავება</button>
        {p.onClose && <button className="panel__close" onClick={p.onClose} aria-label="დახურვა">×</button>}
      </div>

      <Title icon="pin">სად</Title>
      <div className="panel__where">
        <label className={p.place ? "place place--on" : "place"}>
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#f1435e" /></svg>
          <span>{p.locating ? "ვეძებ…" : p.place?.label ?? "თბილისი"}</span>
          <svg className="place__chev" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
            <option value={GEO}>{MY_LOCATION} (GPS)</option>
            {p.place?.label === MY_LOCATION && <option value={MY_LOCATION}>{MY_LOCATION}</option>}
            {NEIGHBORHOODS.map((n) => <option key={n.name} value={n.name}>{n.name}</option>)}
          </select>
        </label>
        <div className="segmented" role="radiogroup" aria-label="რადიუსი" aria-disabled={!p.place} style={{ "--i": RADII_KM.indexOf(p.radius), "--n": RADII_KM.length } as CSSProperties}>
          {RADII_KM.map((r) => (
            <button key={r} role="radio" aria-checked={p.radius === r} disabled={!p.place} className={p.radius === r ? "on" : ""} onClick={() => p.onRadius(r)}>
              {r} კმ
            </button>
          ))}
        </div>
      </div>
      {p.locateError && <p className="hint hint--error">{p.locateError}</p>}

      <Title icon="coin">ბიუჯეტი <span className="h3-note">ერთი პორცია</span></Title>
      <div className="segmented segmented--budget" role="radiogroup" aria-label="ბიუჯეტი" style={{ "--i": f.priceMax - 1, "--n": 3 } as CSSProperties}>
        {([[1, "≤15"], [2, "≤35"], [3, "ნებისმიერი"]] as const).map(([v, note]) => (
          <button key={v} role="radio" aria-checked={f.priceMax === v} className={f.priceMax === v ? "on" : ""} onClick={() => p.onFilters({ ...f, priceMax: v })} title={`${note} ₾`}>
            <span className="seg__main">{"₾".repeat(v)}</span>
            <span className="seg__sub">{v === 3 ? "ნებისმიერი" : `${note} ₾`}</span>
          </button>
        ))}
      </div>

      <Title icon="chili">გემო</Title>
      <div className="chips">
        {TASTES.map((t) => (
          <Chip key={t.id} on={f.tastes.includes(t.id)} icon={t.icon} label={t.label} onClick={() => p.onFilters({ ...f, tastes: toggle(f.tastes, t.id) })} />
        ))}
      </div>

      <Title icon="leaf">დიეტა</Title>
      <div className="chips">
        {DIETS.map((d) => (
          <Chip key={d.id} on={f.diet.includes(d.id)} icon={d.icon} label={d.label} onClick={() => p.onFilters({ ...f, diet: toggle(f.diet, d.id) })} />
        ))}
      </div>

      <details className="more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
        <summary className="more__sum">
          <span>მეტი ფილტრი</span>
          {moreCount > 0 && <span className="more__badge">{moreCount}</span>}
          <svg className="more__chev" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </summary>
        <div className="more__body">
          <h4 className="more__h">სამზარეულო</h4>
          <div className="chips chips--mini">
            {CUISINES.map((c) => <Mini key={c} on={f.cuisines.includes(c)} label={c} onClick={() => p.onFilters({ ...f, cuisines: toggle(f.cuisines, c) })} />)}
          </div>
          <h4 className="more__h">კერძის ტიპი</h4>
          <div className="chips chips--mini">
            {CATEGORIES.map((c) => <Mini key={c} on={f.categories.includes(c)} label={CATEGORY_LABEL[c] ?? c} onClick={() => p.onFilters({ ...f, categories: toggle(f.categories, c) })} />)}
          </div>
          <h4 className="more__h">რისთვის</h4>
          <div className="chips chips--mini">
            {MEALS.map((m) => <Mini key={m} on={f.meals.includes(m)} label={m === "ღამე" ? "ღამით" : m} onClick={() => p.onFilters({ ...f, meals: toggle(f.meals, m) })} />)}
          </div>
        </div>
      </details>

      <button className="panel__hint" onClick={p.onQuiz}>
        <Image src="/icons/spark.svg" alt="" width={16} height={16} />
        <span>{p.personaName ? <>პერსონა: <strong>{p.personaName}</strong> · ტესტი თავიდან</> : "ტესტი ფილტრებს თავად შეავსებს"}</span>
        <span aria-hidden="true" className="panel__hint-arrow">→</span>
      </button>

      {!p.inSheet && <div className="panel__actions">
        <button className="pill pill--dark" onClick={p.onApply}>გაფილტრე</button>
        <button className="pill pill--outline" onClick={p.onRandom}>შემთხვევით</button>
      </div>}
    </section>
  );
}
