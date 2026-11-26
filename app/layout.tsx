/**
 * File:        app/layout.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v2.0 — three faces: Google Sans (body), Noto Sans Georgian (display),
 *              Noto Serif Georgian (voice word)
 * Description: Root layout. All fonts are variable and self-hosted from npm — no
 *              request to Google Fonts. Browsers only fetch the unicode ranges a page uses.
 */
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-georgian/standard.css";
import "@fontsource-variable/noto-serif-georgian";
import "@fontsource-variable/google-sans";
import "./globals.css";
import "./collage.css";   // collage art direction (v7)
import "./v8.css";        // Sandro's Figma v8 frame, 1:1
import "./v9.css";        // Sandro's simplified Figma frame 191:615 — loaded last
import { SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/site.ts";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — დაატრიალე და გადაწყვიტე`, template: `%s — ${SITE_NAME}` },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ka_GE", siteName: SITE_NAME, url: "/", title: `${SITE_NAME} — დაატრიალე და გადაწყვიტე`, description: SITE_DESC },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESC },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#f1435e" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ka">
      <body>{children}</body>
    </html>
  );
}
