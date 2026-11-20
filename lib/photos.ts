/**
 * File:        lib/photos.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-20
 * Version:     v1.0
 * Description: One place that answers "which photo does this dish / version get?".
 *   Order: Wikimedia Commons (local file, data/photos.json) → Unsplash (hotlinked,
 *   data/unsplash.json) → none (the UI shows the dish icon). Each photo carries the
 *   credit its source requires.
 */
import commons from "../data/photos.json" with { type: "json" };
import unsplash from "../data/unsplash.json" with { type: "json" };
import { TYPE_WIKI, type Variant } from "./variants.ts";

type CommonsRow = { src: string; author: string; license: string; licenseUrl: string | null; source: string };
type UnsplashRow = { id: string; src: string; author: string; authorUrl: string; page: string; alt: string };

export type Photo =
  | { kind: "commons"; src: string; author: string; license: string; source: string }
  | { kind: "unsplash"; src: string; author: string; authorUrl: string; page: string };

const C = commons as Record<string, CommonsRow>;
const U = unsplash as Record<string, UnsplashRow | null>;

/** Unsplash requires a link back to Unsplash itself, tagged with our app name. */
export const UNSPLASH_HOME = "https://unsplash.com/?utm_source=wti&utm_medium=referral";

function fromCommons(title: string | null | undefined): Photo | null {
  const r = title ? C[title] : undefined;
  return r ? { kind: "commons", src: r.src, author: r.author, license: r.license, source: r.source } : null;
}
function fromUnsplash(key: string): Photo | null {
  const r = U[key];
  return r ? { kind: "unsplash", src: r.src, author: r.author, authorUrl: r.authorUrl, page: r.page } : null;
}

export function typePhoto(slug: string): Photo | null {
  return fromCommons(TYPE_WIKI[slug]) ?? fromUnsplash(`type:${slug}`);
}

export function variantPhoto(v: Variant): Photo | null {
  return fromCommons(v.wiki) ?? fromUnsplash(v.slug);
}
