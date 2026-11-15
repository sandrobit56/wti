/**
 * File:        components/RandomizerClient.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0
 * Description: Loads <Randomizer/> in the browser only. The wheel depends on
 *              Math.random, the clock and localStorage — none exist during SSR,
 *              so rendering it on the server would only produce a hydration mismatch.
 */
"use client";

import dynamic from "next/dynamic";

export const RandomizerClient = dynamic(() => import("./Randomizer").then((m) => m.Randomizer), {
  ssr: false,
  loading: () => (
    <section className="hero">
      <div className="hero__stage"><div className="wheel wheel--skeleton" aria-label="იტვირთება" /></div>
    </section>
  ),
});
