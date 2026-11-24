/**
 * File:        components/HeroTitle.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-25
 * Version:     v7 — paper strips: the title is one cut strip, „დღეს?“ an ink strip, the
 *              winner a fresh strip each time; v6 — collage: the title is cut-out ransom letters on a torn paper strip, the
 *              winner gets pasted in the same way; v5 — three.js sign;
 *              v4.0 — the sign announces the winner: the second line flips from „დღეს?“
 *              to the dish name, with a "where to eat" link under it.
 *              v3.0 — painted dukhan signboard; v2.0 — Mtavruli + serif voice word
 * Description: The hero's headline on a painted signboard. Rendered by the loading shell
 *              (no winner) and the live hero, so the layout never jumps. The h1 keeps
 *              the question; the winner line is a live region, so screen readers hear it.
 */
import { Strip } from "./Strip";

type Props = { winner?: string | null; onOpen?: () => void };

export function HeroTitle({ winner = null, onOpen }: Props) {
  return (
    <div className="sign sign--paper">
      <h1 className="hero__title">
        <span className="sr-only">რა ვჭამოთ დღეს?</span>
        <Strip text="რა ვჭამოთ" decorative className="sign__title" />
        {!winner && <Strip text="დღეს?" tone="ink" decorative className="sign__ask" />}
      </h1>
      <p className="sign__winner" aria-live="polite">
        {winner && (
          <>
            <span className="sr-only">{winner}!</span>
            {/* key → remount → a new strip gets pasted in for every new winner */}
            <Strip key={winner} text={`${winner}!`} tone="ink" decorative className="sign__won" />
            {onOpen && <button className="btn sign__go" onClick={onOpen}>სად შეჭამ? ↓</button>}
          </>
        )}
      </p>
    </div>
  );
}
