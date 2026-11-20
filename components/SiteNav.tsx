/**
 * File:        components/SiteNav.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v1.2 — "თამაში" link; scroll-spy sections in page order (fixes "ადგილები"
 *              staying lit further down the page)
 *              v1.1 — one consistent link style (was: measured sliding pill)
 * Description: Header (desktop) + tab bar (mobile), made "alive":
 *   - scroll-spy: the section on screen is highlighted
 *   - every link (left and right) shares one hover/active style: a pill grows in
 *     behind the text — no measuring, no layout shift
 *   - header compacts with a soft shadow once you scroll
 *   - mascot logo wiggles on hover; tab icons bounce when they become active
 */
"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

type SectionId = "wheel" | "paths" | "game" | "persona" | "trust";
const LEFT: { id: SectionId; label: string }[] = [
  { id: "wheel", label: "ბორბალი" },
  { id: "paths", label: "ადგილები" },
  { id: "game", label: "თამაში" },
  { id: "persona", label: "ტესტი" },
];

/** Page order — the last section whose top passed the line wins. */
const SECTIONS: SectionId[] = ["wheel", "paths", "game", "persona", "trust"];

/**
 * Which section is under the 45% line of the screen. Scroll-based on purpose: the
 * sections are rendered client-side after the header mounts, so an observer set up
 * on mount would find nothing.
 */
function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>("wheel");
  useEffect(() => {
    let raf = 0;
    const check = () => {
      const line = window.innerHeight * 0.45;
      let cur: SectionId = "wheel";
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) cur = id;
      }
      setActive(cur);
    };
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    const t = window.setTimeout(check, 800); // after the client-only sections have mounted
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return active;
}

function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return scrolled;
}

export function SiteHeader() {
  const active = useActiveSection();
  const scrolled = useScrolled();

  return (
    <header className={scrolled ? "header header--scrolled" : "header"}>
      <nav className="header__nav nav-live only-desktop" aria-label="მთავარი">
        {LEFT.map((l) => (
          <a key={l.id} data-id={l.id} href={`#${l.id}`} className={active === l.id ? "on" : undefined} aria-current={active === l.id ? "true" : undefined}>
            {l.label}
          </a>
        ))}
      </nav>
      <a href="#wheel" className="header__logo" aria-label="რა ვჭამოთ? — მთავარი">
        <Image src="/logo.svg" alt="რა ვჭამოთ?" width={61} height={57} priority />
      </a>
      <nav className="header__nav header__nav--right nav-live" aria-label="დამატებითი">
        <a className={`only-desktop${active === "trust" ? " on" : ""}`} href="#trust">როგორ ვაფასებთ</a>
        <span className="only-desktop nav-live__soon" title="მალე">ბლოგი<sup>მალე</sup></span>
        <span className="header__user" title="პროფილი — მალე" role="img" aria-label="პროფილი (მალე)">
          <Image src="/icons/user.svg" alt="" width={24} height={24} />
        </span>
      </nav>
    </header>
  );
}

export function SiteTabbar() {
  const active = useActiveSection();
  const tab = (id: SectionId, label: string, icon: ReactNode) => (
    <a href={`#${id}`} className={active === id ? "on" : undefined} aria-current={active === id ? "true" : undefined}>
      <span className="tabbar__ico">{icon}</span>
      {label}
    </a>
  );
  return (
    <nav className="tabbar only-mobile" aria-label="ნავიგაცია">
      {tab("wheel", "ბორბალი", <HomeIcon />)}
      {tab("paths", "ადგილები", <PinIcon />)}
      {tab("game", "თამაში", <GameIcon />)}
      {tab("persona", "ტესტი", <SparkIcon />)}
      <span aria-disabled="true"><span className="tabbar__ico"><UserIcon /></span>პროფილი</span>
    </nav>
  );
}

const HomeIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" fill="currentColor" /></svg>;
const PinIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="currentColor" /></svg>;
const SparkIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" fill="currentColor" /></svg>;
const GameIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12 21.5 6.5A11 11 0 1 0 21.5 17.5z" fill="currentColor" /></svg>;
const UserIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.5" fill="currentColor" /><path d="M3 21c0-4.4 4-7 9-7s9 2.6 9 7z" fill="currentColor" /></svg>;
