"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { type MenuSurface, useAccountMenu } from "@/components/account/account-menu-store";
import { SignInForm } from "@/components/account/SignInForm";
import { SignOutConfirm } from "@/components/account/SignOutConfirm";
import { useSignedIn } from "@/components/account/useSignedIn";
import { loginCopy } from "@/content/login";
import { cn } from "@/lib/cn";
import { customerLabel } from "@/lib/session";

const EASE_VEIL = [0.4, 0, 0.2, 1] as const;
const copy = loginCopy.menu;

/**
 * Signing in without leaving the page, from under the masthead's account icon.
 *
 * ## It is the third panel in this header, and copies the first
 *
 * `LocaleMenu` in `LocaleControls.tsx` is the one this borrows from, and
 * `NavDropdown` already borrowed the same behaviour: click to toggle,
 * `pointerdown` outside dismisses, Escape closes and hands focus back to the
 * trigger, Tab closes without fighting the browser's own focus movement. Three
 * callers of one interaction rather than three interactions.
 *
 * **Why a dropdown at all.** The Viewing Room's paywall sells a room the
 * visitor is looking at, and its sign-in line used to send them to a page —
 * so somebody who already owned the pass had to leave the thing they had paid
 * for in order to prove they had paid for it. Signing in here, they never move.
 * `/login/` stays for the links that arrive cold, from a mail or a phone.
 *
 * ## Dismissable, over a paywall that is not
 *
 * This panel closes on Escape, on an outside click and on Tab. The paywall
 * underneath it deliberately does none of those. That looks like an
 * inconsistency and is not: there is something usable behind *this* — the
 * paywall, which the visitor can still read and buy from — and nothing usable
 * behind the paywall, because the room it covers is `inert`. Each layer is
 * dismissable exactly when leaving it lands the visitor somewhere they can act.
 */
