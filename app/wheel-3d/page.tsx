/**
 * File:        app/wheel-3d/page.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v0.1
 * Description: Prototype page for the three.js wheel. Not linked from the site, not indexed.
 */
import type { Metadata } from "next";
import { Wheel3DDemo } from "@/components/Wheel3DDemo";

export const metadata: Metadata = { title: "3D ბორბალი · პროტოტიპი", robots: { index: false, follow: false } };

export default function Page() {
  return <Wheel3DDemo />;
}
