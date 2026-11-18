/**
 * File:        components/ClearData.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v1.0
 * Description: "წაშალე ჩემი მონაცემები" — removes every localStorage key this app
 *              owns (prefix "wti:"), so the user can reset everything in one tap.
 */
"use client";

import { useState } from "react";

export const STORAGE_PREFIX = "wti:";

export function ClearData() {
  const [done, setDone] = useState<number | null>(null);
  function clear() {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
      keys.forEach((k) => localStorage.removeItem(k));
      setDone(keys.length);
    } catch {
      setDone(0); // storage disabled → nothing was stored
    }
  }
  return (
    <p className="privacy__clear">
      <button type="button" className="pill pill--dark" onClick={clear}>წაშალე ჩემი მონაცემები</button>
      {done !== null && <span role="status">{done ? "წაიშალა. ამ ბრაუზერში ჩვენი აღარაფერი ინახება." : "ამ ბრაუზერში ჩვენი არაფერი ინახებოდა."}</span>}
    </p>
  );
}
