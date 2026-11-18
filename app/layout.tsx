/**
 * File:        app/layout.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0
 * Description: Root layout. Noto Sans Georgian (variable: weight + width) is
 *              self-hosted from npm — no request to Google Fonts.
 */
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-georgian/standard.css";
import "./globals.css";
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

export const viewport: Viewport = { themeColor: "#f5a3b1" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ka">
      <body>{children}</body>
    </html>
  );
}
