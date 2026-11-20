/**
 * File:        lib/creatures.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v1.0
 * Description: The googly-eyed food creatures (public/illustrations/creatures/*.webp,
 *              drawn in Figma "WTI — ვიზუალური ენა v4") and the dish each one stands
 *              for. Used by the yellow ribbon and the game; validated at load.
 */
import { DISHES } from "./catalog.ts";

export const CREATURES = [
  { name: "khinkali", dish: "khinkali" },
  { name: "chili", dish: "ostri" },
  { name: "pizza", dish: "pizza" },
  { name: "sushi", dish: "sushi" },
  { name: "churchkhela", dish: "georgian-sweets" },
  { name: "cupcake", dish: "cake" },
] as const;

for (const c of CREATURES) if (!DISHES.some((d) => d.slug === c.dish)) throw new Error(`creatures: ${c.name} → unknown dish ${c.dish}`);

/** dish slug → creature image path, for dishes that have a creature. */
export const CREATURE_OF: ReadonlyMap<string, string> = new Map(CREATURES.map((c) => [c.dish, `/illustrations/creatures/${c.name}.webp`]));
