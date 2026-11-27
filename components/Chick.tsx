/**
 * File:        components/Chick.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-27
 * Version:     v1.0
 * Description: "ჭამია" — the logo's crowned yellow chick, as a character. It is the brand's
 *              own eater (a round mouth that chomps), so it is the natural hero of the game:
 *              it flies over the supra and eats. One geometry, two renderers:
 *               - drawChick(): canvas, every frame of the game (mouth, wing flap, hurt flash)
 *               - <ChickMark />: the same shape as inline SVG for screens around the game
 *              Units: radius 1 = the body; colours are the logo's.
 */

const Y = "#FFC93C", SHADE = "#F2A91E", EYE = "#163C3A", CROWN = "#F1435E", WING = "#FFF1CC";

/** Crown points (logo crown, normalised to the body radius, before its −8° tilt). */
const CROWN_PTS: [number, number][] = [[-0.64, -0.76], [-0.64, -1.07], [-0.42, -0.9], [-0.18, -1.27], [0.04, -0.9], [0.26, -1.07], [0.26, -0.76]];

export type ChickPose = {
  mouth: number;   // half-angle of the open mouth, radians (0 = closed)
  wing: number;    // wing flap angle, radians
  hurt: boolean;   // flash red (chili)
};

export function drawChick(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, tilt: number, p: ChickPose) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(r, r);
  ctx.lineJoin = "round";

  // wing (behind the body), flapping around its shoulder
  ctx.save();
  ctx.translate(-0.35, 0.05);
  ctx.rotate(-0.5 + p.wing);
  ctx.beginPath(); ctx.ellipse(-0.42, 0, 0.5, 0.26, 0, 0, Math.PI * 2);
  ctx.fillStyle = WING; ctx.fill();
  ctx.lineWidth = 0.07; ctx.strokeStyle = SHADE; ctx.stroke();
  ctx.restore();

  // body: a circle with a wedge mouth facing right; lower crescent in the darker yellow
  const m = Math.max(0.02, p.mouth);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0.05, 0.05); ctx.arc(0, 0, 1, m, Math.PI * 2 - m); ctx.closePath();
  ctx.clip();
  ctx.fillStyle = SHADE; ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
  ctx.beginPath(); ctx.arc(0.02, -0.16, 1, 0, Math.PI * 2); ctx.fillStyle = Y; ctx.fill();
  if (p.hurt) { ctx.fillStyle = "rgba(217, 47, 76, .45)"; ctx.fillRect(-1.2, -1.2, 2.4, 2.4); }
  ctx.restore();

  // eye
  ctx.beginPath(); ctx.arc(0.02, -0.46, 0.14, 0, Math.PI * 2); ctx.fillStyle = EYE; ctx.fill();
  ctx.beginPath(); ctx.arc(0.07, -0.51, 0.045, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();

  // crown, tilted like the logo's
  ctx.save();
  ctx.rotate(-0.14);
  ctx.beginPath();
  CROWN_PTS.forEach(([cx, cy], i) => (i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy)));
  ctx.closePath();
  ctx.fillStyle = CROWN; ctx.fill();
  ctx.lineWidth = 0.07; ctx.strokeStyle = CROWN; ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/** The same chick as SVG (start / end cards). `mouth` in degrees. */
export function ChickMark({ size = 96, mouth = 34, className }: { size?: number; mouth?: number; className?: string }) {
  const a = (mouth * Math.PI) / 180;
  const px = (t: number) => Math.cos(t).toFixed(3), py = (t: number) => Math.sin(t).toFixed(3);
  const body = `M0.05 0.05 L${px(a)} ${py(a)} A1 1 0 1 1 ${px(-a)} ${py(-a)} Z`;
  return (
    <svg className={className} width={size} height={size} viewBox="-1.5 -1.45 2.9 2.7" aria-hidden="true">
      <defs><clipPath id="chick-body"><path d={body} /></clipPath></defs>
      <ellipse cx="-0.77" cy="0.05" rx="0.5" ry="0.26" transform="rotate(-28 -0.35 0.05)" fill={WING} stroke={SHADE} strokeWidth="0.07" />
      <g clipPath="url(#chick-body)">
        <rect x="-1.2" y="-1.2" width="2.4" height="2.4" fill={SHADE} />
        <circle cx="0.02" cy="-0.16" r="1" fill={Y} />
      </g>
      <circle cx="0.02" cy="-0.46" r="0.14" fill={EYE} />
      <circle cx="0.07" cy="-0.51" r="0.045" fill="#fff" />
      <polygon points={CROWN_PTS.map((q) => q.join(" ")).join(" ")} transform="rotate(-8)" fill={CROWN} stroke={CROWN} strokeWidth="0.07" strokeLinejoin="round" />
    </svg>
  );
}
