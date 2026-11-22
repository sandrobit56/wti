/**
 * File:        components/Wheel3D.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0 — the hero's wheel scene (driven by components/Wheel.tsx); v0.1 prototype
 * Description: The wheel as a real 3D scene (three.js via React Three Fiber) instead of a
 *              pre-rendered plate tilted with CSS. Because the plate is geometry, it spins in
 *              true perspective: slices, labels, bulbs and the rim all turn together, and
 *              stickers pop up from their slice facing the camera (billboards).
 *
 *              Angle convention (same as lib/seats.ts): 0 = the back of the table (far from the
 *              camera), growing clockwise seen from above. A slice whose centre is at plate angle
 *              θ sits at world angle θ − φ when the plate is turned by φ, so the winner lands at
 *              the back pointer when φ ≡ θ (mod 2π).
 */
"use client";

import { Billboard, ContactShadows, Text, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { configureTextBuilder } from "troika-three-text";
import { toMtavruli } from "@/lib/mtavruli.ts";
import { stickerSrc } from "@/lib/stickers.ts";
import { cameraPosition, cameraTarget, GEO, spinEase, VIEW, type View } from "@/lib/view3d.ts";

// Lay text out on the main thread: troika's worker is built from blob: scripts, which our CSP
// (script-src 'self') rightly refuses. A handful of short labels costs nothing on the main thread.
configureTextBuilder({ useWorker: false });

export type WheelDish = { slug: string; name: string };

const C = { teal: "#163C3A", coral: "#F1435E", ink: "#D92F4C", cream: "#FFF1DC", mustard: "#FFC93C", blush: "#F8B4C0", paper: "#FFF8EC" };
const SLICE = [C.teal, C.mustard, C.blush, C.paper];
const LABEL = [C.cream, C.teal, C.teal, C.teal];
const FONT = "/fonts/wti-display-cond-black.ttf";
const PLATE_R = GEO.plate;  // slices
const RIM_R = GEO.rim;      // outer edge of the cream rim

/** slice i spans [i, i+1]·(2π/n) from the back, like the 2D wheel; this is its middle */
const sliceAngle = (i: number, n: number) => ((i + 0.5) * 2 * Math.PI) / n;
/** plate-local point at angle θ (0 = back, clockwise from above), radius r, height y */
const at = (theta: number, r: number, y = 0) => new THREE.Vector3(Math.sin(theta) * r, y, -Math.cos(theta) * r);

function wedge(n: number, gap: number): THREE.ExtrudeGeometry {
  const half = Math.PI / n - gap;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.absarc(0, 0, PLATE_R, Math.PI / 2 - half, Math.PI / 2 + half, false);
  s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 3, curveSegments: 48 });
  g.rotateX(-Math.PI / 2);   // lie flat; the wedge now points to −z (the back)
  return g;
}

