/**
 * File:        components/HeroTitle.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v1.0
 * Description: The hero's one line, as real HTML (was SVG text on an arc). Rendered
 *              by both the loading shell and the live hero, so it is the LCP element
 *              and the layout never jumps when the wheel arrives.
 */
export function HeroTitle() {
  return (
    <h1 className="hero__title">
      რა ვჭამოთ <span className="hl hl--pink">დღეს?</span>
    </h1>
  );
}
