"use client";
/**
 * File:        components/FigmaShaders.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-26
 * Version:     v1.1 — no-WebGPU fallback: <html class="no-webgpu"> swaps in the same frames
 *              baked from Figma (public/fig/*.webp), so Safari/Firefox see the identical look
 * Description: The three shader fills Sandro authored in Figma (file WTI, frame "Desktop 1440 · v8"),
 *              run with Figma's own runtime (@figma/expressive-components). The shader modules in
 *              lib/custom-effects/ are exported from Figma verbatim — do not edit them by hand.
 *              WebGPU only. Without it we never mount the shader; app/v8.css then paints the
 *              Figma-rendered still of the same layer instead.
 */
import { useEffect, useSyncExternalStore } from "react";
import { ShaderFill, type Shader } from "@figma/expressive-components";
import * as clouds from "@/lib/custom-effects/CodeComponentId_d56ec91cd4391861fc67e6ba0236e8768d38a728_8340";
import * as water from "@/lib/custom-effects/CodeComponentId_40f03f78407c1c973fc891fbca9ff3d0387485e6_8370";
import * as paper from "@/lib/custom-effects/CodeComponentId_958fe881d756f1ed00b026088be0edf83e0d6a97_8347";

/** hero sky: "Clouds" shader at 20% under a 66% pink veil (Figma node 174:189) */
const HERO_CLOUDS: Shader = {
  setup: clouds.setup, render: clouds.render, manifest: clouds.manifest,
  params: {
    warpScale: 100, globalTransform: { x: 57.93902587890625, y: 23.247760772705078, radius: 60, angle: 0 },
    coverage: 0, warpAmount: 100, globalDetail: 0,
    cloudColor: { r: 0.9290000200271606, g: 0.9729999899864197, b: 1, a: 1 }, stretch: 0, shadingVariation: 100, density: 0,
    cloudShadowColor: { r: 0.2669999897480011, g: 0.5180000066757202, b: 0.800000011920929, a: 1 }, brightness: 5,
    skyColor: { stops: [
      { position: 0, color: { r: 0, g: 0.16099999845027924, b: 0.47099998593330383, a: 1 } },
      { position: 1, color: { r: 0.32899999618530273, g: 0.5879999995231628, b: 0.7960000038146973, a: 1 } },
    ] },
    evolution: 0,
  },
};
/** section 2 lower half: "Water caustic" at 20% (Figma node 172:243) */
const SECTION2_WATER: Shader = {
  setup: water.setup, render: water.render, manifest: water.manifest,
  params: { center: { x: 50, y: 50 }, scale: 1, playhead: 100, highlightColor: { r: 1, g: 0.9803921580314636, b: 0.9490196108818054, a: 1 }, waterColor: { r: 0.9725490212440491, g: 0.7058823704719543, b: 0.7529411911964417, a: 1 }, intensity: 0.5 },
};
/** persona section: paper pattern at 20% over mustard (Figma node 175:110) */
const PERSONA_PAPER: Shader = {
  setup: paper.setup, render: paper.render, manifest: paper.manifest,
  params: { layerScale: 100, layerFlow: 100, cycles: 20, layerGain: 100, layerBlend: 0, transform: { x: 50, y: 50, radius: 100, angle: -9.733396530151367 }, sharpness: 91, tileSizeX: 0, turbulence: 200, tileSizeY: 100, layers: 1, noiseType: 1, saturation: 0, phase: 100 },
};

const SHADERS = { heroClouds: HERO_CLOUDS, section2Water: SECTION2_WATER, personaPaper: PERSONA_PAPER } as const;

const noop = () => () => {};
/** false on the server and in browsers without WebGPU */
function useWebGPU(): boolean {
  const has = useSyncExternalStore(noop, () => "gpu" in navigator, () => false);
  useEffect(() => { document.documentElement.classList.toggle("no-webgpu", !("gpu" in navigator)); }, []);
  return has;
}

export function FigmaFill({ name, className }: { name: keyof typeof SHADERS; className: string }) {
  const gpu = useWebGPU();
  return <div className={`fx ${className}`} aria-hidden="true">{gpu && <ShaderFill className="fx__canvas" shader={SHADERS[name]} />}</div>;
}