function Slice({ i, n, dish, geo, phi }: { i: number; n: number; dish: WheelDish; geo: THREE.ExtrudeGeometry; phi: React.RefObject<number> }) {
  const theta = sliceAngle(i, n);
  const col = i === n - 1 && n % SLICE.length === 1 ? 2 : i % SLICE.length;
  const tex = useTexture(stickerSrc(dish.slug), (t) => { (Array.isArray(t) ? t : [t]).forEach((x) => { x.colorSpace = THREE.SRGBColorSpace; }); });
  const label = useRef<THREE.Group>(null);
  const lp = at(theta, 0.86, 0.075);
  useFrame(() => {
    // keep labels upright for the viewer: flip the ones on the near half
    if (!label.current) return;
    const near = Math.cos(theta - phi.current) < 0;
    label.current.rotation.z = near ? Math.PI : 0;
  });
  const sp = at(theta, 0.6, 0.2);
  return (
    <group>
      <mesh geometry={geo} rotation={[0, -theta, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={SLICE[col]} roughness={0.55} />
      </mesh>
      {/* label lies on the plate, tangent to the rim */}
      <group position={lp} rotation={[0, -theta, 0]}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <group ref={label}>
            <Text font={FONT} fontSize={0.1} color={LABEL[col]} anchorX="center" anchorY="middle" maxWidth={0.7} letterSpacing={0.02}>
              {toMtavruli(dish.name)}
            </Text>
          </group>
        </group>
      </group>
      <Billboard position={sp}>
        <mesh>
          <planeGeometry args={[0.36, 0.36]} />
          <meshBasicMaterial map={tex} transparent alphaTest={0.05} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function Bulbs({ count = 28 }: { count?: number }) {
  return (
    <group>
      {/* the string the bulbs hang on */}
      <mesh position={[0, 0.062, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.085, 0.006, 8, 160]} />
        <meshStandardMaterial color={C.teal} roughness={0.8} />
      </mesh>
      {Array.from({ length: count }, (_, k) => {
        const p = at((k / count) * Math.PI * 2, 1.085, 0.07);
        return (
          <mesh key={k} position={p}>
            <sphereGeometry args={[0.028, 16, 12]} />
            <meshStandardMaterial color={C.mustard} emissive="#FFB52E" emissiveIntensity={0.9} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

type SceneProps = {
  dishes: WheelDish[];
  /** total plate turn in degrees, clockwise from above (the 2D wheel's `rotation + offset`) */
  deg: number;
  spinning: boolean;
  spinMs: number;
  /** show the back pin (single diner) */
  pointer: boolean;
  /** fired once the spin animation reaches `deg` */
  onSettled: () => void;
  view?: View;
};

function Plate({ dishes, deg, spinning, spinMs, pointer, onSettled }: Omit<SceneProps, "view">) {
  const n = dishes.length;
  if (n < 2) throw new Error(`Wheel3D needs at least 2 dishes, got ${n}`);
  const geo = useMemo(() => wedge(n, 0.012), [n]);
  const group = useRef<THREE.Group>(null);
  const phi = useRef((-deg * Math.PI) / 180);      // plate turn φ = −deg (see header)
  const anim = useRef<{ from: number; to: number; t0: number; ms: number } | null>(null);
  const settled = useRef(onSettled);
  useEffect(() => { settled.current = onSettled; });

  // a new target: animate when spinning, follow the finger otherwise
  useEffect(() => {
    const to = (-deg * Math.PI) / 180;
    if (spinning) anim.current = { from: phi.current, to, t0: performance.now(), ms: spinMs };
    else { anim.current = null; phi.current = to; }
  }, [deg, spinning, spinMs]);

  useFrame(() => {
    const a = anim.current;
    if (a) {
      const t = Math.min(1, (performance.now() - a.t0) / a.ms);
      phi.current = a.from + (a.to - a.from) * spinEase(t);
      if (t === 1) { anim.current = null; settled.current(); }
    }
    if (group.current) group.current.rotation.y = phi.current;
  });

  return (
    <group>
      {/* static table: coral drum + cream rim (does not spin) */}
      <mesh position={[0, -0.14, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[RIM_R + 0.02, RIM_R + 0.06, 0.26, 96]} />
        <meshStandardMaterial color={C.coral} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.0, 0]} receiveShadow>
        <cylinderGeometry args={[RIM_R, RIM_R, 0.05, 96]} />
        <meshStandardMaterial color={C.cream} roughness={0.6} />
      </mesh>
      <mesh position={[0, GEO.top, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PLATE_R + 0.005, PLATE_R + 0.03, 96]} />
        <meshStandardMaterial color={C.teal} roughness={0.6} />
      </mesh>
      <Bulbs />
      {pointer && (
        <group position={at(0, RIM_R + 0.02, 0.2)}>
          <mesh rotation={[Math.PI, 0, 0]} castShadow>
            <coneGeometry args={[0.07, 0.2, 24]} />
            <meshStandardMaterial color={C.coral} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.13, 0]} castShadow>
            <sphereGeometry args={[0.06, 24, 16]} />
            <meshStandardMaterial color={C.mustard} roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* the turning plate */}
      <group ref={group} position={[0, GEO.top, 0]}>
        {dishes.map((d, i) => <Slice key={d.slug + i} i={i} n={n} dish={d} geo={geo} phi={phi} />)}
      </group>

      {/* hub base; the clickable top is the HTML button laid over it (components/Wheel.tsx) */}
      <mesh position={[0, GEO.hubTop - 0.07, 0]} castShadow>
        <cylinderGeometry args={[GEO.hubR, GEO.hubR + 0.02, 0.14, 64]} />
        <meshStandardMaterial color={C.ink} roughness={0.35} />
      </mesh>
    </group>
  );
}

export function Wheel3D({ view = VIEW, ...props }: SceneProps) {
  const pos = cameraPosition(view);
  const target = cameraTarget();
  return (
    <Canvas className="wheel3d" flat shadows dpr={[1, 2]} camera={{ position: pos, fov: view.fov, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(...target)} aria-hidden="true">
      <hemisphereLight args={["#FFFFFF", "#F8B4C0", 1.5]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[2.5, 5, 3]} intensity={1.9} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-2, 2, 2, -2, 0.1, 12]} />
      </directionalLight>
      <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#F8B4C0" />
      <Plate {...props} />
      <ContactShadows position={[0, -0.28, 0]} opacity={0.35} scale={4} blur={2.6} far={1} color={C.teal} />
    </Canvas>
  );
}
