/**
 * File:        components/Ransom.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-23
 * Version:     v1.0
 * Description: Ransom-note text (collage v7): every letter is a scrap cut from a different
 *              magazine (lib/ransom.ts). Screen readers get the plain text once; the scraps
 *              are decoration. Letters "paste in" one by one (CSS, --i) when they enter view.
 */
import type { CSSProperties } from "react";
import { CHIPS, ransom } from "@/lib/ransom.ts";

export function Ransom({ text, caps, seed, className, as: Tag = "span", decorative = false }: { text: string; caps?: number; seed?: string; className?: string; as?: "span" | "h1" | "h2" | "p"; decorative?: boolean }) {
  const letters = ransom(text, { caps, seed });
  // group letters per word so a line never breaks inside a word
  const words: { l: (typeof letters)[number]; i: number }[][] = [[]];
  letters.forEach((l, i) => { if (l.space) words.push([]); else words[words.length - 1].push({ l, i }); });
  let n = 0;
  return (
    <Tag className={className ? `ransom ${className}` : "ransom"} {...(decorative ? { "aria-hidden": true } : { "aria-label": text, role: Tag === "span" ? "img" : undefined })}>
      {words.filter((w) => w.length).map((w, wi) => (
        <span key={wi} className="ransom__word" aria-hidden="true">
          {w.map(({ l, i }) => {
            const c = CHIPS[l.chip];
            const style = {
              "--bg": c.bg, "--fg": c.fg, "--r": `${l.rot}deg`, "--dy": `${l.dy}em`, "--s": l.scale, "--i": n++,
              fontWeight: l.weight,
            } as CSSProperties;
            return <span key={i} className={`ransom__l ransom__l--${l.face} ransom__l--s${l.shape}${l.outline ? " ransom__l--outline" : ""}`} style={style}>{l.ch}</span>;
          })}
        </span>
      ))}
    </Tag>
  );
}
