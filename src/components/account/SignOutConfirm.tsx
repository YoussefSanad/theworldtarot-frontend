"use client";

import { useEffect, useRef, useState } from "react";

import { useSignedIn } from "@/components/account/useSignedIn";
import { Button } from "@/components/ui/Button";
import { loginCopy } from "@/content/login";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/session";

const copy = loginCopy.signOutConfirm;

/** How long an armed button waits before going quietly back to rest. */
const ARMED_MS = 4_000;

/**
 * Signing out: one ghost button that carries its own confirmation.
 *
 * **One component for all three places it can happen**, which is more than it
 * sounds: `AccountControl` is rendered twice by `SiteHeader` — the desktop row
 * and the mobile drawer — and `AccountLine` is a third inside the Viewing
 * Room's paywall. Three local renderings agreeing by copied copy is how one of
 * them is later changed alone, and this is one action.
 *
 * ## The journey, and why it is one button
 *
 * At rest it says "Sign out". Pressed once, the words fade out and the door
 * mark fades in, and the glow turns from the site's gold to a warm amber — the
 * button is now armed, and says so by changing colour rather than by asking a
 * question. Pressed again it signs out: the mark gives way to a spinner and
 * the glow returns to normal. Left alone for `ARMED_MS` it quietly disarms.
 *
 * It asks at all because the control sits one slip away from a signed-in
 * customer's own name, in a panel they opened to read that name. The Viewing
 * Room is the case that matters: `API_CONTRACT.md` warns that people pay under
 * one address and sign in as another, so a mis-press there lands somebody back
 * on a paywall mid-purchase.
 *
 * It asks *this* way because signing out of this site is cheap — no unsaved
 * work, and the way back in is two fields. A sentence putting the question to
 * them, with a "stay signed in" to decline, dressed a harmless action up as a
 * dangerous one and turned a one-line account row into a small interrogation.
 *
 * **The button never changes width.** Its three faces are laid on top of one
 * another and the widest one holds the box, so nothing beside it reflows as it
 * moves between them. See `Faces` below, and `BusySwap` in `ui/Button.tsx`
 * for the same idea applied to every other button on the site.
 *
 * ## What must survive, and did
 *
 * - **The local session clears whether or not the API answered.** A masthead
 *   still showing somebody's name after they pressed this is the one outcome
 *   that reads as a fault, and the next `/me` is the truth regardless.
 * - **A refused sign out is caught, not merely `finally`-ed.** It is almost
 *   always a session that had already ended. `AccountControl` learned this the
 *   hard way: its caller discarded the promise, so a rejection that only
 *   passed through `finally` surfaced as an unhandled rejection in the console.
 */
