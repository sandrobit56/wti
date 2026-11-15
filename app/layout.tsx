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

export const metadata: Metadata = {
  title: "რა ვჭამოთ? — დაატრიალე და გადაწყვიტე",
  description: "ბორბალი გირჩევს კერძს, მერე გაჩვენებს, სად ჭამო ახლოს ან საიდან შეუკვეთო.",
  icons: { icon: "/logo.svg" },
};

export const viewport: Viewport = { themeColor: "#f5a3b1" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ka">
      <body>{children}</body>
    </html>
  );
}
