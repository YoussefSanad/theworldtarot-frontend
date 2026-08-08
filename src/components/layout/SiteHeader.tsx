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
const DESKTOP_QUERY = "(min-width: 64rem)"; // matches Tailwind's `lg`

/**
 * Masthead: logo on the left, actions and navigation stacked on the right.
 * Fixed to the top of the viewport for the whole page, with a permanent glass
 * scrim — but the size/reveal state only exists at `lg`+.
 *
 * At `lg`+, the trigger is the cursor (or keyboard focus) actually entering
 * the header — not scroll position. `onMouseEnter`/`onMouseLeave` expand and
 * collapse it directly; `onFocus`/`onBlur` do the same for keyboard users,
 * checking `relatedTarget` against the header so tabbing between the logo,
 * nav links, and the CTA/account/bag row all counts as "inside" (an
 * `:focus-within`-style check) and it only collapses once focus actually
 * leaves for something else on the page. Without that, someone tabbing
 * through the page could never reach the CTA/account/bag row at all — it's
 * still in the DOM while collapsed (see below), not unmounted; `inert` is
 * what actually keeps it out of tab order and hit-testing. On expand: the
 * row drops in above the nav links, the logo grows to full size, and the row
 * padding opens up.
 *
 * The row's reveal is a plain CSS `grid-template-rows: 0fr → 1fr` transition,
 * not a Framer height animation — that was tried first and made the nav
 * below visibly snap into place once the JS-driven height tween finished,
 * rather than moving with it. A native CSS transition is one continuous
 * browser-driven animation, so the nav's flexbox reflow tracks it every
 * frame for free, no extra library involvement needed.
 *
 * Below `lg` none of that applies — there's no hover, and an external
 * keyboard is rare enough not to design around, so `isDesktop` (tracked via
 * `matchMedia`) gates the handlers above off entirely; the row was already
 * `lg:hidden` regardless. The masthead there just stays at its collapsed
 * logo/padding permanently — that's the whole of its "state."
 *
 * The glass scrim (the leaf div right inside `<header>`) is permanently on at
 * every breakpoint, not tied to `expanded` — legibility over page content
 * doesn't depend on where the cursor is or how far the reader has scrolled.
 * Hero.tsx carries its own extra top padding below `lg` so its heading clears
 * the collapsed header/logo comfortably; that's the fix for tight landing
 * space there, not a transparent-until-scrolled header.
 *
 * `fixed` rather than `sticky` is what makes the `lg`+ growth free: a sticky
 * header keeps its box in flow, so every state change would shove the page
 * down mid-expand. Fixed takes it out of flow entirely, and
 * app/(site)/layout.tsx reserves only a small, independent minimum with a
 * spacer — not the collapsed header's real height. The collapsed logo is
 * deliberately allowed to render taller than that spacer and spill a little
 * into the hero's own top padding: that's what lets the header cost the page
 * almost nothing at rest. `--header-height` and friends live in globals.css.
 *
 * The sizes are the one place the page deliberately departs from the Figma
 * frame, which drew a 225px-tall masthead — too much of a laptop viewport to
 * spend before the hero starts. Both states run smaller than that frame, with
 * the collapsed logo smaller again than the expanded one — see the tokens in
 * globals.css for the exact clamps.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const reducedMotion = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasMenuOpen = useRef(false);
  const panelId = useId();
  const labelId = useId();

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
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
      className="fixed inset-x-0 top-0 z-20"
      onMouseEnter={() => isDesktop && setExpanded(true)}
      onMouseLeave={() => isDesktop && setExpanded(false)}
      onFocus={() => isDesktop && setExpanded(true)}
      onBlur={(event) => {
        if (isDesktop && !event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false);
      }}
    >
      {/* `backdrop-filter` (like `filter`/`transform`) makes an element a containing
          block for its `position: fixed` descendants — the mobile drawer backdrop and
          panel below are both `fixed` and mean to cover the viewport. If the blur lived
          on `<header>` itself, it would hijack their containing block down to the
          header's own small box instead of the viewport, breaking the drawer. Keeping
          it on this leaf div (no fixed/absolute descendants of its own) avoids that trap
          entirely — permanently on at every breakpoint, since legibility over page
          content doesn't depend on where the cursor is or how far the reader has
          scrolled. */}
      <div aria-hidden className="absolute inset-0 bg-night/10 backdrop-blur-sm" />
      <div
        className="relative mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-x-gutter gap-y-4 px-gutter transition-[padding] duration-300 ease-[var(--ease-veil)]"
        style={{ paddingBlock: expanded ? "var(--header-pad-y)" : "var(--header-pad-y-collapsed)" }}
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
            style={{ width: expanded ? "var(--header-logo-width)" : "var(--header-logo-width-collapsed)" }}
          />
        </Link>

        <button
          ref={triggerRef}
          type="button"
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          aria-controls={panelId}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="btn btn-ghost z-60 grid h-[2.75em] w-[2.75em] place-items-center p-0 text-note lg:hidden"
        >
          <span aria-hidden className="flex h-[0.75em] w-[1.25em] flex-col justify-between">
            <span
              className={cn(
                "h-[0.1em] w-full origin-center rounded-full bg-current transition-transform duration-300 ease-[var(--ease-veil)]",
                menuOpen && "translate-y-[0.325em] rotate-45",
              )}
            />
            <span
              className={cn(
                "h-[0.1em] w-full rounded-full bg-current transition-opacity duration-200 ease-[var(--ease-veil)]",
                menuOpen && "opacity-0",
              )}
            />
            <span
              className={cn(
                "h-[0.1em] w-full origin-center rounded-full bg-current transition-transform duration-300 ease-[var(--ease-veil)]",
                menuOpen && "-translate-y-[0.325em] -rotate-45",
              )}
            />
          </span>
        </button>

        <div className="hidden lg:flex lg:w-auto lg:flex-col lg:items-end lg:gap-6">
          {/* `grid-template-rows: 0fr → 1fr` instead of Framer's `height: "auto"`: a
              plain CSS transition that the browser drives as one continuous native
              animation, so the nav below reflows in lockstep with it every frame
              instead of trailing a separate JS-driven height tween. `min-h-0` on the
              grid item is required — grid items default to `min-height: auto`, which
              would refuse to shrink below the content's own height regardless of the
              track size. `inert` removes the CTA/account/bag links from tab order and
              hit-testing while collapsed, since they're still in the DOM now (not
              unmounted) — without it, keyboard focus could land on invisible controls. */}
          <div
            aria-hidden={!expanded}
            inert={!expanded}
            className="grid w-full overflow-hidden transition-[grid-template-rows] duration-300 ease-[var(--ease-veil)]"
            style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
          >
            <div
              className={cn(
                "flex w-full min-h-0 flex-wrap items-center justify-end gap-[0.65em] text-[calc(var(--text-nav-sm)*0.85)] transition-opacity duration-300 ease-[var(--ease-veil)]",
                expanded ? "opacity-100" : "opacity-0",
              )}
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
            </div>
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
              <Link
                href="/"
                id={labelId}
                aria-label={`${siteName} home`}
                className="w-fit shrink-0"
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
