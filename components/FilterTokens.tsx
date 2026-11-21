/**
 * File:        components/FilterTokens.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v1.0
 * Description: The filters as a row of stickers under the wheel (replaces the white
 *   box beside it — "no rectangle"). Each sticker shows the current choice; an
 *   active one is coloured. Tapping any opens the full FilterPanel in the shared
 *   Sheet (same popup grammar as the rest of the app).
 */
"use client";

import Image from "next/image";
import type { Diet, Filters, Taste } from "@/lib/spin.ts";

const TASTE_LABEL: Record<Taste, string> = { spicy: "ცხარე", light: "მსუბუქი", healthy: "ჯანსაღი", georgian: "ქართული", sweet: "ტკბილი", fast: "სწრაფი" };
const DIET_LABEL: Record<Diet, string> = { vegetarian: "ვეგეტარიანული", vegan: "ვეგანური" };

type Props = { filters: Filters; place: string | null; radius: number; onOpen: () => void };

/** "ცხარე" or "ცხარე +1" — first choice plus how many more. */
function summary<T extends string>(ids: T[], labels: Record<T, string>, empty: string): [string, boolean] {
  if (!ids.length) return [empty, false];
  return [`${labels[ids[0]]}${ids.length > 1 ? ` +${ids.length - 1}` : ""}`, true];
}

export function FilterTokens({ filters: f, place, radius, onOpen }: Props) {
  const more = f.cuisines.length + f.categories.length + f.meals.length;
  const [taste, tasteOn] = summary(f.tastes, TASTE_LABEL, "გემო");
  const [diet, dietOn] = summary(f.diet, DIET_LABEL, "დიეტა");
  const tokens: { icon: string; label: string; on: boolean }[] = [
    { icon: "pin", label: place ? `${place} · ${radius} კმ` : "თბილისი", on: !!place },
    { icon: "coin", label: f.priceMax === 3 ? "ბიუჯეტი" : `${"₾".repeat(f.priceMax)} · ≤${f.priceMax === 1 ? 15 : 35}`, on: f.priceMax < 3 },
    { icon: "chili", label: taste, on: tasteOn },
    { icon: "leaf", label: diet, on: dietOn },
  ];
  return (
    <div className="tokens" role="group" aria-label="ფილტრები">
      {tokens.map((t, i) => (
        <button key={t.icon} type="button" className={t.on ? "token on" : "token"} style={{ ["--i" as string]: i }} onClick={onOpen}>
          <Image src={`/icons/${t.icon}.svg`} alt="" width={18} height={18} />
          {t.label}
        </button>
      ))}
      <button type="button" className={more ? "token token--more on" : "token token--more"} style={{ ["--i" as string]: 4 }} onClick={onOpen} aria-label={`ყველა ფილტრი${more ? `, ${more} არჩეული` : ""}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /><circle cx="16" cy="7" r="2.4" fill="none" stroke="currentColor" strokeWidth="2.4" /><circle cx="10" cy="17" r="2.4" fill="none" stroke="currentColor" strokeWidth="2.4" /></svg>
        {more ? `+${more}` : "მეტი"}
      </button>
    </div>
  );
}
