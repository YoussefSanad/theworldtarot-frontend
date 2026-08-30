"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { cn } from "@/lib/cn";

const EASE_VEIL = [0.4, 0, 0.2, 1] as const;

/**
 * The language and currency selectors, as chrome only.
 *
 * **Nothing here is wired to anything yet, and that is the whole scope.**
 * Choosing changes what the control says and nothing else — no request carries
 * the choice, no price re-renders, no route changes, and nothing is remembered
 * between page loads. This exists so the controls can be seen, laid out and
 * approved before the plumbing behind them is built.
 *
 * What each one becomes is already decided and they are not the same thing:
 *
 * - **Language is a route**, so its options become `Link`s to a locale segment
 *   and the list comes from `GET /api/v1/languages`. A client-side toggle would
 *   leave `html lang` reading `en` over Spanish copy and would be invisible to
 *   crawlers, which is why it is not one. See `lib/locale.ts`
 * - **Currency is a preference**, sent as `?currency=` on the product fetch and
 *   kept in `localStorage`. The site never converts a price itself; the backend
 *   holds a real price per currency. See `docs/plans/products-api-wiring.md`
 *
 * The selection is held by whoever renders this rather than inside it, because
 * the header shows these twice — as one icon and its panel on desktop and as
 * flat rows in the mobile drawer — and the two must never disagree.
 * `useLocaleSelection` is the seam where the real state arrives later.
 *
 * **Desktop was a pair of ghost pills ahead of the CTA until the client called
 * it too much: a second decision point competing with "Get My Reading" before a
 * visitor had even reached it.** `LocaleMenu` is the replacement — a single
 * icon in the account/bag row, opening one panel with both choices grouped
 * inside. The mobile drawer is untouched: the client's objection was about
 * desktop prominence, and the drawer is already a secondary screen with no
 * CTA to compete against.
 */

export type SelectOption = {
  value: string;
  /** What the row in the panel reads: "English", "USD". */
  label: string;
  /** What a compact control reads once this is the choice. Falls back to `label`. */
  short?: string;
  /** A glyph printed ahead of the label. Decorative. */
  symbol?: string;
};

/**
 * Placeholder options.
 *
 * **The site is English-only today.** The three besides English are here so the
 * control can be shown working, and are the one thing in this file that is
 * knowingly untrue — the real list is whatever `/api/v1/languages` answers, and
 * the control renders nothing at all while that list holds a single entry.
 *
 * No flags, on purpose. A flag names a country and these name languages, which
 * are not the same set; and a colour bitmap would be the only saturated thing in
 * a header drawn entirely in gold on night.
 */
export const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "es", label: "Español", short: "ES" },
  { value: "fr", label: "Français", short: "FR" },
  { value: "de", label: "Deutsch", short: "DE" },
];

/**
 * The three the backend actually sells in, per `products-api-wiring.md`. Real,
 * unlike the languages above — but still a constant here rather than a fetch,
 * because there is no endpoint that lists them yet.
 */
export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: "USD", label: "USD", symbol: "$" },
  { value: "EUR", label: "EUR", symbol: "€" },
  { value: "GBP", label: "GBP", symbol: "£" },
];

export type LocaleSelection = {
  language: string;
  currency: string;
  setLanguage: (value: string) => void;
  setCurrency: (value: string) => void;
};

/**
 * Where the choice lives, for now.
 *
 * Plain state, so a refresh forgets it. The body of this hook is what gets
 * replaced when the choice becomes real — a route segment for the language and a
 * stored preference for the currency — and every call site reading it as a hook
 * today is a call site that needs no edit then.
 */
export function useLocaleSelection(): LocaleSelection {
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("USD");

  return { language, currency, setLanguage, setCurrency };
}

/** The mobile drawer's shape: both groups flat, every option one tap away. */
export function LocaleControls({ selection, className }: { selection: LocaleSelection; className?: string }) {
  const { language, currency, setLanguage, setCurrency } = selection;

  return (
    <div className={cn("flex flex-col gap-4 text-nav-sm", className)}>
      <SegmentRow label="Language" options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
      <SegmentRow label="Currency" options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
    </div>
  );
}

/**
 * The desktop control: one icon in the account/bag row, opening a single panel
 * with both groups stacked inside — Language, a hairline, Currency.
 *
 * Anchored to its own right edge (`right-0`) rather than centred, so the panel
 * stays flush with the header's own right edge. That is also why this sits
 * *after* account and bag in `SiteHeader` rather than before: were it first in
 * the row, its panel would open underneath its siblings instead of past them.
 *
 * Two `role="listbox"` groups in one popover rather than one control per
 * choice — a visitor reaches either setting through the same click. Escape and
 * Tab are handled once, on the panel: Escape closes and returns focus to the
 * icon, Tab closes without fighting the browser's own focus movement. Arrow
 * keys stay inside whichever group has focus rather than wrapping into the
 * other — Down at the last language does nothing, rather than landing on the
 * first currency.
 */
