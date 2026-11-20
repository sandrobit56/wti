/**
 * File:        scripts/fetch-unsplash.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-20
 * Version:     v1.0
 * Description: Fills photo gaps (versions / types with no Wikimedia Commons photo)
 *   from Unsplash → data/unsplash.json. Follows the Unsplash API Guidelines:
 *   - HOTLINK: we store the API's image URL (images.unsplash.com, ixid kept) and
 *     the browser loads it from Unsplash — nothing is downloaded into the repo;
 *   - DOWNLOAD EVENT: when a photo is selected for a dish we call its
 *     links.download_location once (our "user inserts a photo" moment);
 *   - ATTRIBUTION: photographer name + profile link + Unsplash link are stored and
 *     shown on the photo (components/ResultModal.tsx).
 *   Trust: a candidate is kept only if its caption contains a word from
 *   TYPE_KW[type]; never the same photo twice; ids in data/unsplash-blocklist.json
 *   are never used. A key stored as null = "no relevant photo" (not retried; delete
 *   the key to retry). To swap a bad photo: add its id to the blocklist + delete the key.
 *   Demo apps get 50 requests/hour → resumable, MAX_REQUESTS per run (hourly cron).
 *
 *   UNSPLASH_ACCESS_KEY (GitHub secret) required. `--check` validates the query
 *   table offline (no key, no network) — used by the unit tests too.
 */
import { readFile, writeFile } from "node:fs/promises";
import { TYPE_WIKI, VARIANTS } from "../lib/variants.ts";
import { DISHES } from "../lib/catalog.ts";
import { QUERY, TYPE_KW } from "./unsplash-queries.ts";

export type UnsplashPhoto = { id: string; src: string; author: string; authorUrl: string; page: string; alt: string };

const OUT = new URL("../data/unsplash.json", import.meta.url);
const BLOCK = new URL("../data/unsplash-blocklist.json", import.meta.url);
const COMMONS = new URL("../data/photos.json", import.meta.url);
const UTM = "utm_source=wti&utm_medium=referral";
const MAX_REQUESTS = Number(process.env.MAX_REQUESTS ?? 45);

/** Keys that need an Unsplash photo: versions without a Commons photo + types without one. */
export function neededKeys(commons: Record<string, unknown>): string[] {
  const types = DISHES.filter((d) => !commons[TYPE_WIKI[d.slug]]).map((d) => `type:${d.slug}`);
  const versions = VARIANTS.filter((v) => !(v.wiki && commons[v.wiki])).map((v) => v.slug);
  return [...types, ...versions];
}

export function typeOfKey(key: string): string {
  return key.startsWith("type:") ? key.slice(5) : key.split("/")[0];
}

/** Offline consistency check: every needed key has a query and its type has keywords. */
export function check(commons: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const needed = new Set(neededKeys(commons));
  for (const k of needed) {
    if (!QUERY[k]) errors.push(`no query: ${k}`);
    if (!TYPE_KW[typeOfKey(k)]) errors.push(`no keywords for type: ${typeOfKey(k)}`);
  }
  const known = new Set([...VARIANTS.map((v) => v.slug), ...DISHES.map((d) => `type:${d.slug}`)]);
  for (const k of Object.keys(QUERY)) if (!known.has(k)) errors.push(`query for unknown key: ${k}`);
  return errors;
}

export function relevant(caption: string, type: string): boolean {
  const c = caption.toLowerCase();
  return TYPE_KW[type].some((w) => c.includes(w));
}

type ApiPhoto = { id: string; alt_description: string | null; description: string | null; urls: { raw: string }; links: { html: string; download_location: string }; user: { name: string; links: { html: string } } };

async function main() {
  const commons = JSON.parse(await readFile(COMMONS, "utf8"));
  if (process.argv.includes("--check")) {
    const errors = check(commons);
    if (errors.length) throw new Error(errors.join("\n"));
    console.log(`ok: ${neededKeys(commons).length} keys covered`);
    return;
  }
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error("UNSPLASH_ACCESS_KEY is not set (GitHub → Settings → Secrets → Actions)");
  const errors = check(commons);
  if (errors.length) throw new Error(errors.join("\n"));

  const out: Record<string, UnsplashPhoto | null> = JSON.parse(await readFile(OUT, "utf8").catch(() => "{}"));
  const block = new Set<string>(JSON.parse(await readFile(BLOCK, "utf8").catch(() => "[]")));
  const used = new Set(Object.values(out).flatMap((p) => (p ? [p.id] : [])));
  const todo = neededKeys(commons).filter((k) => !(k in out));
  console.log(`${todo.length} keys to do, budget ${MAX_REQUESTS} requests`);

  let requests = 0;
  const api = async (url: string) => {
    requests++;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" } });
    if (res.status === 403 || res.status === 429) return null; // rate limit: stop, resume next run
    if (!res.ok) throw new Error(`Unsplash ${res.status}: ${await res.text()}`);
    return res.json();
  };

  for (const k of todo) {
    if (requests + 2 > MAX_REQUESTS) break;
    const params = new URLSearchParams({ query: QUERY[k], per_page: "15", orientation: "landscape", content_filter: "high" });
    const j = await api(`https://api.unsplash.com/search/photos?${params}`);
    if (!j) { console.log("rate limited — stopping"); break; }
    const type = typeOfKey(k);
    const pick = (j.results as ApiPhoto[]).find((p) => !used.has(p.id) && !block.has(p.id) && relevant(`${p.alt_description ?? ""} ${p.description ?? ""}`, type));
    if (!pick) { out[k] = null; console.log(`– ${k}: no relevant photo`); continue; }
    const ev = await api(pick.links.download_location); // download event (guideline)
    if (!ev) { console.log("rate limited — stopping"); break; }
    used.add(pick.id);
    out[k] = {
      id: pick.id,
      src: `${pick.urls.raw}&w=720&h=480&fit=crop&q=70&auto=format`,
      author: pick.user.name,
      authorUrl: `${pick.user.links.html}?${UTM}`,
      page: `${pick.links.html}?${UTM}`,
      alt: pick.alt_description ?? "",
    };
    console.log(`✓ ${k}: ${pick.id} — ${pick.alt_description}`);
  }
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(OUT, JSON.stringify(sorted, null, 1) + "\n");
  console.log(`done: ${requests} requests, ${Object.values(out).filter(Boolean).length} photos, ${neededKeys(commons).filter((k) => !(k in out)).length} left`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
