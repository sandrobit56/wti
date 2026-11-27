"use client";
/**
 * File:        components/ChapterRail.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-27
 * Version:     v1.0
 * Description: A quiet chapter index on the left edge (desktop ≥ 1280px), the technique
 *              Shopify Editions uses for its long page: numbers + names, the current chapter
 *              lit, and a thin line that fills with the scroll (CSS scroll timeline, no JS).
 *              Reuses the header's scroll-spy, so both always agree on "where am I".
 */
import { useActiveSection } from "./SiteNav";

const CHAPTERS = [
  { id: "wheel", n: "01", label: "ბორბალი" },
  { id: "paths", n: "02", label: "ადგილი" },
  { id: "game", n: "03", label: "თამაში" },
  { id: "persona", n: "04", label: "პერსონა" },
  { id: "join", n: "05", label: "კრიტიკოსი" },
] as const;

export function ChapterRail() {
  const active = useActiveSection();
  return (
    <nav className="rail9" aria-label="თავები">
      <span className="rail9__track" aria-hidden="true"><i /></span>
      <ol>
        {CHAPTERS.map((c) => (
          <li key={c.id}>
            <a href={`#${c.id}`} className={active === c.id ? "on" : undefined} aria-current={active === c.id ? "true" : undefined}>
              <span>{c.n}</span>{c.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
