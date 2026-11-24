/**
 * File:        components/Bridge.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-25
 * Version:     v1.0 — replaces WaveBand (torn edge + tape band read as dry)
 * Description: The transition between two chapters is one big cut-out collage figure that
 *              sits across the seam — half on the section above, half on this one — and
 *              drifts with the scroll (CSS view timeline, off under reduced motion).
 *              Pure decoration: hidden from screen readers.
 */
import Image from "next/image";

export type Figure = "khinkali-hand" | "dionysus" | "athena" | "icarus";

const SIZES: Record<Figure, [number, number]> = {
  "khinkali-hand": [605, 1000],
  dionysus: [633, 1000],
  athena: [645, 1000],
  icarus: [1000, 756],
};

export function Bridge({ figure, side }: { figure: Figure; side: "left" | "right" }) {
  const [w, h] = SIZES[figure];
  return (
    <div className={`bridge bridge--${side} bridge--${figure}`} aria-hidden="true">
      <Image className="bridge__img" src={`/collage/${figure}.webp`} alt="" width={w} height={h} sizes="(max-width: 640px) 40vw, 320px" />
    </div>
  );
}
