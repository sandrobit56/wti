"use client";
/**
 * File:        components/PersonaSection.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-27
 * Version:     v3.1 — Figma 211:8: test + "12 პერსონა" buttons side by side, clouds bottom-left; v3 — same layout as "სად შეჭამ?": text + one button left, one card right;
 *              no deck, no statues, no herbs (Sandro: the section was overloaded).
 *              Figma v8: cards face up (tamada on top of world + sushi); one-strip title; no emoji; v1.0 — replaces PersonaTeaser (title + text + 2 buttons + a fan of 3 cards
 *              competed for attention, per Sandro's review)
 * Description: Section "პერსონა" with one object: the fate deck. Before the quiz the top card
 *              lies face down ("ბედმა იცის, შენ — ჯერ არა"); tapping the deck or the one button
 *              starts the 7-question quiz. After the quiz the top card is turned: your persona,
 *              its line, and "ტესტი თავიდან". The 12-card gallery is a quiet text link.
 */
import type { Persona } from "@/lib/personas.ts";
import Image from "next/image";
import { Lines } from "./Lines";

type Props = { persona: Persona | null; onStart: () => void; onGallery: () => void };

export function PersonaSection({ persona, onStart, onGallery }: Props) {
  return (
    <section className="persona9 sect" id="persona" aria-labelledby="persona-title">
      <Lines kind="card" />
      <div className="persona9__clouds" aria-hidden="true"><Image src="/collage/clouds-soft.webp" alt="" width={1600} height={406} sizes="969px" /></div>
      <div className="persona9__card">
        <div className="persona9__text">
          <h2 id="persona-title" className="title9">{persona ? "შენ ხარ ეს" : "გაიგე შენი პერსონა"}</h2>
          <p className="lead9 lead9--left">{persona ? persona.line : "7 კითხვა, ერთი წუთი და ბორბალი შენს კუჭზე მოირგება."}</p>
          <div className="persona9__btns">
            <button className="btn9" onClick={onStart}>{persona ? "ტესტი თავიდან" : "გაიარე ტესტი"}</button>
            <button className="btn9 btn9--light" onClick={onGallery}>12 პერსონა</button>
          </div>
        </div>
        <button type="button" className="persona9__tarot" onClick={persona ? onGallery : onStart}
          aria-label={persona ? `${persona.name} — ნახე 12-ვე ბარათი` : "ტესტის დაწყება"}>
          {/* Figma 211:8: just the card art, tilted +3°, soft shadow (the name lives in the 12-card gallery) */}
          <Image className="persona9__art" src={`/illustrations/personas/${persona?.id ?? "tamada"}.webp`} alt="" width={450} height={600} sizes="300px" />
        </button>
      </div>
    </section>
  );
}
