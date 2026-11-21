/**
 * File:        components/SectionBridge.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v1.0
 * Description: The pause between two sections: a food creature walks in with one
 *   short food fact ("იცოდი?"), so moving down the page feels like turning to a new
 *   chapter instead of a mechanical stack of blocks. Motion is scroll-driven CSS
 *   (animation-timeline: view(), see globals.css "bridge"), so it follows the
 *   finger/wheel instead of playing once. Reduced motion / old browsers: static.
 *   Facts are well-established Georgian food culture; keep them short (≤ 2 lines).
 */
import Image from "next/image";
import { CREATURES } from "@/lib/creatures.ts";

type CreatureName = (typeof CREATURES)[number]["name"];

export function SectionBridge({ creature, fact, side = "left" }: { creature: CreatureName; fact: string; side?: "left" | "right" }) {
  return (
    <aside className={`bridge bridge--${side}`} aria-label="იცოდი?">
      <Image className="bridge__creature" src={`/illustrations/creatures/${creature}.webp`} alt="" width={96} height={96} />
      <p className="bridge__bubble"><b>იცოდი?</b> {fact}</p>
    </aside>
  );
}
