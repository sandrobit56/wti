/**
 * File:        app/robots.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-19
 * Version:     v1.0
 * Description: robots.txt — pages are open to search engines, the API is not.
 */
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site.ts";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${SITE_URL}/sitemap.xml` };
}
