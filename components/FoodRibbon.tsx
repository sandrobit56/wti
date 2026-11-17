/**
 * File:        components/FoodRibbon.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-17
 * Version:     v1.0
 * Description: Decorative band between the wheel and the content: a row of dish
 *              stickers that slides sideways as you scroll, with the mascot "eating"
 *              its way along. Pure CSS scroll-driven animation (animation-timeline),
 *              no JS; browsers without support show a static band. aria-hidden.
 */
import Image from "next/image";

const ICONS = ["khinkali", "pizza", "sushi", "khachapuri", "burger", "noodles", "churchkhela", "taco", "salad", "mtsvadi", "cake", "fish", "shawarma", "icecream"];

export function FoodRibbon() {
  const row = [...ICONS, ...ICONS];
  return (
    <div className="ribbon" aria-hidden="true">
      <div className="ribbon__track">
        {row.map((icon, i) => (
          <span key={i} className="ribbon__item" style={{ ["--k" as string]: i % 4 }}>
            <Image src={`/icons/${icon}.svg`} alt="" width={44} height={44} />
          </span>
        ))}
      </div>
      <Image className="ribbon__mascot" src="/icons/mascot.svg" alt="" width={64} height={66} />
    </div>
  );
}
