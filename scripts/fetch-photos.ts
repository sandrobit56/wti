/**
 * File:        scripts/fetch-photos.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-16
 * Version:     v1.0
 * Description: Builds public/photos/* + data/photos.json from Wikimedia Commons.
 *   1. Every `wiki` title in lib/variants.ts (types + variants) → English Wikipedia
 *      lead image (prop=pageimages).
 *   2. That file is looked up ON COMMONS. Files that live only on en.wikipedia
 *      (usually non-free "fair use") are skipped.
 *   3. Only CC0 / Public domain / CC BY / CC BY-SA are kept; author, license and
 *      source page are stored and shown under every photo (attribution = the license
 *      condition). GFDL-only and NC/ND licenses are skipped.
 *   4. A 640px thumbnail is downloaded into public/photos/.
 * Runs in GitHub Actions (internet). Locally: node scripts/fetch-photos.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { TYPE_WIKI, VARIANTS } from "../lib/variants.ts";

const UA = "WTI-photo-fetch/1.0 (https://github.com/sandrobit56/wti; open-licensed dish photos)";
const ALLOWED = /^(cc0|public domain|pd\b|pd-|cc by(-sa)? \d)/i;
const WIDTH = 640;

type Photo = { src: string; author: string; license: string; licenseUrl: string | null; source: string };

async function api(host: string, params: Record<string, string>) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: "json", formatversion: "2", ...params });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${host} ${res.status}: ${await res.text()}`);
  return res.json();
}

const chunks = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const strip = (html: string) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const fileSafe = (s: string) => s.normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(0, 80);

async function main() {
  const titles = [...new Set([...Object.values(TYPE_WIKI), ...VARIANTS.flatMap((v) => (v.wiki ? [v.wiki] : []))])];
  console.log(`${titles.length} Wikipedia titles`);

  // 1. title → lead image file name (following redirects / normalization)
  const fileOf = new Map<string, string>();
  for (const batch of chunks(titles, 50)) {
    const j = await api("en.wikipedia.org", { action: "query", prop: "pageimages", piprop: "name", redirects: "1", titles: batch.join("|") });
    const alias = new Map<string, string>();
    for (const n of [...(j.query.normalized ?? []), ...(j.query.redirects ?? [])]) alias.set(n.from, n.to);
    const final = (t: string) => { let x = t; for (let i = 0; i < 3 && alias.has(x); i++) x = alias.get(x)!; return x; };
    const image = new Map<string, string>();
    for (const p of j.query.pages) if (p.pageimage) image.set(p.title, p.pageimage);
    for (const t of batch) { const f = image.get(final(t)); if (f) fileOf.set(t, f); }
  }

  // 2+3. file → Commons metadata, license filter
  const files = [...new Set(fileOf.values())];
  const meta = new Map<string, Omit<Photo, "src"> & { thumb: string }>();
  for (const batch of chunks(files, 40)) {
    const j = await api("commons.wikimedia.org", {
      action: "query", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: String(WIDTH),
      titles: batch.map((f) => `File:${f}`).join("|"),
    });
    for (const p of j.query.pages) {
      const info = p.imageinfo?.[0];
      if (p.missing || !info?.thumburl) continue;                 // not on Commons → likely non-free
      const m = info.extmetadata ?? {};
      const license = strip(m.LicenseShortName?.value ?? "");
      if (!ALLOWED.test(license)) { console.log(`skip (license "${license}"): ${p.title}`); continue; }
      meta.set(p.title.replace(/^File:/, "").replace(/_/g, " "), {
        thumb: info.thumburl,
        author: strip(m.Artist?.value ?? "") || "Unknown author",
        license,
        licenseUrl: m.LicenseUrl?.value ?? null,
        source: info.descriptionurl,
      });
    }
  }

  // 4. download
  await mkdir("public/photos", { recursive: true });
  const out: Record<string, Photo> = {};
  for (const t of titles) {
    const f = fileOf.get(t);
    const m = f ? meta.get(f.replace(/_/g, " ")) : undefined;
    if (!m) { console.log(`no open photo: ${t}`); continue; }
    const ext = (m.thumb.match(/\.(jpe?g|png|webp)(?:$|\?)/i)?.[1] ?? "jpg").toLowerCase();
    const name = `${fileSafe(t)}.${ext}`;
    const res = await fetch(m.thumb, { headers: { "User-Agent": UA } });
    if (!res.ok) { console.log(`download failed ${res.status}: ${t}`); continue; }
    await writeFile(`public/photos/${name}`, Buffer.from(await res.arrayBuffer()));
    out[t] = { src: `/photos/${name}`, author: m.author, license: m.license, licenseUrl: m.licenseUrl, source: m.source };
  }

  const kept = Object.keys(out).length;
  console.log(`kept ${kept}/${titles.length} photos`);
  if (kept < titles.length * 0.3) throw new Error(`only ${kept} photos — check the API responses before publishing`);
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile("data/photos.json", JSON.stringify(sorted, null, 1) + "\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
