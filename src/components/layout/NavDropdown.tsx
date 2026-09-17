"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { NavGroup, NavGroupLink } from "@/content/site";
import { cn } from "@/lib/cn";
import { useReadingName } from "@/lib/reading-prices";

const EASE_VEIL = [0.4, 0, 0.2, 1] as const;

/** Grace period between the pointer leaving the group and the panel closing. */
const CLOSE_DELAY_MS = 120;

/**
 * A primary-nav item that both navigates and opens a panel of links — today
 * just READINGS. Borrows `LocaleMenu`'s panel behaviour in
 * `LocaleControls.tsx` (outside-click/Escape/Tab dismiss, focus return, the
 * same `menu-panel`/`menu-option` styling) since that is the one dropdown
 * already in this header; it stays its own component rather than folding into
 * `LocaleMenu` because the two share no state and a third caller would rather
 * find two small files than one that branches on what kind of menu it is.
 *
 * **Where it parts from `LocaleMenu`: the label is a link, so the panel opens
 * on hover rather than on click.** A click on the label has to reach
 * `/readings/`, which rules out the click-toggle `LocaleMenu` uses — a label
 * cannot both navigate and swallow the click that opens its menu. Hover and
 * focus open it instead, and the chevron beside it is a real button for the
 * inputs that have no hover to give: touch, and a keyboard arriving by Tab.
 * `LocaleMenu` has no destination of its own and so keeps its click toggle.
 *
 * The close is deliberately lazy — pointer leaving the group closes it after
 * `CLOSE_DELAY_MS` rather than at once, so the diagonal from the label down
 * to a row two rows in does not pass outside the group and shut the panel
 * mid-reach.
 *
 * Anchored `left-0` rather than `right-0` — `LocaleMenu` sits rightmost in a
 * right-justified row and lines its panel up with that edge, but this trigger
 * sits mid-row in the nav, so its panel opens under its own left edge instead.
 */
export function NavDropdown({ group, className }: { group: NavGroup; className?: string }) {
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const dismissed = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reducedMotion = useReducedMotion();
  const panelId = useId();

  const cancelClose = () => {
    if (closeTimer.current === null) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const openNow = () => {
    cancelClose();
    setOpen(true);
  };

  /*
    Marked `dismissed` so the close does not yank focus back to the chevron:
    the pointer left of its own accord, and `wasOpen`'s focus-return exists for
    Escape and for a row being chosen, not for a panel the pointer walked away
    from.
  */
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      dismissed.current = true;
      setOpen(false);
    }, CLOSE_DELAY_MS);
  };

  useEffect(() => cancelClose, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      dismissed.current = true;
      setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (wasOpen.current && !open && !dismissed.current) {
      triggerRef.current?.focus({ preventScroll: true });
    }
    dismissed.current = false;
    wasOpen.current = open;
  }, [open]);

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") {
      dismissed.current = true;
      setOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onPointerEnter={(event) => {
        /*
          Touch reports itself here as a pointerenter too, immediately before
          the tap lands — honouring it would open the panel under the finger on
          the way to `/readings/`. Hover-open is for pointers that can hover;
          touch gets the chevron.
        */
        if (event.pointerType === "touch") return;
        openNow();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "touch") return;
        closeSoon();
      }}
      onFocus={openNow}
      onBlur={(event) => {
        if (rootRef.current?.contains(event.relatedTarget as Node | null)) return;
        cancelClose();
        dismissed.current = true;
        setOpen(false);
      }}
    >
      <span className="inline-flex items-center gap-[0.4em]">
        <Link
          href={group.href}
          className={cn(
            "text-mist-dim tracking-[0.01em] transition-colors hover:text-gold focus-visible:text-gold",
            open && "text-gold",
          )}
          onClick={() => {
            cancelClose();
            dismissed.current = true;
            setOpen(false);
          }}
        >
          {group.label}
        </Link>

        {/*
          The chevron is the only way in for anything that cannot hover — a
          tap, or a keyboard that would otherwise have to guess the panel is
          there. It carries the `aria-haspopup`/`aria-expanded` wiring for that
          reason, and takes a label of its own ("READINGS menu") so a screen
          reader hears the link and the menu as the two separate things they
          now are, rather than the group's name twice.
        */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            cancelClose();
            setOpen((current) => !current);
          }}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={`${group.label} menu`}
          className="inline-flex cursor-pointer items-center text-mist-dim transition-colors hover:text-gold focus-visible:text-gold"
        >
          <ChevronIcon className={cn("size-[0.55em] transition-transform duration-300 ease-(--ease-veil)", open && "-rotate-180")} />
        </button>
      </span>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            id={panelId}
            role="menu"
            aria-label={group.label}
            onKeyDown={onPanelKeyDown}
            className="menu-panel absolute left-0 top-[calc(100%+0.75em)] z-30 flex w-max min-w-[11em] flex-col overflow-hidden py-[0.35em] text-nav-sm before:absolute before:inset-x-0 before:bottom-full before:h-[0.75em] before:content-['']"
            initial={reducedMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: EASE_VEIL }}
          >
            <NavDropdownRows links={group.children} onNavigate={() => setOpen(false)} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** The rows inside the panel — roving arrow-key focus, same as `LocaleGroup`'s options. */
