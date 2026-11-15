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
import { RandomizerClient } from "@/components/RandomizerClient";

export default function Home() {
  return (
    <>
      <header className="header">
        <nav className="header__nav only-desktop" aria-label="მთავარი">
          <a href="#wheel">ბორბალი</a>
          <a href="#persona">ტესტი</a>
          <a href="#paths">ადგილები</a>
        </nav>
        <a href="#wheel" className="header__logo" aria-label="რა ვჭამოთ? — მთავარი">
          <Image src="/logo.svg" alt="რა ვჭამოთ?" width={61} height={57} priority />
        </a>
        <nav className="header__nav header__nav--right" aria-label="დამატებითი">
          <a className="only-desktop" href="#paths">ბლოგი</a>
          <a className="only-desktop" href="#trust">როგორ ვაფასებთ</a>
          <span className="header__user" title="პროფილი — მალე" aria-label="პროფილი (მალე)">
            <Image src="/icons/user.svg" alt="" width={24} height={24} />
          </span>
        </nav>
      </header>

      <main>
        <RandomizerClient />
      </main>

      <footer className="footer">
        <div className="footer__row container">
          <Image src="/logo.svg" alt="რა ვჭამოთ?" width={48} height={45} />
          <p>რესტორნები რეიტინგს ვერ ყიდულობენ · 2026</p>
        </div>
        <p className="footer__legal container">
          ადგილების მონაცემები: ©{" "}
          <a href="https://docs.overturemaps.org/attribution/" target="_blank" rel="noreferrer">Overture Maps Foundation</a>
          {" "}(CDLA-Permissive-2.0, Apache-2.0, CC0 — წყარო მითითებულია თითო ადგილზე). რუკა და მარშრუტი იხსნება Google Maps-ში.
          Wolt, Glovo და Bolt Food დამოუკიდებელი სერვისებია — მათ გვერდებზე გადაგიყვანთ, მენიუებს არ ვინახავთ. ფასები სავარაუდოა.
        </p>
      </footer>

      <nav className="tabbar only-mobile" aria-label="ნავიგაცია">
        <a href="#wheel" className="on"><HomeIcon />მთავარი</a>
        <a href="#paths"><PinIcon />ადგილები</a>
        <a href="#paths"><BookIcon />ბლოგი</a>
        <span aria-disabled="true"><UserIcon />პროფილი</span>
      </nav>
    </>
  );
}

const HomeIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" fill="currentColor" /></svg>;
const PinIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="currentColor" /></svg>;
const BookIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5c3-1 6-1 9 1v14c-3-2-6-2-9-1zm18 0c-3-1-6-1-9 1v14c3-2 6-2 9-1z" fill="currentColor" /></svg>;
const UserIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.5" fill="currentColor" /><path d="M3 21c0-4.4 4-7 9-7s9 2.6 9 7z" fill="currentColor" /></svg>;
