/**
 * File:        components/PersonaGallery.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v2.0 — tarot deck: 12 illustrated cards dealt in, tap flips a card
 *              to its back (line, signature dishes → places, habit tag)
 * Description: "12 პერსონა" in the shared Sheet. The user's persona is marked and
 *              dealt first. SIGNATURE is exported — the game and teaser reuse it.
 */
"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { DISHES } from "@/lib/catalog.ts";
import { PERSONA_IDS, type PersonaId } from "@/lib/quiz.ts";
import { PERSONAS } from "@/lib/personas.ts";
import { DishTag } from "./DishTag";
import { Sheet } from "./Sheet";
import { TarotCard } from "./TarotCard";

/** Hand-picked signature dishes per persona (validated against the catalogue below). */
export const SIGNATURE: Record<PersonaId, string[]> = {
  tamada: ["mtsvadi", "khachapuri", "satsivi"],
  khinkali: ["khinkali", "pelmeni", "dumplings-asian"],
  bakery: ["lobiani", "khachapuri", "mchadi"],
  grandma: ["chakapuli", "chakhokhbili", "elarji"],
  green: ["pkhali", "lobio", "badrijani"],
  spice: ["kharcho", "ostri", "kupati"],
  mtsvadi: ["mtsvadi", "kupati", "shkmeruli"],
  shawarma: ["shawarma", "doner", "hot-dog"],
  sushi: ["sushi", "ramen", "poke"],
  lunch: ["salad-bowl", "soup", "sandwich"],
  brunch: ["brunch", "syrniki", "cake"],
  world: ["tacos", "pad-thai", "curry"],
};
const NAME = new Map(DISHES.map((d) => [d.slug, d.name]));
for (const [p, slugs] of Object.entries(SIGNATURE)) for (const s of slugs) if (!NAME.has(s)) throw new Error(`PersonaGallery: ${p} → unknown dish "${s}"`);

/** Back of a gallery card: what this persona means for the wheel. */
export function PersonaBack({ id, onDish }: { id: PersonaId; onDish: (slug: string) => void }) {
  const p = PERSONAS[id];
  return (
    <div className="pback">
      <strong className="pback__name">{p.name}</strong>
      <span className="pback__line">{p.line}</span>
      <span className="pback__dishes">{SIGNATURE[id].map((slug) => <DishTag key={slug} slug={slug} onOpen={onDish} />)}</span>
      <span className={p.georgianHabit ? "pc__tag" : "pc__tag pc__tag--world"}>{p.georgianHabit ? "ქართული ჩვევა" : "ქალაქის რიტმი"}</span>
    </div>
  );
}

export function PersonaGallery({ current, onClose, onStart, onDish }: { current: PersonaId | null; onClose: () => void; onStart: () => void; onDish: (slug: string) => void }) {
  const [open, setOpen] = useState<PersonaId | null>(null);
  const reduce = useReducedMotion();
  const order = current ? [current, ...PERSONA_IDS.filter((x) => x !== current)] : PERSONA_IDS;

  return (
    <Sheet
      className="gallery"
      labelledBy="gallery-title"
      onClose={onClose}
      footer={<button className="btn" onClick={onStart}>{current ? "ტესტი თავიდან" : "გაიარე ტესტი — 1 წუთი"}</button>}
    >
      <header>
        <p className="caps">12 პერსონა</p>
        <h2 id="gallery-title" className="gallery__title">ვინ ხარ სუფრასთან?</h2>
        <p className="gallery__lead">შეეხე ბარათს და გადააბრუნე.</p>
      </header>
      <ul className="gallery__deck">
        {order.map((id, i) => (
          <motion.li
            key={id}
            initial={reduce ? false : { y: 80, rotate: (i % 2 ? 1 : -1) * (6 + (i % 3) * 3), scale: 0.8 }}
            animate={{ y: 0, rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.15 + i * 0.05 }}
          >
            <TarotCard
              id={id}
              size="md"
              me={id === current}
              flipped={open === id}
              onFlip={() => setOpen((o) => (o === id ? null : id))}
              back={<PersonaBack id={id} onDish={onDish} />}
            />
          </motion.li>
        ))}
      </ul>
    </Sheet>
  );
}
