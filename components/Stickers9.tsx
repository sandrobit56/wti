/**
 * File:        components/Stickers9.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-27
 * Version:     v1.0
 * Description: Three die-cut stickers for "გახდი კრიტიკოსი" (join · taste · write), drawn
 *              in the page's own language: a coloured blob with a thick white cut line and
 *              a soft shadow, one simple ink pictogram on top. SVG, no images, no AI art.
 */
type Kind = "join" | "taste" | "write";

const ART: Record<Kind, { bg: string; shape: string; icon: React.ReactNode }> = {
  // a crowned name badge — "you're in"
  join: {
    bg: "#F1435E",
    shape: "M50 6c14 0 22 6 30 14s14 16 14 30-6 22-14 30-16 14-30 14-22-6-30-14S6 64 6 50s6-22 14-30S36 6 50 6Z",
    icon: (
      <g fill="none" stroke="#1C1A17" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M33 44l6-12 11 9 11-9 6 12z" fill="#FFC93C" />
        <rect x="30" y="48" width="40" height="24" rx="6" fill="#FFFAF2" />
        <path d="M38 57h24M38 64h14" />
      </g>
    ),
  },
  // fork + knife — "go and taste"
  taste: {
    bg: "#FFC93C",
    shape: "M48 5l13 7 15-1 8 13 12 9-3 15 4 14-11 10-4 15-15 3-11 10-14-6-15 2-8-13-12-9 3-15-4-14 11-10 4-15 15-3z",
    icon: (
      <g fill="none" stroke="#1C1A17" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M38 28v14a6 6 0 0 0 12 0V28M44 28v44" />
        <path d="M62 72V28c-6 4-8 12-8 22h8" fill="#FFFAF2" />
      </g>
    ),
  },
  // pencil on a note — "write it straight"
  write: {
    bg: "#9BD3C1",
    shape: "M14 12h72a6 6 0 0 1 6 6v56l-18 18H14a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6Z",
    icon: (
      <g fill="none" stroke="#1C1A17" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M28 36h30M28 46h22M28 56h14" />
        <path d="M70 34l8 8-22 22-10 2 2-10z" fill="#FFFAF2" />
      </g>
    ),
  },
};

export function Sticker9({ kind, className = "" }: { kind: Kind; className?: string }) {
  const a = ART[kind];
  return (
    <svg className={`sticker9 ${className}`} viewBox="-6 -6 112 112" aria-hidden="true">
      <path d={a.shape} fill="#fff" stroke="#fff" strokeWidth="12" strokeLinejoin="round" />
      <path d={a.shape} fill={a.bg} />
      {a.icon}
    </svg>
  );
}
