/**
 * File:        components/DishTag.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-20
 * Version:     v1.0
 * Description: A dish shown as a tag is always a door: tap it → the dish popup with
 *              its versions, nearby places, Google map and Wolt / Glovo / Bolt Food.
 *              (User testing: "the persona's dishes should lead somewhere".)
 */
import Image from "next/image";
import { DISHES } from "@/lib/catalog.ts";

const BY_SLUG = new Map(DISHES.map((d) => [d.slug, d]));

export function DishTag({ slug, onOpen }: { slug: string; onOpen: (slug: string) => void }) {
  const d = BY_SLUG.get(slug);
  if (!d) throw new Error(`DishTag: unknown dish ${slug}`);
  return (
    <button type="button" className="dtag" onClick={() => onOpen(slug)} aria-label={`${d.name} — ადგილები და მიტანა`}>
      <Image src={`/icons/${d.icon}.svg`} alt="" width={18} height={18} />
      {d.name}
      <span className="dtag__go" aria-hidden="true">↗</span>
    </button>
  );
}