export function SignOutConfirm({
  onConfirmed,
  className,
  tone = "site",
}: {
  /** Called after the local session is cleared, however the API answered. */
  onConfirmed?: () => void;
  className?: string;
  /**
   * Which palette to draw in.
   *
   * `"site"` is the masthead and the drawer. `"panel"` is the Viewing Room's
   * paywall, which draws from the PSD's own champagne rather than through
   * `--color-mist-dim` — inside that panel the ghost button's own ink reads as
   * a grey from a different family.
   */
  tone?: "site" | "panel";
}) {
  const { setCustomer } = useSignedIn();
  const [armed, setArmed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* An armed button goes back to rest on its own, and never outlives the panel
     it was armed in. */
  useEffect(() => {
    if (!armed) return;

    timer.current = setTimeout(() => setArmed(false), ARMED_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [armed]);

  async function press() {
    if (leaving) return;

    if (!armed) {
      setArmed(true);
      return;
    }

    setArmed(false);
    setLeaving(true);

    try {
      await signOut();
    } catch {
      // Ignored on purpose; see the docblock.
    }

    /*
      Published whether or not the call succeeded. Every reader of the store
      sees it at once, which is how the paywall drops back to its signed-out
      screen and the masthead to its icon with no reload between them.
    */
    setCustomer(null);
    setLeaving(false);
    onConfirmed?.();
  }

  return (
    <Button
      variant="ghost"
      size="fluid"
      onClick={() => void press()}
      busy={leaving}
      busyLabel={copy.busyLabel}
      /*
        A hook rather than the label, as `LocaleMenu` and the account trigger
        both carry. `check:login` cannot match this button on its text: the
        words are one of three stacked faces and are `opacity-0` for two of
        them, and `data-` survives all three. `armed` is on it so a check can
        assert the middle state rather than inferring it from a colour.
      */
      data-sign-out={armed ? "armed" : leaving ? "busy" : "idle"}
      /* A screen reader cannot see the amber, so the armed state is said. */
      aria-label={armed ? copy.armedHint : undefined}
      className={cn(
        /*
          **`w-fit`: the button is its own label plus padding, never the
          column's width.** Stretched to the panel it read as a bar rather
          than a control, and the whole point of the stacked faces is that
          "Sign out" — the widest thing it ever shows — is what sets the box.
          A full-width button would have hidden that rather than demonstrated
          it.
        */
        "w-fit px-[1.1em] py-[0.35em]",
        /*
          **The same 44px tap target in all three places.** The paywall's panel
          is height-capped and this button costs it more than the one-line link
          it replaced — about 30px at 1280x800 — so the cap moved rather than
          the control: one sign-out shape everywhere was worth more than the
          four percent. See `check-viewing-room.mjs`, which records the new
          number and why.
        */
        "min-h-11",
        tone === "panel" ? "text-[clamp(12px,0.95vw,15px)] text-[#f9f3d0]" : "text-note",
        /*
          **Amber while armed, the site's gold otherwise.** A warmer light for
          "this press is the one that does it", kept as a glow rather than a
          red fill: the action is reversible in two fields and a danger colour
          would be lying about the stakes.
        */
        armed
          ? "border-[color:rgba(214,138,74,0.75)] shadow-[0_0_18px_rgba(214,138,74,0.45)]"
          : "hover:shadow-(--glow-gold)",
        className,
      )}
    >
      <Faces armed={armed} />
    </Button>
  );
}

/**
 * The button's two resting faces — the words, and the mark — stacked.
 *
 * **Both are always in the document**, one on top of the other in a grid cell
 * they share, so the box is as wide as the wider of them and stays that width
 * whichever is showing. Swapping them with a ternary would resize the button
 * mid-press, which is the one thing this is built to avoid; the spinner that
 * replaces them both does the same trick in `BusySwap`.
 *
 * Only `opacity` animates, for that reason: anything touching a dimension
 * brings the movement back.
 */
function Faces({ armed }: { armed: boolean }) {
  return (
    <span className="grid place-items-center">
      <span
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-300 ease-(--ease-veil)",
          armed ? "opacity-0" : "opacity-100",
        )}
      >
        {copy.idle}
      </span>

      <span
        aria-hidden
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-300 ease-(--ease-veil)",
          armed ? "opacity-100" : "opacity-0",
        )}
      >
        <SignOutMark className="size-[1.35em]" />
      </span>
    </span>
  );
}

/**
 * The sign-out mark: a doorway, and an arrow leaving through it.
 *
 * **Drawn here rather than taken from the client's set**, because her frame
 * never drew this control — the account row is ours, added because
 * `API_CONTRACT.md` warns about people signing in as the wrong person. So it
 * is built to match the chrome around it: a `24` box, `currentColor`, and the
 * 1.5 stroke `AccountIcon` and `GlobeIcon` already share.
 *
 * The doorway is deliberately open on the side the arrow leaves by — a closed
 * rectangle with an arrow through it reads as a sign *in* just as easily, and
 * the two are the same picture mirrored. The gap is what fixes the direction.
 */
function SignOutMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/*
        Three sides of a rounded rectangle, open on the right. It occupies the
        left half (x 3–11) so the arrow has clear air to leave into rather than
        crossing back over the frame it is meant to exit.
      */}
      <path d="M11 4H4.5A1.5 1.5 0 0 0 3 5.5v13A1.5 1.5 0 0 0 4.5 20H11" />
      <path d="M11 12h9" />
      <path d="M16.5 8.5 20 12l-3.5 3.5" />
    </svg>
  );
}
