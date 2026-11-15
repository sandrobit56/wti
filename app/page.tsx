/**
 * File:        app/page.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0 — phase 1: randomizer only
 * Description: Landing = the wheel. Server component; the interactive part lives
 *              in <Randomizer/>. Footer carries the data attribution.
 */
import Image from "next/image";
import { RandomizerClient } from "@/components/RandomizerClient";

export default function Home() {
  return (
    <>
      <header className="header">
        <Image src="/logo.svg" alt="რა ვჭამოთ?" width={61} height={57} priority />
      </header>
      <main>
        <RandomizerClient />
      </main>
      <footer className="footer">
        <p>
          ადგილების მონაცემები: ©{" "}
          <a href="https://docs.overturemaps.org/attribution/" target="_blank" rel="noreferrer">Overture Maps Foundation</a>
          {" "}(CDLA-Permissive-2.0, Apache-2.0, CC0 — წყარო მითითებულია თითო ადგილზე). რუკა და მარშრუტი იხსნება Google Maps-ში.
        </p>
        <p>Wolt, Glovo და Bolt Food დამოუკიდებელი სერვისებია; ჩვენ მხოლოდ მათ გვერდებზე გადაგიყვანთ.</p>
      </footer>
    </>
  );
}
