/**
 * File:        components/HeroTitle.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-27
 * Version:     v8 — Figma frame 191:615: one plain line in BPG SF DG, coral, no strips;
 *              the winner is a quiet line under it with a link down to "სად შეჭამ?".
 *              (v7 paper strips, v6 ransom letters, v5 three.js sign …)
 * Description: The hero's headline. Rendered by the loading shell (no winner) and the live
 *              hero, so the layout never jumps. The winner line is a live region, so screen
 *              readers hear the result.
 */
type Props = { winner?: string | null; onOpen?: () => void };

export function HeroTitle({ winner = null, onOpen }: Props) {
  return (
    <div className="hero9__head">
      <h1 className="title9 title9--hero">რა ვჭამოთ დღეს?</h1>
      <p className="hero9__winner" aria-live="polite">
        {winner && (
          <>
            <b>{winner}!</b>
            {onOpen && <button className="hero9__go" onClick={onOpen}>სად შეჭამ? ↓</button>}
          </>
        )}
      </p>
    </div>
  );
}
