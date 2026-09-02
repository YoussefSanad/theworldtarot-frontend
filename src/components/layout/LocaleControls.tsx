"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { cn } from "@/lib/cn";
import type { ApiCurrency, ApiLanguage } from "@/lib/api";
import { highlightedCurrency, useCurrency } from "@/lib/currency";
import { useCurrencyOptions } from "@/lib/currencies";
import { usePaymentInFlight } from "@/lib/payment-in-flight";
import { useLanguageOptions } from "@/lib/languages";
import { currentLocale } from "@/lib/locale";

const EASE_VEIL = [0.4, 0, 0.2, 1] as const;

/**
 * The language and currency selectors.
 *
 * **Currency is wired and language is not.** That is the shape of the pair
 * rather than an unfinished edge — they were always going to be two different
 * mechanisms, and only one of them is a thing this app can do on its own:
 *
 * - **Currency is a preference**, sent as `?currency=` on the product fetch and
 *   kept in `localStorage`. Choosing one re-prices the homepage tiles and both
 *   readings-index surfaces from a single call, and survives a reload. The site
 *   never converts a price itself; the backend holds a real price per currency.
 *   `lib/currency.ts` holds the choice and `lib/catalogue.ts` re-asks on it
 * - **Language is a route**, so its options become `Link`s to a locale segment
 *   and the list comes from `GET /api/v1/languages`. A client-side toggle would
 *   leave `html lang` reading `en` over Spanish copy and would be invisible to
 *   crawlers, which is why it is not one. The segment itself is deferred to
 *   #69, so `setLanguage` does nothing today. See `lib/locale.ts` and
 *   `docs/adr/0004-language-is-a-path-segment.md`
 *
 * See `docs/plans/language-and-currency-selector.md` for the whole route.
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
 * One language as a row in either control.
 *
 * **`native_name` over `label`.** A language switcher is one of the few
 * controls read by people who cannot read the language it is currently in,
 * which is exactly when "Español" works and "Spanish" does not. The backend
 * does not send the field yet — `YoussefSanad/TheWorldTarot#66` asks for it —
 * so this reads the English name until the day it ships, and then stops.
 *
 * No flags, on purpose. A flag names a country and these name languages, which
 * are not the same set; and a colour bitmap would be the only saturated thing
 * in a header drawn entirely in gold on night.
 */
function languageRows(languages: readonly ApiLanguage[]): SelectOption[] {
  return languages.map(({ code, label, native_name }) => ({
    value: code,
    label: native_name ?? label,
    short: code.toUpperCase(),
  }));
}

/**
 * One currency as a row in either control.
 *
 * The code is both the value and the label — "USD" is what the row reads, and
 * the symbol is a glyph printed ahead of it. No names ("US Dollar"): three
 * codes in a 13em panel are read faster than three names, and the symbol
 * already says which is which to anybody who does not know the codes.
 */
function currencyRows(currencies: readonly ApiCurrency[]): SelectOption[] {
  return currencies.map(({ code, symbol }) => ({ value: code, label: code, symbol }));
}

/**
 * What the two controls draw and what pressing a row does.
 *
 * **`highlighted`, not `currency`.** The bare word is in `CONTEXT.md`'s _Avoid_
 * list for exactly the collision this type used to contain: the value read here
 * is the **resolved** currency where there is one, while the setter writes a
 * **chosen** one — two of the three concepts under a single name, which is the
 * failure the glossary entry predicts. `choose` is the store's own word for the
 * write; see `lib/currency.ts`.
 */
export type LocaleSelection = {
  language: string;
  setLanguage: (value: string) => void;
  /** The currency row drawn as current — `highlightedCurrency`'s answer. */
  highlighted: string;
  /** Records an explicitly chosen currency, which is what starts travelling. */
  choose: (code: string) => void;
};

/**
 * Language does not move yet, so this is where that is written down rather than
 * a `setLanguage` that silently does nothing.
 *
 * Unreachable in practice: the language group is drawn only at two entries or
 * more, and `/languages` answers one. It exists because `LocaleSelection` is
 * one shape for both halves, and because the day #69 lands this is the line
 * that becomes a navigation.
 */
const LANGUAGE_DOES_NOT_MOVE_YET = (): void => {};

