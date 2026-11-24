/**
 * File:        components/Float.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-25
 * Version:     v1.0
 * Description: A single real-food cut-out (chili, churchkhela, tarragon, pomegranate) that
 *              floats in a section and bobs slowly — the "objects in the air" layer of the
 *              collage. One or two per section at most, so the page stays light.
 *              Decorative: hidden from screen readers; still under reduced motion.
 */
import Image from "next/image";

export type FloatItem = "chili" | "churchkhela" | "tarragon" | "pomegranate";

const SIZES: Record<FloatItem, [number, number]> = {
  chili: [438, 423],
  churchkhela: [83, 600],
  tarragon: [529, 482],
  pomegranate: [384, 425],
};

export function Float({ item, className }: { item: FloatItem; className: string }) {
  const [w, h] = SIZES[item];
  return <Image className={`float float--${item} ${className}`} src={`/collage/${item}.webp`} alt="" aria-hidden="true" width={w} height={h} sizes="160px" />;
}
