/**
 * File:        components/Words.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v1.0
 * Description: Splits text into words so CSS can scrub them in one by one with the
 *              scroll (pale pink → ink, slight rise + tilt). Pure markup; the motion
 *              lives in globals.css under `.words`. Screen readers get the plain text.
 *              parts: plain strings, or [text, className] for highlighted words.
 */
type Part = string | [string, string];

export function Words({ parts }: { parts: Part[] }) {
  let i = 0;
  const plain = parts.map((p) => (typeof p === "string" ? p : p[0])).join("");
  return (
    <span className="words">
      <span className="sr-only">{plain}</span>
      {parts.flatMap((p, pi) => {
        const [text, cls] = typeof p === "string" ? [p, ""] : p;
        // a styled part (sticker) stays one piece, so "ვერ იყიდი" is one sticker, not two
        if (cls) return [<span key={`${pi}`} className={`w ${cls}`} style={{ ["--w" as string]: i++ }} aria-hidden="true">{text}</span>];
        return text.split(/(\s+)/).filter(Boolean).map((w, wi) =>
          /^\s+$/.test(w) ? w : (
            <span key={`${pi}-${wi}`} className={cls ? `w ${cls}` : "w"} style={{ ["--w" as string]: i++ }} aria-hidden="true">{w}</span>
          ),
        );
      })}
    </span>
  );
}
