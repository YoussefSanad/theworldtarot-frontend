"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { cn } from "@/lib/cn";

const EASE_VEIL = [0.4, 0, 0.2, 1] as const;

export type SelectOption = {
  value: string;
  /** What the row in the menu reads: "English", "USD". */
  label: string;
  /** What the pill reads once this is the choice. Falls back to `label`. */
  short?: string;
  /** A glyph printed ahead of the label, in both places. Decorative. */
  symbol?: string;
};

type SelectMenuProps = {
  /** Names the control for screen readers — "Language", "Currency". */
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Which edge of the pill the panel hangs from. */
  align?: "start" | "end";
  className?: string;
};

/**
 * A ghost pill that opens a short list of choices.
 *
 * Built out of the chrome already on the page rather than beside it: the
 * trigger is a `.btn-ghost` carrying the header CTA's box metrics, so it sits on
 * that row as a sibling and not as a visitor, and the panel is the same fill
 * behind the same edge (see `.menu-panel` in globals.css).
 *
 * **A listbox, not a menu.** The distinction is the keyboard: arrows move
 * through the options, Home and End jump to the ends, Enter or Space takes the
 * focused one, Escape closes and hands focus back to the pill, and Tab closes on
 * the way past. Focus lands on the current choice when it opens, so the list is
 * entered where the reader already is rather than at the top.
 *
 * Escape and the focus return mirror the drawer in `SiteHeader` deliberately,
 * with one difference: closing by pressing outside does *not* pull focus back,
 * because that press has already put focus somewhere the visitor chose.
 *
 * Deliberately **not** a native `select`, whose option list is drawn by the
 * operating system and cannot take the gold-on-night treatment the rest of the
 * header wears.
 */
export function SelectMenu({ label, options, value, onChange, align = "end", className }: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wasOpen = useRef(false);
  const dismissed = useRef(false);

  const reducedMotion = useReducedMotion();
  const listId = useId();
  const labelId = useId();
  const valueId = useId();

  const selected = options.find((option) => option.value === value) ?? options[0];
  const selectedIndex = Math.max(0, options.indexOf(selected));

  const openMenu = useCallback(() => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }, [selectedIndex]);

  const choose = useCallback(
    (next: string) => {
      onChange(next);
      setOpen(false);
    },
    [onChange],
  );

  /*
    Anywhere outside closes it, on press rather than on click, so the panel is
    gone before whatever was pressed reacts to the same gesture.
  */
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

  /* The panel mounts in the commit this effect runs after, so the ref is set. */
  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus({ preventScroll: true });
  }, [open, activeIndex]);

  useEffect(() => {
    if (wasOpen.current && !open && !dismissed.current) {
      triggerRef.current?.focus({ preventScroll: true });
    }
    dismissed.current = false;
    wasOpen.current = open;
  }, [open]);

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();

    if (open) {
      setActiveIndex((index) => step(index, event.key === "ArrowDown" ? 1 : -1, options.length));
    } else {
      openMenu();
    }
  };

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => step(index, event.key === "ArrowDown" ? 1 : -1, options.length));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        dismissed.current = true;
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <span id={labelId} className="sr-only">
        {label}
      </span>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${valueId}`}
        className="btn btn-ghost min-h-[2.03em] gap-[0.5em] px-[1.1em] py-[0.2em] text-nav-sm"
      >
        <span id={valueId} className="flex items-center gap-[0.35em]">
          {selected.symbol ? <span aria-hidden>{selected.symbol}</span> : null}
          {selected.short ?? selected.label}
        </span>
        <ChevronIcon open={open} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            onKeyDown={onListKeyDown}
            className={cn(
              "menu-panel absolute top-[calc(100%+0.5em)] z-30 flex min-w-full flex-col overflow-hidden py-[0.35em] text-nav-sm",
              align === "end" ? "right-0" : "left-0",
            )}
            initial={reducedMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: EASE_VEIL }}
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={option.value === selected.value}
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => choose(option.value)}
                className="menu-option flex items-center gap-[0.6em] px-[1.1em] py-[0.42em]"
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Wraps at both ends, so a held arrow key never dead-ends on a three-item list. */
function step(index: number, delta: number, length: number): number {
  return (index + delta + length) % length;
}

/**
 * Drawn rather than shipped, like the rest of this chrome, so it paints in
 * `currentColor` and follows the pill from mist to champagne on hover.
 */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn(
        "h-[0.55em] w-[0.55em] transition-transform duration-300 ease-[var(--ease-veil)]",
        open && "rotate-180",
      )}
    >
      <path
        d="M5 8.5 12 15.5 19 8.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