/**
 * Where the choice lives.
 *
 * **This hook was always the seam**, and replacing its body is the whole of the
 * wiring — both call sites in `SiteHeader` needed no edit, which is what the
 * plain state it used to hold was standing in for.
 *
 * The two halves come from different places and neither is component state:
 *
 * - **Currency** reads `lib/currency.ts`, a module-scoped store, because the
 *   header renders this twice and the things that act on the choice are `lib/`
 *   modules that are not the header's descendants. `highlightedCurrency` is the
 *   rule for which row is drawn as chosen, and it prefers what the backend
 *   resolved over what was asked for
 * - **Language** reads `currentLocale()`, which is `"en"` until #69 puts a
 *   segment in the path
 */
export function useLocaleSelection(): LocaleSelection {
  const { chosen, resolved, choose } = useCurrency();

  return {
    language: currentLocale(),
    setLanguage: LANGUAGE_DOES_NOT_MOVE_YET,
    highlighted: highlightedCurrency({ chosen, resolved }),
    choose,
  };
}

/** The mobile drawer's shape: both groups flat, every option one tap away. */
export function LocaleControls({ selection, className }: { selection: LocaleSelection; className?: string }) {
  const { language, setLanguage, highlighted, choose } = selection;
  const currencies = useCurrencyOptions();
  const languages = useLanguageOptions();

  /*
    Currency only. Language prices nothing, so freezing it would be freezing a
    control for a reason that is not its own.
  */
  const frozen = usePaymentInFlight();

  return (
    <div className={cn("flex flex-col gap-4 text-nav-sm", className)}>
      {/* Empty until there are two languages to choose between — see `lib/languages.ts`. */}
      {languages.length > 0 ? (
        <SegmentRow label="Language" options={languageRows(languages)} value={language} onChange={setLanguage} />
      ) : null}
      <SegmentRow
        label="Currency"
        options={currencyRows(currencies)}
        value={highlighted}
        onChange={choose}
        frozen={frozen}
      />
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
  const { language, setLanguage, highlighted, choose } = selection;
  const currencies = useCurrencyOptions();
  const languages = useLanguageOptions();
  const hasLanguages = languages.length > 0;
  const [open, setOpen] = useState(false);

  // Currency only, for the reason `LocaleControls` above gives.
  const frozen = usePaymentInFlight();

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
        // `check:currency` opens this panel before it can assert on a row —
        // both controls live behind `open` inside `AnimatePresence`, so neither
        // is in the export. A hook rather than the label, as
        // `data-hosted-checkout` is on the checkout button and for the same
        // reason: the words are copy and copy changes.
        data-locale-menu
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
            {/*
              Both the group and the hairline under it go when there is nothing
              to choose between — a divider above the only group in the panel
              would be a rule under a heading that is not there. The globe
              itself stays either way: its panel then holds Currency alone,
              which is a smaller control and not a missing one.
            */}
            {hasLanguages ? (
              <>
                <LocaleGroup
                  label="Language"
                  options={languageRows(languages)}
                  value={language}
                  onChange={setLanguage}
                  autoFocus={open}
                />
                <div className="my-[0.3em] border-t border-(--edge-gold)" />
              </>
            ) : null}
            <LocaleGroup
              label="Currency"
              options={currencyRows(currencies)}
              value={highlighted}
              onChange={choose}
              autoFocus={open && !hasLanguages}
              frozen={frozen}
            />
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
  frozen = false,
}: {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** A payment is in flight, so this group announces itself and refuses presses. */
  frozen?: boolean;
  /**
   * Focuses the current choice the moment the panel opens. Only whichever group
   * is drawn first takes it, which is Language where there is one and Currency
   * where there is not.
   */
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
          aria-disabled={frozen}
          tabIndex={index === activeIndex ? 0 : -1}
          onFocus={() => setActiveIndex(index)}
          onClick={() => {
            if (frozen) return;
            onChange(option.value);
          }}
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
  frozen = false,
}: {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** A payment is in flight, so this row announces itself and refuses presses. */
  frozen?: boolean;
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
            aria-disabled={frozen}
            onClick={() => {
              if (frozen) return;
              onChange(option.value);
            }}
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
