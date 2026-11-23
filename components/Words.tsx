/**
 * File:        components/Words.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v2.1 — the "accent" part is cut-out ransom letters (collage v7);
 *              v2.0 — caps: display titles set plain words in Mtavruli
 * Description: Splits text into words so CSS can scrub them in one by one with the
 *              scroll. Pure markup; the motion lives in globals.css under `.words`.
 *              Screen readers get the plain (Mkhedruli) text.
 *              parts: plain strings, or [text, className] — e.g. "accent" for the
 *              serif voice word. `caps` turns plain parts into Mtavruli capitals;
 *              classed parts keep their own lettering.
 */
import { Ransom } from "./Ransom";
import { toMtavruli } from "@/lib/mtavruli.ts";

type Part = string | [string, string];

export function Words({ parts, caps = false }: { parts: Part[]; caps?: boolean }) {
  let i = 0;
  const plain = parts.map((p) => (typeof p === "string" ? p : p[0])).join("");
  return (
    <span className="words">
      <span className="sr-only">{plain}</span>
      {parts.flatMap((p, pi) => {
        const [text, cls] = typeof p === "string" ? [p, ""] : p;
        // a styled part stays one piece, so "ვერ იყიდი" moves as one phrase
        if (cls === "accent") return [<span key={`${pi}`} className="w accent" style={{ ["--w" as string]: i++ }} aria-hidden="true"><Ransom text={text} decorative /></span>];   // collage v7: the accent word is cut out of magazines
        if (cls) return [<span key={`${pi}`} className={`w ${cls}`} style={{ ["--w" as string]: i++ }} aria-hidden="true">{text}</span>];
        return (caps ? toMtavruli(text) : text).split(/(\s+)/).filter(Boolean).map((w, wi) =>
          /^\s+$/.test(w) ? w : (
            <span key={`${pi}-${wi}`} className={cls ? `w ${cls}` : "w"} style={{ ["--w" as string]: i++ }} aria-hidden="true">{w}</span>
          ),
        );
      })}
    </span>
  );
}
