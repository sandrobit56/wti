/**
 * File:        components/SectionBridge.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v1.1 — shared-experience jokes instead of food facts (Georgians know
 *              what churchkhela is; they laugh at the "only five khinkali" lie)
 * Description: The pause between two sections: a food creature walks in with one
 *   short line, so moving down the page feels like turning to a new
 *   chapter instead of a mechanical stack of blocks. Motion is scroll-driven CSS
 *   (animation-timeline: view(), see globals.css "bridge"), so it follows the
 *   finger/wheel instead of playing once. Reduced motion / old browsers: static.
 *   Voice: the cheeky fortune-teller — a moment every Georgian recognises, ≤ 1 line.
 */
import Image from "next/image";
import { CREATURES } from "@/lib/creatures.ts";

type CreatureName = (typeof CREATURES)[number]["name"];

export function SectionBridge({ creature, fact, side = "left" }: { creature: CreatureName; fact: string; side?: "left" | "right" }) {
  return (
    <aside className={`bridge bridge--${side}`}>
      <Image className="bridge__creature" src={`/illustrations/creatures/${creature}.webp`} alt="" width={96} height={96} />
      <p className="bridge__bubble">{fact}</p>
    </aside>
  );
}
