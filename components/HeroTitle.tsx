/**
 * File:        components/HeroTitle.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v5 — the board is a three.js scene (SignBoard → Sign3D); the words stay HTML;
 *              v4.0 — the sign announces the winner: the second line flips from „დღეს?“
 *              to the dish name, with a "where to eat" link under it.
 *              v3.0 — painted dukhan signboard; v2.0 — Mtavruli + serif voice word
 * Description: The hero's headline on a painted signboard. Rendered by the loading shell
 *              (no winner) and the live hero, so the layout never jumps. The h1 keeps
 *              the question; the winner line is a live region, so screen readers hear it.
 */
import { SignBoard } from "./SignBoard";
import { Words } from "./Words";

type Props = { winner?: string | null; onOpen?: () => void };

export function HeroTitle({ winner = null, onOpen }: Props) {
  return (
    <div className="sign">
      <SignBoard />
      <h1 className="hero__title display">
        <Words caps parts={["რა ვჭამოთ "]} />
        {!winner && <span className="accent sign__line">დღეს?</span>}
      </h1>
      <p className="sign__winner" aria-live="polite">
        {winner && (
          <>
            {/* key → remount → the flip animation replays for every new winner */}
            <span key={winner} className="accent sign__line sign__line--won">{winner}!</span>
            {onOpen && <button className="btn sign__go" onClick={onOpen}>სად შეჭამ? ↓</button>}
          </>
        )}
      </p>
    </div>
  );
}
