"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { AccountControl } from "@/components/account/AccountControl";
import { LocaleControls, LocaleMenu, useLocaleSelection } from "@/components/layout/LocaleControls";
import { NavDropdown, NavGroupLinkLabel } from "@/components/layout/NavDropdown";
import { ButtonLink } from "@/components/ui/Button";
import { headerActions, primaryNav, siteName } from "@/content/site";
import { brand, surfaces } from "@/lib/assets";
import { cn } from "@/lib/cn";

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
 * 70% (401px wide in Figma → 281px), because its height alone used to set the
 * header's: at parity with the rest it stayed the tallest thing here by a
 * wide margin. Below `lg` the clamp floors take over and hold the logo near
 * its old mobile size — the collapsed header is already short there, so
 * shrinking the wordmark further only costs legibility.
 *
 * **The widths are the old ones on purpose.** The mark is the client's vector
 * wordmark now rather than the starfield export, and the cream ran the full
 * width of that export — so a width that framed the words then frames them
 * still, and only the halo and its height are gone. See `brand.logo`.
 *
 * What that height was holding up: 281px of the old box came to 146px tall and
 * nothing else here was close, so the logo set the masthead at every width.
 * The same width of the new one is 51px, which is shorter than the row beside
 * it everywhere — above `lg` the actions and the nav stack to more than that,
 * and below it the menu button's 2.75em does. The masthead is now as tall as
 * whatever is opposite the logo, so at the old `py-1.5` a phone got about 50px
 * of masthead where the old mark gave it 83px — the row went slack at the top,
 * which is what the vertical padding buys back.
 *
 * **It is even now (`py-5`), where it used to be top-weighted (`pt-5 pb-2`).**
 * The old split was deliberate — the logo wants air above it more than the
 * hero below wants pushing down — but it reads as the masthead sitting low in
 * its own box, the row crowding whatever is beneath it rather than being
 * centred in a band of its own. Matching the bottom to the top costs 12px of
 * height everywhere and gives the header the same air on both sides, which is
 * what makes it read as one consistent band across every page. A phone goes
 * from roughly 66px to 78px.
 *
 * Anything tuned to clear this header wants re-measuring when these change,
 * and this change is one of them. Four things are tuned to it: the
 * `max-lg:-top-20` on the atmosphere in `readings/page.tsx`, `library/page.tsx`
 * and `world-tarot/page.tsx`, plus the one in `readings/month-ahead/page.tsx`
 * — all lifting a mobile sky's top edge clear of this masthead.
 *
 * **5rem (80px) still clears it, but only just, and that is worth knowing.**
 * Below `lg` the menu button sets the height: `text-note` floors at 14px, so
 * 2.75em is 38.5px, and `py-5` adds 40px for 78.5px total. The old `pt-5 pb-2`
 * left 13.5px of slack under those skies; there is now 1.5px. Nothing is
 * clipped and none of the four needed changing, but any further growth here
 * crosses them — add to this padding and those offsets have to grow with it.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  /*
    Held here rather than inside the controls because they are rendered twice —
    as one icon and its panel on desktop and as flat rows in the drawer — and
    one choice has to reach both. See `LocaleControls`; today this is plain
    state and nothing reads it but the controls themselves.
  */
  const localeSelection = useLocaleSelection();
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

    /*
      On `<html>`, not just `<body>`. The root element carries `overflow-x:
      hidden` (see the root layout), which makes it the scrolling box for the
      viewport rather than passing that role down — so the old `body` lock
      clipped a box that was already auto-height and the page went on
      scrolling underneath the open drawer. Padding the root by the scrollbar's
      width keeps the layout from jumping sideways as that scrollbar goes; the
      drawer is below `lg` only, but a narrow desktop window still gets here.
    */
    const root = document.documentElement;
    const previous = {
      rootOverflow: root.style.overflow,
      rootPaddingRight: root.style.paddingRight,
      bodyOverflow: document.body.style.overflow,
    };
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) root.style.paddingRight = `${scrollbarWidth}px`;

    window.addEventListener("keydown", onKeyDown);

    return () => {
      root.style.overflow = previous.rootOverflow;
      root.style.paddingRight = previous.rootPaddingRight;
      document.body.style.overflow = previous.bodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  /*
    The drawer is hidden wherever the desktop nav shows, so crossing into that
    state with the drawer open hides the panel while leaving the scroll lock on
    — a page that cannot be scrolled and nothing on screen to explain why.
    Close it instead.

    **The query has to be `desktop-nav`'s own, not the width half of it.** When
    this watched `(min-width: 64rem)` alone it fired on any rotation across
    1024px — and an iPad Pro 13" is 1032 x 1376, so turning one with the drawer
    open closed the drawer, kept the scroll lock, and showed no nav at all,
    which is the exact failure this effect exists to prevent. Matching the
    variant means it now fires only when the desktop nav is really there to
    receive the user.
  */
  useEffect(() => {
    if (!menuOpen) return;

    const desktop = window.matchMedia(
      "(min-width: 64rem) and (hover: hover) and (pointer: fine)",
    );
    const onChange = () => {
      if (desktop.matches) closeMenu();
    };

    onChange();
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (wasMenuOpen.current && !menuOpen) {
      triggerRef.current?.focus({ preventScroll: true });
    }
    wasMenuOpen.current = menuOpen;
  }, [menuOpen]);

  const motionDuration = reducedMotion ? 0 : 0.32;

  return (
    /*
      `z-50`, not the `z-20` this used to carry: the drawer renders inside this
      header, so the header's layer is the drawer's layer, and `ScrollToTop`
      floats at `z-40` in the same stacking context. At `z-20` that button sat
      on top of an open drawer.
    */
    <header className="relative z-50">
      <div className="relative mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-x-gutter gap-y-4 px-gutter py-5">
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
          className="btn btn-ghost z-60 grid h-[2.75em] w-[2.75em] place-items-center p-0 text-note desktop-nav:hidden"
        >
          {/*
            One button that morphs into the X, rather than a close control
            inside the drawer. It can hold its place in the masthead because
            the page beneath is locked while the drawer is open, and it is only
            reachable in the first place when the masthead is on screen — so
            wherever it was tapped is where the X appears.
          */}
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

        <div className="hidden desktop-nav:flex desktop-nav:w-auto desktop-nav:flex-col desktop-nav:items-end desktop-nav:gap-6">
          <div className="flex flex-wrap items-center justify-end gap-[0.93em] text-nav-sm">
            <ButtonLink
              href={headerActions.cta.href}
              variant="ghost"
              size="fluid"
              className="min-h-[2.03em] px-[1.4em] py-[0.2em] text-nav-sm text-(--header-cta)"
            >
              {headerActions.cta.label}
            </ButtonLink>

            <AccountControl />

            {/*
              Last, not first: `LocaleMenu` anchors its panel to its own right
              edge, and this row is right-justified, so the icon has to be the
              rightmost thing here for that edge to line up with the header's.
            */}
            <LocaleMenu selection={localeSelection} />
          </div>

          <nav aria-label="Primary" className="flex flex-row items-center gap-[1.33em] text-nav-sm">
            {primaryNav.map((item) =>
              "children" in item ? (
                <NavDropdown key={item.label} group={item} />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-(--header-ink) tracking-[0.01em] transition-colors hover:text-(--header-accent) focus-visible:text-(--header-accent)"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.button
            key="backdrop"
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-50 touch-none bg-night/55 desktop-nav:hidden"
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
            className="fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-full max-w-[min(100vw,28rem)] flex-col overflow-hidden shadow-[-12px_0_48px_rgba(0,0,0,0.35)] desktop-nav:hidden"
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

            {/*
              The scroller is this column, not the panel around it. The veil
              above is `absolute inset-0`, and inside a scroll container that
              resolves against the scrolling padding box — so when the panel
              itself scrolled, the background slid up with the content and left
              the foot of the drawer bare over the page. An unscrolling panel
              keeps the veil pinned to the full height of the screen.
            */}
            {/*
              **The drawer resets the masthead palette to the site's own.** The
              `--header-*` tokens exist so a light page can recolour the nav
              (see globals.css), but this panel is not the masthead — it paints
              its own dark veil above the page, so its contents want the
              cream-on-dark they have everywhere. Rebinding here rather than
              reverting each utility means anything added to the drawer later
              is right by default.
            */}
            <div
              className="relative flex flex-1 flex-col gap-10 overflow-y-auto overscroll-contain px-gutter py-[max(1.25rem,var(--spacing-gutter))]"
              style={{
                ["--header-ink" as string]: "var(--color-mist-dim)",
                ["--header-accent" as string]: "var(--color-gold)",
                ["--header-cta" as string]: "var(--color-champagne)",
              }}
            >
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
                  className="min-h-[2.03em] px-[1.4em] py-[0.2em] text-nav-sm text-(--header-cta)"
                  onClick={closeMenu}
                >
                  {headerActions.cta.label}
                </ButtonLink>

                <AccountControl onNavigate={closeMenu} />
              </div>

              {/*
                **`gap-1` with 44px rows, not the `gap-5` this had.** These
                rows were bare text, so each one's tap target was its own line
                box — 16.8px at the phone floor, 29.7px on a tablet, against
                the ~44px a fingertip needs. The height moves to the rows
                themselves (`min-h-[44px]`, centred) so the targets meet and
                tile the list instead of leaving dead gutters between them.

                The gap comes down from `1.25rem` to `0.25rem` to pay for it:
                the rows now carry their own height, so keeping the old gap
                would add that space on top of boxes already three times their
                text's height and push the list far looser than the client's
                spacing. Visually this lands close to where it was; what
                changed is that the space between labels is now tappable.
              */}
              <nav aria-label="Primary" className="flex flex-col gap-1 text-nav-sm">
                {primaryNav.map((item) =>
                  "children" in item ? (
                    <div key={item.label} className="flex flex-col gap-1">
                      {/*
                        A link here too, not the inert label it used to be —
                        the drawer has no hover and no dropdown, so if the
                        group's own page is not reachable from its label it is
                        not reachable at all now that OVERVIEW has gone from
                        the children. See `NavGroup` in `content/site.ts`.
                      */}
                      <Link
                        href={item.href}
                        className="flex min-h-[44px] items-center text-(--header-ink) tracking-[0.01em] transition-colors hover:text-(--header-accent) focus-visible:text-(--header-accent)"
                        onClick={closeMenu}
                      >
                        {item.label}
                      </Link>
                      <div className="flex flex-col gap-1 border-l border-(--edge-gold) pl-5">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="flex min-h-[44px] items-center text-(--header-ink) tracking-[0.01em] transition-colors hover:text-(--header-accent) focus-visible:text-(--header-accent)"
                            onClick={closeMenu}
                          >
                            <NavGroupLinkLabel link={child} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex min-h-[44px] items-center text-(--header-ink) tracking-[0.01em] transition-colors hover:text-(--header-accent) focus-visible:text-(--header-accent)"
                      onClick={closeMenu}
                    >
                      {item.label}
                    </Link>
                  ),
                )}
              </nav>

              {/*
                Last, and pushed to the foot of the panel: settings rather than
                destinations, so they sit below the places to go rather than
                among them. Flat here instead of the desktop icon's panel — a
                menu opening inside a drawer is a second layer over a first, and
                with seven options in total there is nothing to save by hiding
                them.
              */}
              <div className="mt-auto flex flex-col gap-5 border-t border-(--edge-gold) pt-7">
                <LocaleControls selection={localeSelection} />
              </div>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
