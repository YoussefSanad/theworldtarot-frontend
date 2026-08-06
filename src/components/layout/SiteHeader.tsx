"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { headerActions, primaryNav, siteName } from "@/content/site";
import { brand, surfaces } from "@/lib/assets";

const EASE_VEIL = [0.4, 0, 0.2, 1] as const;

/**
 * Masthead: logo on the left, actions and navigation stacked on the right.
 * Transparent so the page atmosphere continues behind it into the hero.
 * Below the large breakpoint the navigation collapses behind a menu button
 * that opens a right-side drawer.
 *
 * This is the one place the page deliberately departs from the Figma frame,
 * which drew a 225px-tall masthead — too much of a laptop viewport to spend
 * before the hero starts. Type runs at 82.5% via `text-nav-sm` (see
 * globals.css) and the action icons match it, but the logo goes further, to
 * 70% (401px wide in Figma → 281px), because its height alone sets the
 * header's: at parity with the rest it stayed the tallest thing here by a
 * wide margin. Below `lg` the clamp floors take over and hold the logo near
 * its old mobile size — the collapsed header is already short there, so
 * shrinking the wordmark further only costs legibility.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasMenuOpen = useRef(false);
  const panelId = useId();
  const labelId = useId();

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

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
      triggerRef.current?.focus({ preventScroll: true });
    }
    wasMenuOpen.current = menuOpen;
  }, [menuOpen]);

  const motionDuration = reducedMotion ? 0 : 0.32;

  return (
    <header className="relative z-20">
      <div className="relative mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-x-gutter gap-y-4 px-gutter py-1.5">
        <Link href="/" aria-label={`${siteName} home`} className="shrink-0">
          <Image
            src={brand.logo.src}
            alt={siteName}
            width={brand.logo.width}
            height={brand.logo.height}
            priority
            className="w-[clamp(8.5rem,14.64vw,17.5625rem)]"
          />
        </Link>

        <button
          ref={triggerRef}
          type="button"
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          aria-controls={panelId}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="btn btn-ghost px-4 py-2 text-note lg:hidden"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>

        <div className="hidden flex-col items-stretch gap-6 lg:flex lg:w-auto lg:flex-row lg:items-end lg:gap-0 lg:pb-0">
          <div className="flex flex-wrap items-center gap-[0.93em] text-nav-sm lg:justify-end">
            <ButtonLink
              href={headerActions.cta.href}
              variant="ghost"
              size="fluid"
              className="min-h-[2.03em] px-[1.4em] py-[0.2em] text-nav-sm text-champagne"
            >
              {headerActions.cta.label}
            </ButtonLink>

            {[headerActions.account, headerActions.bag].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                aria-label={action.label}
                className="opacity-90 transition-opacity hover:opacity-100"
              >
                <Image
                  src={action.icon.src}
                  alt=""
                  width={action.icon.width}
                  height={action.icon.height}
                  className="h-[clamp(1.25rem,1.98vw,2.375rem)] w-auto"
                />
              </Link>
            ))}
          </div>

          <nav aria-label="Primary" className="flex flex-col gap-4 text-nav-sm lg:flex-row lg:items-center lg:gap-[1.33em]">
            {primaryNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-mist-dim tracking-[0.01em] transition-colors hover:text-gold focus-visible:text-gold"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.button
            key="backdrop"
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-50 bg-night/55 lg:hidden"
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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[min(100vw,28rem)] flex-col overflow-y-auto shadow-[-12px_0_48px_rgba(0,0,0,0.35)] lg:hidden"
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

            <div className="relative flex flex-1 flex-col gap-10 px-gutter py-[max(1.25rem,var(--spacing-gutter))]">
              <div className="flex shrink-0 items-center justify-between gap-4">
                <Link
                  href="/"
                  id={labelId}
                  aria-label={`${siteName} home`}
                  className="w-fit"
                  onClick={closeMenu}
                >
                  <Image
                    src={brand.logo.src}
                    alt={siteName}
                    width={brand.logo.width}
                    height={brand.logo.height}
                    className="w-[clamp(9.5rem,42vw,14rem)]"
                  />
                </Link>

                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="Close menu"
                  className="btn btn-ghost px-4 py-2 text-note"
                >
                  Close
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-[0.93em] text-nav-sm">
                <ButtonLink
                  href={headerActions.cta.href}
                  variant="ghost"
                  size="fluid"
                  className="min-h-[2.03em] px-[1.4em] py-[0.2em] text-nav-sm text-champagne"
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
                      className="h-[clamp(1.25rem,1.98vw,2.375rem)] w-auto"
                    />
                  </Link>
                ))}
              </div>

              <nav aria-label="Primary" className="flex flex-col gap-5 text-nav-sm">
                {primaryNav.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
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
