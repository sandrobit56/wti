/**
 * File:        components/ArcText.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: Curved caption — the logo's "რა ვჭამოთ?" arc as a reusable motif.
 *              Text runs over the top of a circle (in Mtavruli, our display font); place it above
 *              a round object (plate, badge, sticker) so the words hug it. Decorative by default:
 *              pass `label` only when the words carry meaning a screen reader needs.
 */
import { useId } from "react";
import { toMtavruli } from "@/lib/mtavruli.ts";

type Props = {
  text: string;
  /** degrees of circle the text may span, centred on the top (default 150) */
  spread?: number;
  className?: string;
  label?: string;
};

export function ArcText({ text, spread = 150, className, label }: Props) {
  if (spread <= 0 || spread >= 360) throw new Error(`ArcText: spread must be 0–360, got ${spread}`);
  const id = `arc${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const R = 100;
  const half = (spread / 2) * (Math.PI / 180);
  const x0 = -R * Math.sin(half), y0 = -R * Math.cos(half);
  const big = spread > 180 ? 1 : 0;
  return (
    <svg className={className ? `arc-text ${className}` : "arc-text"} viewBox="-130 -130 260 260" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path id={id} d={`M${x0} ${y0}A${R} ${R} 0 ${big} 1 ${-x0} ${y0}`} fill="none" />
      <text><textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{toMtavruli(text)}</textPath></text>
    </svg>
  );
}
