/**
 * File:        components/Strip.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-25
 * Version:     v1.0 — replaces components/Ransom.tsx (per-letter scraps read as noisy)
 * Description: A word or phrase cut out as ONE strip of paper and taped down (collage v7.1).
 *              The text stays real, selectable text in one font — only the paper around it
 *              is a collage. Shape comes from lib/strip.ts (seeded → hydration-safe).
 */
import type { CSSProperties } from "react";
import { strip, type Tone } from "@/lib/strip.ts";

type Props = {
  text: string;
  tone?: Tone;
  seed?: string;
  className?: string;
  as?: "span" | "p";
  /** true when the same words are already given to screen readers elsewhere */
  decorative?: boolean;
};

export function Strip({ text, tone = "paper", seed, className, as: Tag = "span", decorative = false }: Props) {
  const s = strip(seed ?? text);
  const style = { "--rot": `${s.rot.toFixed(2)}deg`, "--cut": s.clip, "--tape-rot": `${s.tapeRot.toFixed(1)}deg` } as CSSProperties;
  return (
    <Tag className={`strip strip--${tone} strip--tape-${s.tape}${className ? ` ${className}` : ""}`} style={style} aria-hidden={decorative || undefined}>
      <span className="strip__paper">{text}</span>
      <span className="strip__tape" aria-hidden="true" />
    </Tag>
  );
}