function NavDropdownRows({
  links,
  onNavigate,
}: {
  links: NavGroup["children"];
  onNavigate: () => void;
}) {
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const focusIndex = (index: number) => {
    setActiveIndex(index);
    linkRefs.current[index]?.focus({ preventScroll: true });
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLAnchorElement>, index: number) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusIndex(Math.min(index + 1, links.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        focusIndex(Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        focusIndex(0);
        break;
      case "End":
        event.preventDefault();
        focusIndex(links.length - 1);
        break;
    }
  };

  return (
    <>
      {links.map((link, index) => (
        <NavDropdownLink
          key={link.href}
          link={link}
          ref={(element) => {
            linkRefs.current[index] = element;
          }}
          tabIndex={index === activeIndex ? 0 : -1}
          onFocus={() => setActiveIndex(index)}
          onNavigate={onNavigate}
          onKeyDown={(event) => onKeyDown(event, index)}
        />
      ))}
    </>
  );
}

/**
 * One row. Its own component, not inlined in the `.map` above, because a row
 * with a `productKey` calls `useReadingName` and a row without one does not: a
 * hook behind a condition inside a loop body breaks the Rules of Hooks, where
 * one behind a per-row component does not. Every row here names a product
 * today — Overview, which did not, is now the group's own label — but the
 * shape holds for the next row that does not.
 */
const NavDropdownLink = forwardRef<
  HTMLAnchorElement,
  {
    link: NavGroupLink;
    tabIndex: number;
    onFocus: () => void;
    onNavigate: () => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLAnchorElement>) => void;
  }
>(function NavDropdownLink({ link, tabIndex, onFocus, onNavigate, onKeyDown }, ref) {
  return (
    <Link
      ref={ref}
      href={link.href}
      role="menuitem"
      tabIndex={tabIndex}
      onFocus={onFocus}
      onClick={onNavigate}
      onKeyDown={onKeyDown}
      className="menu-option flex w-full items-center px-[1.1em] py-[0.42em]"
    >
      <NavGroupLinkLabel link={link} />
    </Link>
  );
});

/**
 * The text inside one `NavGroupLink` — live off `/products` when the row names
 * a `productKey`, the bundled label otherwise. Its own component so the drawer
 * in `SiteHeader.tsx` can put the same answer inside its own flat row, rather
 * than the desktop panel and the mobile drawer asking twice.
 */
export function NavGroupLinkLabel({ link }: { link: NavGroupLink }) {
  return useReadingName(link.productKey ?? "", link.label);
}

/** A thin downward stroke beside the trigger label, in the same hand as `GlobeIcon`. */
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M4 8l8 8 8-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
