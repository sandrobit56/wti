/**
 * File:        next.config.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v1.1 — security headers
 * Description: Next.js config + HTTP security headers on every response.
 *   CSP follows the Next 16 guide "Without Nonces" (node_modules/next/dist/docs/
 *   01-app/02-guides/content-security-policy.md). Nonces would force every page to
 *   render dynamically (no CDN cache); we have no accounts, forms or user content
 *   yet, so 'unsafe-inline' for Next's own bootstrap scripts is the accepted trade.
 *   Revisit (switch to proxy.ts + nonce) when login / user content arrives.
 *   Allowed outside origins — only what the app really uses:
 *     frame-src   www.google.com        (Maps Embed iframe in the popup)
 *   Everything else (icons, photos, fonts, API) is served from our own origin.
 */
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // HTTPS only, for two years, subdomains included
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // no MIME sniffing, no framing of our pages (clickjacking), no window.opener leaks
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // send only our origin to other sites — Google's key restriction needs exactly that, nothing more
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // device features: only geolocation, only for us; everything else off
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false, // don't advertise the framework
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // API answers are personal (location-based) — never cached by browsers or CDNs
      { source: "/api/(.*)", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
