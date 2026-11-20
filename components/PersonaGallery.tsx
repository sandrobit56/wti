/**
 * File:        components/PersonaGallery.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v1.0
 * Description: "12 პერსონა" — all personas in one dialog: icon, name, one-liner,
 *              Georgian/world habit tag, and real dishes from the catalogue that the
 *              persona boosts. The user's own persona (if the quiz was taken) is marked.
 *              Cards tilt on hover; CTA starts the quiz.
 */
"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { DISHES } from "@/lib/catalog.ts";
import { PERSONA_IDS, type PersonaId } from "@/lib/quiz.ts";
import { PERSONAS } from "@/lib/personas.ts";
import { DishTag } from "./DishTag";

/** Hand-picked signature dishes per persona (validated against the catalogue below). */
const SIGNATURE: Record<PersonaId, string[]> = {
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

export function PersonaGallery({ current, onClose, onStart, onDish }: { current: PersonaId | null; onClose: () => void; onStart: () => void; onDish: (slug: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal gallery"
      aria-labelledby="gallery-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal__card">
        <button className="modal__close" onClick={onClose} aria-label="დახურვა">×</button>
        <header>
          <p className="caps">12 პერსონა</p>
          <h2 id="gallery-title" className="gallery__title">ვინ ხარ სუფრასთან?</h2>
          <p className="gallery__lead">8 ქართულ ჩვევაზეა დაფუძნებული, 4 — ქალაქის ახალ რიტმზე. ტესტი ერთს აგირჩევს და ბორბალს მის გემოზე მოარგებს.</p>
        </header>
        <ul className="gallery__grid">
          {PERSONA_IDS.map((id, i) => {
            const p = PERSONAS[id];
            return (
              <li key={id} className={id === current ? "pc pc--me" : "pc"} style={{ ["--i" as string]: i }}>
                <span className="pc__ico"><Image src={`/icons/${p.icon}.svg`} alt="" width={44} height={44} /></span>
                <strong className="pc__name">{p.name}</strong>
                <span className="pc__line">{p.line}</span>
                <span className="pc__dishes">{SIGNATURE[id].map((slug) => <DishTag key={slug} slug={slug} onOpen={onDish} />)}</span>
                <span className={p.georgianHabit ? "pc__tag" : "pc__tag pc__tag--world"}>{p.georgianHabit ? "ქართული ჩვევა" : "ქალაქის რიტმი"}</span>
                {id === current && <span className="pc__me">შენ ✓</span>}
              </li>
            );
          })}
        </ul>
        <button className="pill pill--dark pill--block" onClick={onStart}>{current ? "ტესტი თავიდან" : "გაიარე ტესტი — 1 წუთი"}</button>
      </div>
    </dialog>
  );
}