export function LocaleMenu({ selection, className }: { selection: LocaleSelection; className?: string }) {
  const { language, currency, setLanguage, setCurrency } = selection;
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const dismissed = useRef(false);

  const reducedMotion = useReducedMotion();
  const panelId = useId();
  const labelId = useId();

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
      className={cn("relative flex h-[clamp(1.25rem,1.98vw,2.375rem)] items-center", className)}
    >
      <span id={labelId} className="sr-only">
        Language and currency
      </span>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-labelledby={labelId}
        className={cn(
          "inline-flex h-full cursor-pointer items-center justify-center p-0 opacity-90 transition-[opacity,color] duration-300 ease-(--ease-veil) hover:opacity-100 focus-visible:opacity-100",
          open && "text-gold opacity-100",
        )}
      >
        <GlobeIcon className="size-[clamp(1.25rem,1.98vw,2.375rem)]" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            id={panelId}
            aria-labelledby={labelId}
            onKeyDown={onPanelKeyDown}
            className="menu-panel absolute right-0 top-[calc(100%+0.75em)] z-30 flex w-[13em] flex-col overflow-hidden py-[0.35em] text-nav-sm"
            initial={reducedMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: EASE_VEIL }}
          >
            <LocaleGroup
              label="Language"
              options={LANGUAGE_OPTIONS}
              value={language}
              onChange={setLanguage}
              autoFocus={open}
            />
            <div className="my-[0.3em] border-t border-(--edge-gold)" />
            <LocaleGroup label="Currency" options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** One labelled listbox inside `LocaleMenu`'s panel — a heading plus its rows. */
function LocaleGroup({
  label,
  options,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Focuses the current choice the moment the panel opens. Only the first group takes this. */
  autoFocus?: boolean;
}) {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    if (autoFocus) optionRefs.current[selectedIndex]?.focus({ preventScroll: true });
    // Only the transition into `open` should steal focus, not every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const focusIndex = (index: number) => {
    setActiveIndex(index);
    optionRefs.current[index]?.focus({ preventScroll: true });
  };

  const onOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusIndex(Math.min(index + 1, options.length - 1));
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
        focusIndex(options.length - 1);
        break;
    }
  };

  return (
    <div role="listbox" aria-label={label}>
      <div aria-hidden className="px-[1.1em] pt-[0.5em] pb-[0.2em] text-fine tracking-[0.08em] text-mist-dim">
        {label.toUpperCase()}
      </div>

      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(element) => {
            optionRefs.current[index] = element;
          }}
          type="button"
          role="option"
          aria-selected={option.value === value}
          tabIndex={index === activeIndex ? 0 : -1}
          onFocus={() => setActiveIndex(index)}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => onOptionKeyDown(event, index)}
          className="menu-option flex w-full items-center gap-[0.6em] px-[1.1em] py-[0.42em]"
        >
          <span aria-hidden className="menu-option-dot shrink-0" />
          {option.symbol ? (
            <span aria-hidden className="w-[0.9em] text-center">
              {option.symbol}
            </span>
          ) : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Drawn rather than shipped, like every other mark in this header that has no
 * Figma export — a globe reads as "language and region" without a label, which
 * a person icon and a bag icon also manage without one.
 */
/**
 * `login-icon.webp` and `bag-icon.webp` are solid filled silhouettes, not line
 * art, so a thin stroked circle reads noticeably lighter next to them at the
 * same box height — same height, far less ink. This is a solid disc instead,
 * with the meridian and equator cut out through a mask rather than drawn in a
 * paint colour, so the cutout stays transparent against whatever the header's
 * own backdrop happens to be at that scroll position, not a fixed guess at it.
 */
function GlobeIcon({ className }: { className?: string }) {
  const maskId = useId();

  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <mask id={maskId} maskUnits="userSpaceOnUse">
        <circle cx="12" cy="12" r="10" fill="white" />
        <path
          d="M2 12h20M12 2c2.6 2.7 4 6.2 4 10s-1.4 7.3-4 10c-2.6-2.7-4-6.2-4-10s1.4-7.3 4-10Z"
          fill="none"
          stroke="black"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </mask>
      <circle cx="12" cy="12" r="10" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}

/**
 * One flat row of choices: its name on the left, the options as chips on the
 * right. The chosen chip takes the gold and the glow every other current thing
 * on this site takes — the carousel dot, the focused field, a hovered button.
 *
 * `aria-pressed` rather than `aria-selected`, because these are buttons in a
 * group and not options in a list. Nothing here opens, so there is no listbox
 * for an option to belong to.
 */
function SegmentRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <span className="text-mist-dim tracking-[0.01em]">{label.toUpperCase()}</span>

      <div role="group" aria-label={label} className="flex flex-wrap items-center gap-[0.4em]">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className="segment flex min-h-[1.9em] items-center gap-[0.3em] px-[0.7em] py-[0.15em]"
          >
            {option.symbol ? <span aria-hidden>{option.symbol}</span> : null}
            {option.short ?? option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
