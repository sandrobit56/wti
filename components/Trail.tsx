/**
 * File:        components/Trail.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v1.0
 * Description: The wheel and "სად შეჭამ?" are one flow (spin → where to eat it), so
 *   they are joined by a dotted trail. As you scroll, the dish the wheel picked
 *   (or the mascot, before the first spin) rides the trail down into the paths
 *   section — CSS offset-path + scroll-driven animation, no JS. Old browsers /
 *   reduced motion: the rider simply waits at the end. Decorative (aria-hidden).
 */
import Image from "next/image";

const D = "M100 4 C 10 70, 190 130, 100 216";

export function Trail({ icon, label }: { icon: string | null; label: string | null }) {
  return (
    <div className="trail" aria-hidden="true">
      <svg className="trail__svg" width="200" height="220" viewBox="0 0 200 220">
        <path d={D} className="trail__line" />
      </svg>
      <span className="trail__rider" style={{ offsetPath: `path("${D}")` }}>
        <Image src={icon ? `/icons/${icon}.svg` : "/icons/mascot.svg"} alt="" width={44} height={44} />
      </span>
      {label && <span className="trail__label">{label}</span>}
    </div>
  );
}
