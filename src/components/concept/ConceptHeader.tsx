"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { headerActions, primaryNav, siteName } from "@/content/site";
import { brand, surfaces } from "@/lib/assets";
import { cn } from "@/lib/cn";

const SCROLL_THRESHOLD = 64;
const EASE_VEIL = [0.4, 0, 0.2, 1] as const;

/**
 * Fixed overlay chrome: hidden on land for a full-bleed first viewport.
 * After a small scroll a burger appears; clicking it draws a right-side nav panel.
 * Same pattern on every breakpoint.
 */
export function ConceptHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTrigger, setShowTrigger] = useState(false);
  const reducedMotion = useReducedMotion();
  const burgerRef = useRef<HTMLButtonElement>(null);
  const wasMenuOpen = useRef(false);
  const panelId = useId();
  const labelId = useId();

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const pastThreshold = window.scrollY > SCROLL_THRESHOLD;
      setShowTrigger((prev) => (prev === pastThreshold ? prev : pastThreshold));
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

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (wasMenuOpen.current && !menuOpen) {
      burgerRef.current?.focus({ preventScroll: true });
    }
    wasMenuOpen.current = menuOpen;
  }, [menuOpen]);

  const motionDuration = reducedMotion ? 0 : 0.32;
  const burgerDuration = reducedMotion ? 0 : 0.55;
  const burgerVisible = showTrigger || menuOpen;

  return (
    <header className="pointer-events-none fixed inset-0 z-50">
      <AnimatePresence>
        {burgerVisible ? (
          <motion.div
            key="burger"
            className="pointer-events-auto absolute top-[max(0.75rem,var(--spacing-gutter))] right-[max(0.75rem,var(--spacing-gutter))] z-20"
            initial={reducedMotion ? false : { opacity: 0, y: -22, scale: 0.45 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.85 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 420, damping: 16, mass: 0.65 }
            }
          >
            {!reducedMotion ? (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-[-2px] rounded-full border-2 border-gold"
                initial={{ scale: 1, opacity: 0.95 }}
                animate={{ scale: 2.1, opacity: 0 }}
                transition={{ duration: 0.75, ease: EASE_VEIL, delay: 0.08 }}
              />
            ) : null}

            <motion.button
              ref={burgerRef}
              type="button"
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              aria-controls={panelId}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className={cn(
                "relative flex size-14 items-center justify-center rounded-full border-2 border-gold text-ink-deep",
                "[background-image:var(--gradient-gold)] shadow-[var(--glow-gold-strong)]",
                "transition-[filter,box-shadow,transform] duration-300 ease-[var(--ease-veil)]",
                "hover:brightness-105 hover:shadow-[0_0_36px_rgba(250,231,183,0.65)]",
                "focus-visible:brightness-105 focus-visible:shadow-[0_0_36px_rgba(250,231,183,0.65)] focus-visible:outline-none",
              )}
              animate={
                reducedMotion || menuOpen
                  ? undefined
                  : {
                      boxShadow: [
                        "0 0 28px rgba(250, 231, 183, 0.5)",
                        "0 0 42px rgba(250, 231, 183, 0.85)",
                        "0 0 28px rgba(250, 231, 183, 0.5)",
                      ],
                    }
              }
              transition={
                reducedMotion || menuOpen
                  ? undefined
                  : { duration: 1.8, repeat: 2, ease: "easeInOut", delay: burgerDuration }
              }
            >
              <BurgerIcon open={menuOpen} />
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen ? (
          <motion.button
            key="backdrop"
            type="button"
            aria-label="Close menu"
            className="pointer-events-auto absolute inset-0 bg-night/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionDuration, ease: EASE_VEIL }}
            onClick={closeMenu}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen ? (
          <motion.aside
            key="panel"
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            className="pointer-events-auto absolute inset-y-0 right-0 flex w-full max-w-[min(100vw,28rem)] flex-col overflow-y-auto shadow-[-12px_0_48px_rgba(0,0,0,0.35)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: motionDuration, ease: EASE_VEIL }}
          >
            <div
              aria-hidden
              className="veil pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(var(--veil-ink), var(--veil-ink)), url(${surfaces.header})`,
              }}
            />

            <div className="relative flex flex-1 flex-col gap-10 px-gutter py-[max(1.25rem,var(--spacing-gutter))] pr-[max(4.5rem,calc(var(--spacing-gutter)+3.5rem))]">
              <Link
                href="/concept/"
                id={labelId}
                aria-label={`${siteName} concept home`}
                className="w-fit shrink-0"
                onClick={closeMenu}
              >
                <Image
                  src={brand.logo.src}
                  alt={siteName}
                  width={brand.logo.width}
                  height={brand.logo.height}
                  priority
                  className="w-[clamp(9.5rem,42vw,14rem)]"
                />
              </Link>

              <div className="flex flex-wrap items-center gap-[0.93em] text-nav">
                <ButtonLink
                  href={headerActions.cta.href}
                  variant="ghost"
                  size="fluid"
                  className="min-h-[2.03em] px-[1.4em] py-[0.2em] text-nav text-champagne"
                  onClick={closeMenu}
                >
                  {headerActions.cta.label}
                </ButtonLink>

                {[headerActions.account, headerActions.bag].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    aria-label={action.label}
                    className="opacity-90 transition-opacity hover:opacity-100"
                    onClick={closeMenu}
                  >
                    <Image
                      src={action.icon.src}
                      alt=""
                      width={action.icon.width}
                      height={action.icon.height}
                      className="h-[clamp(1.375rem,2.4vw,2.875rem)] w-auto"
                    />
                  </Link>
                ))}
              </div>

              <nav aria-label="Primary" className="flex flex-col gap-5 text-nav">
                {/*
                  A dropdown-capable NavGroup joined `primaryNav` for the
                  live header's READINGS item (see `content/site.ts`); this
                  demo predates it and has no dropdown of its own, so a group
                  here just links its first child.
                */}
                {primaryNav.map((link) => (
                  <Link
                    key={link.label}
                    href={"children" in link ? link.children[0].href : link.href}
                    className="text-mist-dim tracking-[0.01em] transition-colors hover:text-gold focus-visible:text-gold"
                    onClick={closeMenu}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block size-6" aria-hidden>
      <span
        className={cn(
          "absolute top-[4px] left-0 h-0.5 w-full origin-center rounded-full bg-current transition-transform duration-300 ease-[var(--ease-veil)]",
          open && "translate-y-[8px] rotate-45",
        )}
      />
      <span
        className={cn(
          "absolute top-[11px] left-0 h-0.5 w-full rounded-full bg-current transition-opacity duration-300 ease-[var(--ease-veil)]",
          open && "opacity-0",
        )}
      />
      <span
        className={cn(
          "absolute top-[18px] left-0 h-0.5 w-full origin-center rounded-full bg-current transition-transform duration-300 ease-[var(--ease-veil)]",
          open && "-translate-y-[8px] -rotate-45",
        )}
      />
    </span>
  );
}
