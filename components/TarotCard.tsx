/**
 * File:        components/TarotCard.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v1.0
 * Description: A persona as a tarot card (illustrations: public/illustrations/personas,
 *   drawn in Figma, file "WTI — ვიზუალური ენა v4").
 *   - FRONT: the archetype illustration + name on a ribbon banner.
 *   - BACK: whatever the caller passes (persona details, dish tags) — or, by
 *     default, the decorative card back (used for the quiz reveal).
 *   - 3D tilt follows the pointer (springs), with a soft shine; tap flips.
 *   - The hidden face is `inert`, so keyboard/screen readers only reach the
 *     visible side. Reduced motion: no tilt, flip is instant (CSS).
 */
"use client";

import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent, ReactNode } from "react";
import { PERSONAS } from "@/lib/personas.ts";
import type { PersonaId } from "@/lib/quiz.ts";

type Props = {
  id: PersonaId;
  flipped?: boolean;          // true = showing the back
  onFlip?: () => void;        // omit → the card can't be flipped by the user
  back?: ReactNode;
  size?: "sm" | "md" | "lg";
  me?: boolean;               // the user's own persona: brand ring + "შენ"
  tilt?: boolean;
  className?: string;
};

const WIDTH = { sm: 150, md: 220, lg: 280 } as const;

/** Decorative back: lavender pattern, mascot seal, stars. */
export function CardBack() {
  return (
    <div className="tarot__cover" aria-hidden="true">
      <Image src="/icons/mascot.svg" alt="" width={72} height={74} />
      <span className="tarot__cover-title">რა ვჭამოთ?</span>
    </div>
  );
}

export function TarotCard({ id, flipped = false, onFlip, back, size = "md", me = false, tilt = true, className }: Props) {
  const p = PERSONAS[id];
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 220, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 220, damping: 18 });
  const live = tilt && !reduce;

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!live || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
    e.currentTarget.style.setProperty("--sx", `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty("--sy", `${((e.clientY - r.top) / r.height) * 100}%`);
  }
  function leave() { mx.set(0.5); my.set(0.5); }

  return (
    <motion.div
      className={`tarot tarot--${size}${me ? " tarot--me" : ""}${flipped ? " is-flipped" : ""}${className ? ` ${className}` : ""}`}
      style={{ width: WIDTH[size], rotateX: live ? rx : 0, rotateY: live ? ry : 0, transformPerspective: 900 }}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      <div className="tarot__inner">
        <div className="tarot__face tarot__front" inert={flipped}>
          <Image src={`/illustrations/personas/${id}.webp`} alt={p.name} width={450} height={600} sizes={`${WIDTH[size]}px`} />
          <span className="tarot__banner">{p.name}</span>
          {me && <span className="tarot__me">შენ ✓</span>}
          {onFlip && <button type="button" className="tarot__hit" onClick={onFlip} aria-label={`${p.name} — დეტალები`} />}
          <span className="tarot__shine" aria-hidden="true" />
        </div>
        <div className="tarot__face tarot__back" inert={!flipped}>
          {back ?? <CardBack />}
          {onFlip && back && <button type="button" className="tarot__turn" onClick={onFlip} aria-label="ბარათის შემობრუნება">↺</button>}
        </div>
      </div>
    </motion.div>
  );
}
