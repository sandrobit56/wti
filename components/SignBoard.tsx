/**
 * File:        components/SignBoard.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-23
 * Version:     v1.0
 * Description: Client-only loader for the 3D sign (WebGL needs a browser). Until three.js
 *              arrives, a flat CSS stand-in of the same frame keeps the text readable.
 */
"use client";

import dynamic from "next/dynamic";

const Sign3D = dynamic(() => import("./Sign3D").then((m) => m.Sign3D), {
  ssr: false,
  loading: () => <div className="sign3d sign3d--loading" />,
});

export function SignBoard() {
  return <div className="sign__board" aria-hidden="true"><Sign3D /></div>;
}
