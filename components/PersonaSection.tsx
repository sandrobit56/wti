"use client";
/**
 * File:        components/PersonaSection.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-27
 * Version:     v3 — same layout as "სად შეჭამ?": text + one button left, one card right;
 *              no deck, no statues, no herbs (Sandro: the section was overloaded).
 *              Figma v8: cards face up (tamada on top of world + sushi); one-strip title; no emoji; v1.0 — replaces PersonaTeaser (title + text + 2 buttons + a fan of 3 cards
 *              competed for attention, per Sandro's review)
 * Description: Section "პერსონა" with one object: the fate deck. Before the quiz the top card
 *              lies face down ("ბედმა იცის, შენ — ჯერ არა"); tapping the deck or the one button
 *              starts the 7-question quiz. After the quiz the top card is turned: your persona,
 *              its line, and "ტესტი თავიდან". The 12-card gallery is a quiet text link.
 */
import type { Persona } from "@/lib/personas.ts";
import { TarotCard } from "./TarotCard";

type Props = { persona: Persona | null; onStart: () => void; onGallery: () => void };

export function PersonaSection({ persona, onStart, onGallery }: Props) {
  return (
    <section className="persona9 sect" id="persona" aria-labelledby="persona-title">
      <div className="persona9__card">
        <div className="persona9__text">
          <h2 id="persona-title" className="title9">{persona ? "შენ ხარ ეს" : "გაიგე შენი პერსონა"}</h2>
          <p className="lead9 lead9--left">{persona ? persona.line : "7 კითხვა, ერთი წუთი — და ბორბალი შენს კუჭზე მოირგება."}</p>
          <button className="btn9" onClick={onStart}>{persona ? "ტესტი თავიდან" : "გაიარე ტესტი"}</button>
          <button className="link9" onClick={onGallery}>ნახე 12-ვე პერსონა →</button>
        </div>
        <button type="button" className="persona9__tarot" onClick={persona ? onGallery : onStart}
          aria-label={persona ? `${persona.name} — ნახე 12-ვე ბარათი` : "ტესტის დაწყება"}>
          <TarotCard id={persona?.id ?? "tamada"} size="md" me={Boolean(persona)} tilt={false} />
        </button>
      </div>
    </section>
  );
}
