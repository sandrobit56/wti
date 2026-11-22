/**
 * File:        lib/stickers.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0 — pilot set (9 Georgian dishes)
 * Description: Which dish types have an illustrated food sticker in public/stickers/<slug>.webp.
 *              The wheel shows the sticker when there is one and falls back to the flat icon
 *              otherwise. One list, so adding a sticker = drop the file + add the slug here.
 */
export const STICKERS: ReadonlySet<string> = new Set([
  "khinkali", "khachapuri", "mtsvadi", "georgian-sweets", "badrijani",
  "lobiani", "pkhali", "chakapuli", "shawarma",
]);

export const stickerSrc = (slug: string): string | null => (STICKERS.has(slug) ? `/stickers/${slug}.webp` : null);
