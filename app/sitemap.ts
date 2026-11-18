/**
 * File:        app/sitemap.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-19
 * Version:     v1.0
 * Description: sitemap.xml — the two public pages.
 */
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site.ts";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
