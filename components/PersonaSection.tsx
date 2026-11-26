"use client";
/**
 * File:        components/PersonaSection.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     Figma v8: cards face up (tamada on top of world + sushi); one-strip title; no emoji; v1.0 — replaces PersonaTeaser (title + text + 2 buttons + a fan of 3 cards
 *              competed for attention, per Sandro's review)
 * Description: Section "პერსონა" with one object: the fate deck. Before the quiz the top card
 *              lies face down ("ბედმა იცის, შენ — ჯერ არა"); tapping the deck or the one button
 *              starts the 7-question quiz. After the quiz the top card is turned: your persona,
 *              its line, and "ტესტი თავიდან". The 12-card gallery is a quiet text link.
 */
import type { Persona } from "@/lib/personas.ts";
import type { PersonaId } from "@/lib/quiz.ts";
import { TarotCard } from "./TarotCard";
import { Strip } from "./Strip";

type Props = { persona: Persona | null; onStart: () => void; onGallery: () => void };

/** Cards under the top one: just their backs show, fanned a little. */
const UNDER: PersonaId[] = ["world", "sushi"];   // Figma v8 deck: world left, sushi right, tamada on top

export function PersonaSection({ persona, onStart, onGallery }: Props) {
  return (
    <section className="persona2 sect" id="persona" aria-labelledby="persona-title">
      <div className="container persona2__inner">
        <h2 id="persona-title" className="section-title display persona2__title">
          <Strip text={persona ? "შენ ხარ ეს" : "გაიგე შენი პერსონა"} straight className="title-strip" />
        </h2>

        <button type="button" className="persona2__deck" onClick={persona ? onGallery : onStart}
          aria-label={persona ? `${persona.name} — ნახე 12-ვე ბარათი` : "გამოსცადე ბედი — ტესტის დაწყება"}>
          {UNDER.map((id, i) => (
            <span key={id} className="persona2__under" style={{ ["--i" as string]: i }} aria-hidden="true">
              <TarotCard id={id} size="md" tilt={false} />
            </span>
          ))}
          <span className="persona2__top">
            <TarotCard id={persona?.id ?? "tamada"} size="md" me={Boolean(persona)} tilt={false} />
          </span>
        </button>

        <p className="persona2__line">
          {persona ? persona.line : "7 კითხვა, ერთი წუთი — და ბორბალი შენს კუჭზე მოირგება."}
        </p>
        <button className="btn" onClick={onStart}>{persona ? "ტესტი თავიდან" : "გაიარე ტესტი"}</button>
        <button className="link persona2__all" onClick={onGallery}>ნახე 12-ვე პერსონა →</button>
      </div>
    </section>
  );
}
