/**
 * File:        components/Sheet.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-21
 * Version:     v1.0
 * Description: The one popup shell for the whole app (result, quiz, persona gallery).
 *   - Native <dialog>: focus trap, Esc, top layer and backdrop come from the browser.
 *   - Desktop: the card is "drawn" — it turns in from the side like a tarot card.
 *   - Mobile (≤640px): bottom sheet; drag the handle down (or flick) to close.
 *     Drag starts only from the handle, so scrolling the content never fights it.
 *   - prefers-reduced-motion: no entrance motion, no drag inertia.
 *   Motion (motion/react, MIT) drives the spring + drag; CSS keeps the layout.
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

type Props = { className?: string; labelledBy: string; onClose: () => void; children: ReactNode };

export function Sheet({ className, labelledBy, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useDragControls();
  const mobile = useMedia(MOBILE);
  const reduce = useReducedMotion();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
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
        {mobile && (
          <div className="bsheet__grab" onPointerDown={(e) => drag.start(e)} aria-hidden="true"><span /></div>
        )}
        {children}
      </motion.div>
    </dialog>
  );
}