export function AccountMenu({
  surface,
  onNavigate,
  className,
}: {
  /** Which of `SiteHeader`'s two renderings this is. See the store. */
  surface: MenuSurface;
  /** The drawer's own close, so signing in does not leave it open behind. */
  onNavigate?: () => void;
  className?: string;
}) {
  const { customer } = useSignedIn();
  const { open, setOpen } = useAccountMenu(surface);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const dismissed = useRef(false);

  const reducedMotion = useReducedMotion();
  const panelId = useId();
  const labelId = useId();

  /*
    Declared above the effects that call it: a `const` arrow is not hoisted, and
    an effect closing over it before its initialiser runs would throw.

    It used to reset a confirmation panel on close. There is none now — the
    sign-out control arms itself and disarms on a timer — so closing the panel
    has nothing to remember.
  */
  const toggle = useCallback((next: boolean) => setOpen(next), [setOpen]);

  /* `LocaleMenu`'s dismissal, unchanged. */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      dismissed.current = true;
      toggle(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, toggle]);

  /* Focus returns to the trigger on a close that was not a dismissal. */
  useEffect(() => {
    if (wasOpen.current && !open && !dismissed.current) {
      triggerRef.current?.focus({ preventScroll: true });
    }
    dismissed.current = false;
    wasOpen.current = open;
  }, [open]);

  /*
    **Focus is re-seated whenever the panel's contents are replaced.**

    Two things replace them without the panel closing: `/me` answering while
    it is open, and a sign-out completing. In each case the element focus was on leaves the document, and
    without this the visitor is left on `<body>` — outside the panel, with the
    next Tab starting from the top of the page.

    `PaywallModal` does exactly this for the same reason; see the `state` prop
    it takes.
  */
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (panel?.contains(document.activeElement)) return;

    focusableWithin(panel)[0]?.focus();
  }, [open, customer]);

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      toggle(false);
    } else if (event.key === "Tab") {
      dismissed.current = true;
      toggle(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative flex h-[clamp(1.25rem,1.98vw,2.375rem)] items-center", className)}
    >
      {/*
        The panel's accessible name, as `LocaleMenu` does it beside this: the
        visible panel has a heading of its own only in the signed-out state, so
        the name is held here where both states can reach it.
      */}
      <span id={labelId} className="sr-only">
        {customer ? `${copy.accountOf} ${customerLabel(customer)}` : copy.triggerLabel}
      </span>

      <button
        ref={triggerRef}
        type="button"
        /*
          A hook rather than the label, as `LocaleMenu` and the checkout button
          both carry: `check:login` has to open this panel before it can assert
          on anything inside it, and the words are copy while this is not.
        */
        data-account-menu={surface}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="true"
        /*
          **The name says what the control is for, not only who is signed in.**

          It was `customerLabel(customer)` alone, so a screen reader announced
          "Jane Doe, button, collapsed" — which names a person and never says
          that pressing it reaches an account menu, or that there is a way out
          of the session behind it. The old signed-out link always said "Sign
          in"; this keeps that promise in both states.
        */
        aria-label={customer ? `${copy.accountOf} ${customerLabel(customer)}` : copy.triggerLabel}
        onClick={() => toggle(!open)}
        /*
          Two things named explicitly, both because `LocaleMenu`'s globe beside
          it names them too and nothing here is inherited.

          `text-(--header-ink)`: the mark is drawn with `currentColor`, so
          without a colour it would take the header's own and sit at a different
          weight from the controls that do set one.

          `cursor-pointer`: there is no global rule for it, and this control was
          an `<a>` until the panel arrived — a link gets the hand for free and a
          button does not, so the swap silently took it away.
        */
        className="flex cursor-pointer items-center gap-[0.4em] text-(--header-ink) opacity-90 transition-[opacity,color] duration-300 ease-(--ease-veil) hover:text-(--header-accent) hover:opacity-100 focus-visible:opacity-100"
      >
        {/*
          **The mark alone, with no name beside it.**

          The masthead printed the signed-in customer's label here from the day
          there was a session to print, back when it was the only place on the
          site that said a sign in had worked. The panel says so now, and says
          it better: a label is an *address* for the ordinary buyer — checkout
          never asks a name — which is far longer than the row has to spare, so
          it arrived truncated to 10em and pushed the controls beside it about.

          Nothing is lost by dropping it. Whoever wants to know which account
          they are in presses the mark and reads it in the panel, and the
          trigger's own `aria-label` still names them for a screen reader.
        */}
        <AccountIcon className="size-[clamp(1.25rem,1.98vw,2.375rem)]" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            id={panelId}
            /* Named for a screen reader, as `LocaleMenu`'s panel is: without
               this the open panel has no accessible name and nothing ties it
               to the control that opened it. */
            aria-labelledby={labelId}
            onKeyDown={onPanelKeyDown}
            initial={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE_VEIL }}
            className={cn(
              /*
                Anchored to its own right edge, like `LocaleMenu`'s: these two
                sit at the right end of a right-justified row, so a panel under
                the left edge would hang off the side of the header.

                In the drawer there is no "beside" to open next to — the drawer
                is the panel — so it sits in the flow instead.
              */
              surface === "row"
                ? "absolute top-full right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))]"
                : "mt-4 w-full",
              "rounded-[14px] border border-(--color-gold)/40 bg-night/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-sm",
            )}
          >
            {customer ? (
              /*
                The account, then the way out of it. **The line stays put while
                the control below it arms**, rather than the panel swapping to a
                question: whoever opened this came to read which account they
                are in, and taking that away to ask them something is the one
                thing the panel should not do.

                `gap-4` and `items-start`: the button is a box where the line
                above it is text, so it wants more air than two lines of prose
                would, and it is its own label's width rather than the panel's.
              */
              <div className="flex flex-col items-start gap-4">
                <p className="text-note text-ash">
                  {copy.signedInAs}{" "}
                  <span title={customer.email} className="text-champagne">
                    {customerLabel(customer)}
                  </span>
                </p>
                <SignOutConfirm />
              </div>
            ) : (
              /*
                **Drawn during `asking` too**, when `/me` has not answered and
                `customer` is `undefined`. Not a disabled trigger and not a
                spinner: the answer takes up to eight seconds on a bad
                connection, and a control that is dead for eight seconds is
                worse than a panel that corrects itself when the answer lands.
                `useSignedIn` makes the same trade for the same reason.
              */
              <SignInForm
                variant="compact"
                onSignedIn={() => {
                  /*
                    No navigation. Somebody signing in here is already standing
                    where they chose to be — and every reader of the session
                    store re-decides at once, so the paywall over the Viewing
                    Room drops away without a reload. See `landingFor`, which
                    the sign in *page* uses and this deliberately does not.
                  */
                  toggle(false);
                  onNavigate?.();
                }}
              />
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
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

/**
 * The masthead's account mark, inline so it can take `currentColor`.
 *
 * Moved here with the control it belongs to; `AccountControl` is now a thin
 * host for this component. The geometry came from an `account.svg` in
 * `public/figma/` which was deleted once it was inlined — a linked file could
 * not be recoloured anyway, because `images.unoptimized` serves it as an
 * `<img>` and the page's CSS cannot reach into a replaced element's document.
 *
 * **Stroked line art, where the old mark was a solid silhouette.** `GlobeIcon`
 * beside it is a solid disc, and at the same box height line art reads
 * noticeably lighter than a filled shape — `stroke-width` is the lever if the
 * pair ever look uneven.
 */
export function AccountIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12.1992 12C14.9606 12 17.1992 9.76142 17.1992 7C17.1992 4.23858 14.9606 2 12.1992 2C9.43779 2 7.19922 4.23858 7.19922 7C7.19922 9.76142 9.43779 12 12.1992 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 22C3.57038 20.0332 4.74796 18.2971 6.3644 17.0399C7.98083 15.7827 9.95335 15.0687 12 15C16.12 15 19.63 17.91 21 22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
