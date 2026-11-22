/**
 * File:        components/Wheel3DDemo.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v0.1 — prototype harness
 * Description: Client-only harness for the 3D wheel prototype: picks 8 dishes, loads the
 *              three.js scene lazily (no SSR — WebGL needs a browser) and shows the result.
 */
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { DISHES } from "@/lib/catalog.ts";
import type { View, WheelDish } from "./Wheel3D";

const Wheel3D = dynamic(() => import("./Wheel3D").then((m) => m.Wheel3D), { ssr: false, loading: () => <div className="wheel3d wheel3d--loading" /> });

const PICK = ["khinkali", "khachapuri", "mtsvadi", "badrijani", "pkhali", "burger", "lobio", "chakhokhbili"];

export function Wheel3DDemo() {
  const dishes: WheelDish[] = PICK.map((slug) => {
    const d = DISHES.find((x) => x.slug === slug);
    if (!d) throw new Error(`Wheel3DDemo: unknown dish slug "${slug}"`);
    return { slug: d.slug, name: d.name };
  });
  const [won, setWon] = useState<WheelDish | null>(null);
  // compare camera angles: /wheel-3d?elev=30&fov=16
  const [view] = useState<View | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const q = new URLSearchParams(window.location.search);
    const elev = Number(q.get("elev")), fov = Number(q.get("fov"));
    return elev && fov ? { elev, fov } : undefined;
  });
  return (
    <main className="wheel3d-page">
      <p className="wheel3d-page__note">3D ბორბალი · პროტოტიპი — დააჭირე ცენტრს</p>
      <div className="wheel3d-page__stage"><Wheel3D dishes={dishes} onLanded={setWon} view={view} /></div>
      <p className="wheel3d-page__result" aria-live="polite">{won ? `დღეს: ${won.name}` : " "}</p>
    </main>
  );
}
