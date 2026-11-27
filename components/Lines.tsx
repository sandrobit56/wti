/**
 * File:        components/Lines.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-27
 * Version:     v1.0
 * Description: Thin construction lines behind a section title — the "Da Vinci lines" idea
 *              from Shopify Editions, told with our own geometry: the plate (circles), the
 *              slices (radii), the table (horizontals). Each section gets its own figure, so
 *              sections differ while speaking one language. The strokes draw themselves in as
 *              the section scrolls into view (CSS, pathLength=1); static where unsupported.
 */
type Kind = "plate" | "slices" | "table" | "card" | "page";

const FIG: Record<Kind, string[]> = {
  // section 2: a plate seen from above, offset to the right (where the photo sits)
  plate: ["M1240 300a260 260 0 1 0 -520 0a260 260 0 1 0 520 0", "M1160 300a180 180 0 1 0 -360 0a180 180 0 1 0 360 0", "M0 300H1440", "M980 0V600"],
  // game: the wheel's slices fanning out from the centre
  slices: ["M720 620L120 0", "M720 620L420 0", "M720 620V0", "M720 620L1020 0", "M720 620L1320 0", "M1020 620a300 300 0 1 0 -600 0"],
  // persona: a card's proportions (3:4) and its diagonals
  card: ["M570 60H870V460H570Z", "M570 60L870 460", "M870 60L570 460", "M0 260H1440", "M720 0V600"],
  // critic: a page — margins, baseline grid, one circle for the drop cap
  page: ["M180 0V600", "M1260 0V600", "M0 140H1440", "M0 460H1440", "M330 300a90 90 0 1 0 -180 0a90 90 0 1 0 180 0"],
  table: ["M0 420H1440", "M120 420L720 120L1320 420"],
};

export function Lines({ kind, className = "" }: { kind: Kind; className?: string }) {
  return (
    <svg className={`lines9 ${className}`} viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {FIG[kind].map((d, i) => <path key={i} d={d} pathLength={1} style={{ ["--i" as string]: i }} />)}
    </svg>
  );
}
