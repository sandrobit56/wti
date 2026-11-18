/**
 * File:        app/manifest.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-19
 * Version:     v1.0
 * Description: Web app manifest — "Add to Home Screen" opens the wheel full-screen.
 */
import type { MetadataRoute } from "next";
import { SITE_DESC, SITE_NAME } from "@/lib/site.ts";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESC,
    start_url: "/",
    display: "standalone",
    background_color: "#f4f4f4",
    theme_color: "#f5a3b1",
    lang: "ka",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
