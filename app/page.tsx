/**
 * File:        app/page.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v2.0 — Figma L1 (desktop) / L2 (mobile) structure
 * Description: Landing = the wheel. Header (nav · logo · nav), the interactive
 *              page body (client-only), footer with data attribution, and the
 *              mobile tab bar. Links to pages that don't exist yet are marked "მალე".
 */
import Image from "next/image";
import Link from "next/link";
import { RandomizerClient } from "@/components/RandomizerClient";
import { SiteHeader, SiteTabbar } from "@/components/SiteNav";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        <RandomizerClient />
      </main>

      <footer className="footer">
        <div className="footer__row container">
          <Image src="/logo.svg" alt="რა ვჭამოთ?" width={48} height={45} />
          <Link href="/privacy" className="footer__link">კონფიდენციალურობა</Link>
        </div>
      </footer>

      <SiteTabbar />
    </>
  );
}
