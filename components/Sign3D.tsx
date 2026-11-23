/**
 * File:        components/Sign3D.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-23
 * Version:     v1.0
 * Description: The hero's shop sign as a three.js scene (same materials and light as the wheel):
 *              a mustard marquee frame with bulbs, a recessed coral face and a striped awning.
 *              The words stay HTML on top (HeroTitle): crisp, an h1 for search, and the winner
 *              flip keeps working. An orthographic camera maps the scene 1:1 onto the .sign box,
 *              so the face lines up with the CSS text area without measuring anything.
 *
 *              World units: the box is SIGN_ASPECT wide and 1 tall, centred on the origin.
 */
"use client";

import { OrthographicCamera, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export const SIGN_ASPECT = 1226 / 517;
const C = { teal: "#163C3A", coral: "#F1435E", ink: "#D92F4C", cream: "#FFF1DC", mustard: "#FFC93C" };

const FRAME = { w: 2.3, h: 0.7, y: 0.115, d: 0.14 };       // y = centre of the frame
const FACE = { w: 2.12, h: 0.52 };
const STRIPES = 11;

/** Ortho camera whose frustum is exactly the box: 1 world unit = the canvas height. */
function FitCamera() {
  const height = useThree((st) => st.size.height);
  return <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={height} near={0.1} far={50} />;
}

function Bulbs() {
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    // a slow chase along the row, like a real marquee
    mats.current.forEach((m, k) => { if (m) m.emissiveIntensity = 0.55 + 0.45 * Math.max(0, Math.sin(clock.elapsedTime * 2.2 - k * 0.7)); });
  });
  const n = 9, top = FRAME.y + FRAME.h / 2 - 0.045;
  return (
    <group>
      {Array.from({ length: n }, (_, k) => (
        <mesh key={k} position={[-0.98 + (k * 1.96) / (n - 1), top, FRAME.d / 2 + 0.02]}>
          <sphereGeometry args={[0.028, 20, 14]} />
          <meshStandardMaterial ref={(m) => { if (m) mats.current[k] = m; }} color="#FFF6D6" emissive="#FFD27A" roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Awning() {
  const w = FRAME.w * 0.96 / STRIPES, top = FRAME.y - FRAME.h / 2;
  return (
    <group position={[0, top + 0.01, FRAME.d / 2 - 0.02]} rotation={[0.42, 0, 0]}>
      {Array.from({ length: STRIPES }, (_, k) => (
        <RoundedBox key={k} args={[w * 0.98, 0.26, 0.05]} radius={w * 0.46} smoothness={4}
          position={[-FRAME.w * 0.48 + w / 2 + k * w, -0.11, 0]} castShadow>
          <meshStandardMaterial color={k % 2 ? C.coral : C.cream} roughness={0.55} />
        </RoundedBox>
      ))}
    </group>
  );
}

function Board() {
  return (
    <group rotation={[0.1, 0, 0]}>
      {/* frame */}
      <RoundedBox args={[FRAME.w, FRAME.h, FRAME.d]} radius={0.06} smoothness={5} position={[0, FRAME.y, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.mustard} roughness={0.45} />
      </RoundedBox>
      {/* recessed coral face with a thin ink lip */}
      <RoundedBox args={[FACE.w + 0.03, FACE.h + 0.03, 0.02]} radius={0.03} smoothness={4} position={[0, FRAME.y - 0.01, FRAME.d / 2 - 0.004]}>
        <meshStandardMaterial color={C.ink} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[FACE.w, FACE.h, 0.02]} radius={0.025} smoothness={4} position={[0, FRAME.y - 0.01, FRAME.d / 2 + 0.002]} receiveShadow>
        <meshStandardMaterial color={C.coral} roughness={0.6} />
      </RoundedBox>
      <Bulbs />
      <Awning />
    </group>
  );
}

export function Sign3D() {
  return (
    <Canvas className="sign3d" flat shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true }} aria-hidden="true">
      <FitCamera />
      <hemisphereLight args={["#FFFFFF", "#F8B4C0", 1.5]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 4, 5]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005}>
        <orthographicCamera attach="shadow-camera" args={[-2, 2, 1.5, -1.5, 0.1, 20]} />
      </directionalLight>
      <directionalLight position={[-3, 1, 2]} intensity={0.35} color="#F8B4C0" />
      <Board />
    </Canvas>
  );
}
