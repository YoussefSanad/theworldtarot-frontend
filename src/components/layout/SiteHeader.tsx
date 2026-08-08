"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { headerActions, primaryNav, siteName } from "@/content/site";
import { brand, surfaces } from "@/lib/assets";
import { cn } from "@/lib/cn";

const EASE_VEIL = [0.4, 0, 0.2, 1] as const;
const SCROLL_THRESHOLD = 400;

/**
 * Masthead: logo on the left, actions and navigation stacked on the right.
 * Fixed to the top of the viewport for the whole page, with two states.
 *
 * At the very top of the page it is collapsed and transparent: a small logo,
 * tight padding, and nothing on the right but the nav links (the menu button
 * below `lg`). That buys the hero as much of the first viewport as possible,
 * which is the whole point — the reveal composition should land inside the
 * fold with minimal scrolling.
 *
 * Past `SCROLL_THRESHOLD` it becomes the full masthead: the CTA/account/bag
 * row drops in from above the nav links, the logo grows to full size, the row
 * padding opens up, and a glass scrim fades in so the header stays legible
 * over page content. Scrolling back to the top reverses all four together.
 *
 * `fixed` rather than `sticky` is what makes the growth free: a sticky header
 * keeps its box in flow, so every state change would shove the page down
 * mid-scroll. Fixed takes it out of flow entirely, and app/(site)/layout.tsx
 * reserves only a small, independent minimum with a spacer — not the
 * collapsed header's real height. The collapsed logo is deliberately allowed
 * to render taller than that spacer and spill a little into the hero's own
 * top padding: that's what lets landing cost the page almost nothing, rather
 * than just less. `--header-height` and friends live in globals.css.
 *
 * `SCROLL_THRESHOLD` is deliberately late (400px) so the collapsed state holds
 * through the initial scroll — the reader should be well past the hero, not
 * just past a stray wheel tick, before the full masthead comes back.
 *
 * The sizes are the one place the page deliberately departs from the Figma
 * frame, which drew a 225px-tall masthead — too much of a laptop viewport to
 * spend before the hero starts. Both states run smaller than that frame, with
 * the collapsed logo smaller again than the scrolled one — see the tokens in
 * globals.css for the exact clamps.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reducedMotion = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);
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
      setScrolled((prev) => (prev === pastThreshold ? prev : pastThreshold));
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
      triggerRef.current?.focus({ preventScroll: true });
    }
    wasMenuOpen.current = menuOpen;
  }, [menuOpen]);

  const motionDuration = reducedMotion ? 0 : 0.32;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-20 transition-[background-color,backdrop-filter] duration-300 ease-[var(--ease-veil)]",
        scrolled ? "bg-night/10 backdrop-blur-sm" : "bg-transparent backdrop-blur-none",
      )}
    >
      <div
        className="relative mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-x-gutter gap-y-4 px-gutter transition-[padding] duration-300 ease-[var(--ease-veil)]"
        style={{ paddingBlock: scrolled ? "var(--header-pad-y)" : "var(--header-pad-y-collapsed)" }}
      >
        <Link href="/" aria-label={`${siteName} home`} className="shrink-0">
          {/* Width rather than `scale`: the logo's box is what sets the header's
              height, so shrinking it has to be a real layout change for the
              collapsed header to actually be short. Free to reflow here — the
              header is out of flow. */}
          <Image
            src={brand.logo.src}
            alt={siteName}
            width={brand.logo.width}
            height={brand.logo.height}
            priority
            className="transition-[width] duration-300 ease-[var(--ease-veil)]"
            style={{ width: scrolled ? "var(--header-logo-width)" : "var(--header-logo-width-collapsed)" }}
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

        <div className="hidden lg:flex lg:w-auto lg:flex-col lg:items-end lg:gap-6">
          <AnimatePresence initial={false}>
            {scrolled ? (
              <motion.div
                key="actions-row"
                initial={reducedMotion ? false : { height: 0, opacity: 0, y: -12 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -12 }}
                transition={{ duration: motionDuration, ease: EASE_VEIL }}
                className="flex w-full flex-wrap items-center justify-end gap-[0.65em] overflow-hidden text-[calc(var(--text-nav-sm)*0.85)]"
              >
                <ButtonLink
                  href={headerActions.cta.href}
                  variant="ghost"
                  size="fluid"
                  className="min-h-[1.6em] px-[1.1em] py-[0.12em] text-champagne"
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
                      className="h-[clamp(0.8125rem,1.3vw,1.5rem)] w-auto"
                    />
                  </Link>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

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
