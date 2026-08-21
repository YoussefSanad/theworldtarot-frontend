"use client";

import { useState } from "react";

import { SelectMenu, type SelectOption } from "@/components/ui/SelectMenu";
import { cn } from "@/lib/cn";

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
 * the header shows these twice — as pills on desktop and as flat rows in the
 * mobile drawer — and the two must never disagree. `useLocaleSelection` is the
 * seam where the real state arrives later.
 */

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

type LocaleControlsProps = {
  selection: LocaleSelection;
  /**
   * `pills` for the desktop action row — two ghost pills that open a menu.
   * `inline` for the mobile drawer — every option flat on the panel, one tap to
   * switch, so a menu never opens inside a menu.
   */
  variant?: "pills" | "inline";
  className?: string;
};

export function LocaleControls({ selection, variant = "pills", className }: LocaleControlsProps) {
  const { language, currency, setLanguage, setCurrency } = selection;

  if (variant === "inline") {
    return (
      <div className={cn("flex flex-col gap-4 text-nav-sm", className)}>
        <SegmentRow label="Language" options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
        <SegmentRow label="Currency" options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-[0.6em]", className)}>
      <SelectMenu label="Language" options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
      <SelectMenu label="Currency" options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
    </div>
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
