/**
 * File:        lib/stickers.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v2.0 — full set: every dish type has a sticker (63)
 * Description: Illustrated 3D food stickers, public/stickers/<slug>.webp (256×256, die-cut,
 *              transparent). The wheel shows the sticker instead of the flat icon.
 *              One rule: a dish's sticker file is named after its slug. A missing file is a
 *              bug, so stickers.test.ts checks the folder against the catalogue.
 */
export const stickerSrc = (slug: string): string => `/stickers/${slug}.webp`;
