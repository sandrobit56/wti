/**
 * File:        components/Scribble.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-23
 * Version:     v1.0
 * Description: Marker doodles for the collage (v7): arrow, star, loop, underline, sparkle.
 *              Drawn with one stroke each, so CSS can "draw" them in (stroke-dashoffset) when
 *              they enter view. Colour comes from `currentColor`. Always decorative.
 */
const PATHS = {
  arrow: { vb: "0 0 120 60", d: "M6 40 C 30 18, 62 14, 96 26 M80 12 L 100 27 L 78 40" },
  arrowDown: { vb: "0 0 60 120", d: "M30 6 C 18 34, 40 62, 28 96 M14 80 L 28 102 L 46 84" },
  star: { vb: "0 0 60 60", d: "M30 6 L 36 24 L 55 24 L 40 35 L 46 53 L 30 42 L 14 53 L 20 35 L 5 24 L 24 24 Z" },
  loop: { vb: "0 0 200 80", d: "M100 8 C 40 6, 6 22, 10 42 C 14 66, 90 76, 150 68 C 196 60, 200 30, 168 18 C 140 8, 96 8, 70 14" },
  underline: { vb: "0 0 200 20", d: "M4 12 C 50 4, 110 18, 196 8" },
  sparkle: { vb: "0 0 40 40", d: "M20 2 L 20 38 M2 20 L 38 20 M8 8 L 32 32 M32 8 L 8 32" },
} as const;

export type ScribbleKind = keyof typeof PATHS;

export function Scribble({ kind, className, width = 3 }: { kind: ScribbleKind; className?: string; width?: number }) {
  const p = PATHS[kind];
  return (
    <svg className={className ? `scribble scribble--${kind} ${className}` : `scribble scribble--${kind}`} viewBox={p.vb} aria-hidden="true" focusable="false">
      <path d={p.d} pathLength={1} fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
