/**
 * File:        components/Sheet.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v2.0 — three fixed zones: BAR (handle · `top` slot · ×) / BODY (the only
 *              scrolling part, thin neutral scrollbar inset from the corners) / FOOT
 *              (actions, never covering content). Sheet owns the × button.
 *              v1.0 — dialog + Motion spring, mobile drag-to-close
 * Description: The one popup shell for the whole app (result, quiz, persona gallery).
 *   - Native <dialog>: focus trap, Esc, top layer and backdrop come from the browser.
 *     Initial focus goes to the body (no focus ring flashing on × when it opens).
 *   - Desktop: the card is "drawn" — it turns in like a tarot card.
 *   - Mobile (≤640px): bottom sheet; drag the bar down (or flick) to close.
 *   - prefers-reduced-motion: no entrance motion.
 */
"use client";

import { motion, useDragControls, useReducedMotion } from "motion/react";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

const MOBILE = "(max-width: 640px)";

/** Live media-query match without a re-render loop (useSyncExternalStore). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

type Props = {
  className?: string;
  labelledBy: string;
  onClose: () => void;
  top?: ReactNode;      // left side of the bar: step counter, progress, back…
  footer?: ReactNode;   // pinned actions
  children: ReactNode;  // scrolls
};

export function Sheet({ className, labelledBy, onClose, top, footer, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  const mobile = useMedia(MOBILE);
  const reduce = useReducedMotion();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    // showModal() focuses the first button (×) and Chrome draws a ring on it — start on the content instead.
    body.current?.focus({ preventScroll: true });
  }, []);

  const initial = reduce ? false : mobile ? { y: "100%" } : { rotateY: -75, scale: 0.85, y: 30 };

  return (
    <dialog
      ref={ref}
      className={`modal bsheet${className ? ` ${className}` : ""}`}
      aria-labelledby={labelledBy}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="modal__card"
        style={{ transformPerspective: 1400 }}
        initial={initial}
        animate={{ y: 0, rotateY: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        drag={mobile ? "y" : false}
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: reduce ? 0.2 : 0.8 }}
        onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose(); }}
      >
        <div className="bs__bar" onPointerDown={mobile ? (e) => { if (!(e.target as HTMLElement).closest("button")) drag.start(e); } : undefined}>
          {mobile && <span className="bs__grab" aria-hidden="true" />}
          <div className="bs__top">{top}</div>
          <button type="button" className="bs__close" onClick={onClose} aria-label="დახურვა">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="bs__body" ref={body} tabIndex={-1}>{children}</div>
        {footer && <div className="bs__foot">{footer}</div>}
      </motion.div>
    </dialog>
  );
}
