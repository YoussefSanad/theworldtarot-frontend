"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/cn";

const SCROLL_THRESHOLD = 64;
const EASE_VEIL = [0.4, 0, 0.2, 1] as const;

/**
 * Same treatment as the header's menu button: a ghost square that sits in the
 * bottom-right. Hidden at the top of the page, it eases in once the user has
 * left it and eases out again on the way back.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const pastThreshold = window.scrollY > SCROLL_THRESHOLD;
      setVisible((prev) => (prev === pastThreshold ? prev : pastThreshold));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [reducedMotion]);

  const duration = reducedMotion ? 0 : 0.4;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          key="scroll-to-top"
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className={cn(
            "btn btn-ghost fixed z-40 grid h-[2.75em] w-[2.75em] place-items-center p-0 text-note",
            "right-[max(0.75rem,var(--spacing-gutter))] bottom-[max(0.75rem,calc(var(--spacing-gutter)+env(safe-area-inset-bottom,0px)))]",
          )}
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration, ease: EASE_VEIL }}
        >
          <ArrowUpIcon />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-5">
      <path
        d="M12 19V6M6 11.5 12 5.5 18 11.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
