"use client";

import { useEffect, useId, useRef } from "react";

import { cn } from "@/lib/cn";

/** Which of the panel's two screens is showing. */
export type PaywallScreen = "unlock" | "payment";

/**
 * The dialog the room is sold through (`384:28`, 772x713).
 *
 * **There is no way out of it, and that is deliberate.** No Escape handler, no
 * backdrop click, no close button — her frame draws none, and the ticket is
 * explicit about why: there is nothing usable behind it. A dismissable paywall
 * over an inert room would only appear to work, leaving a visitor looking at a
 * room they still cannot touch and no way to get the panel back.
 *
 * ## The focus trap is the accessibility of that decision
 *
 * If a visitor cannot leave the dialog with the mouse, they must not be able
 * to leave it with Tab either — otherwise keyboard users wander into a room
 * that is `inert` to pointers but reachable to them, which is a worse version
 * of the same confusion. Tab from the last focusable returns to the first and
 * Shift+Tab from the first wraps to the last.
 *
 * Rendered only in the two refused states. A member never mounts this at all,
 * which is how they never see a frame of it.
 */
export function PaywallModal({
  screen,
  state,
  heading,
  children,
}: {
  screen: PaywallScreen;
  /**
   * The access state the panel is drawn for.
   *
   * Here only so focus is re-seated when it changes: signing out swaps the
   * panel's contents — the account line goes, the sign-in link arrives —
   * without changing `screen`, and the element focus was on is removed from
   * the document. Without this the visitor is left on `<body>`, outside the
   * trap, until they press Tab.
   */
  state: string;
  /** The panel's own heading text, which labels the dialog. */
  heading: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headingId = useId();

  /* The body does not scroll behind a dialog there is no way to dismiss. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /*
    Focus starts inside, so the first Tab is already within the trap — and is
    re-seated whenever the panel's contents are replaced, which is either
    screen changing or the access state changing underneath it.
  */
  useEffect(() => {
    const panel = panelRef.current;
    if (panel?.contains(document.activeElement)) return;

    focusableWithin(panel)[0]?.focus();
  }, [screen, state]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      const focusable = focusableWithin(panelRef.current);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrapping by hand rather than letting the browser walk out of the
      // dialog: the room behind is `inert` to a pointer but a stray Tab would
      // still reach the masthead.
      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      /*
        No `onClick` here. A backdrop that dismisses would strand the visitor
        in an inert room — see the note above.
      */
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain p-4"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={cn(
          "relative w-full max-w-[772px]",
          /*
            **Her 713px is a third of a 2132px artboard, not of a screen.**
            Transcribing her type sizes literally made the panel 66% of a
            1080p viewport and 89% of a 1280x800 laptop — it read as a page
            rather than as a panel over a room, which is the whole point of
            a paywall you can see the room behind.

            So the type below is scaled to the viewport rather than to her
            artboard, and this cap is the backstop rather than the mechanism:
            the content now fits inside it on every desktop, and it only
            bites on a short window.
          */
          "max-h-[min(88dvh,640px)] overflow-y-auto",
          "rounded-[18px] border border-[color:var(--gold-line,#d4b06a)]/60",
          "bg-[#0b1522]/95 px-[clamp(20px,3.4vw,50px)] py-[clamp(20px,2.2vw,36px)]",
          "shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-sm",
        )}
      >
        <h2
          id={headingId}
          className="text-center font-display text-[clamp(24px,2.1vw,34px)] leading-tight text-[#f9f3d0]"
        >
          {heading}
        </h2>

        {children}
      </div>
    </div>
  );
}

/** Everything inside the panel a Tab can land on, in document order. */
function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];

  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}
