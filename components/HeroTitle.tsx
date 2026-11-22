/**
 * File:        components/HeroTitle.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v3.0 — painted dukhan signboard (Pirosmani tradition) behind the title;
 *              v2.0 — Mtavruli capitals + serif voice word (no sticker box)
 * Description: The hero's one line, as real HTML (was SVG text on an arc). Rendered
 *              by both the loading shell and the live hero, so it is the LCP element
 *              and the layout never jumps when the wheel arrives.
 */
import { Words } from "./Words";

export function HeroTitle() {
  return (
    <h1 className="hero__title display sign">
      <Words caps parts={["რა ვჭამოთ ", ["დღეს?", "accent"]]} />
    </h1>
  );
}
