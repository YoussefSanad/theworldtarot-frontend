"use client";

import { useState } from "react";

import { useSignedIn } from "@/components/account/useSignedIn";
import { Button } from "@/components/ui/Button";
import { loginCopy } from "@/content/login";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/session";

const copy = loginCopy.signOutConfirm;

/**
 * Signing out: one ghost button, one press.
 *
 * **One component for all three places it can happen**, which is more than it
 * sounds: `AccountControl` is rendered twice by `SiteHeader` — the desktop row
 * and the mobile drawer — and `AccountLine` is a third inside the Viewing
 * Room's paywall. Three local renderings agreeing by copied copy is how one of
 * them is later changed alone, and this is one action.
 *
 * ## Why it does not ask first
 *
 * It used to. The first press armed it — the words gave way to a door mark and
 * the glow turned amber — and only a second press within four seconds signed
 * out, as a guard against a slip next to the customer's own name, mostly in
 * the Viewing Room's paywall where people pay under one address and sign in as
 * another (`API_CONTRACT.md`).
 *
 * In use the second press read as the first one not working. Signing out of
 * this site is cheap — no unsaved work, and the way back in is two fields — so
 * the guard cost every deliberate press more than it ever saved a mistaken
 * one. Pressed now, it shows a spinner and signs out.
 *
 * **The button never changes width.** The spinner is laid over the words
 * rather than swapped in for them, so nothing beside it reflows; see
 * `BusySwap` in `ui/Button.tsx`.
 *
 * ## What must hold
 *
 * - **The local session clears whether or not the API answered.** A masthead
 *   still showing somebody's name after they pressed this is the one outcome
 *   that reads as a fault, and the next `/me` is the truth regardless.
 * - **A refused sign out is caught, not merely `finally`-ed.** It is almost
 *   always a session that had already ended. `AccountControl` learned this the
 *   hard way: its caller discarded the promise, so a rejection that only
 *   passed through `finally` surfaced as an unhandled rejection in the console.
 */
export function SignOutButton({
  onSignedOut,
  className,
  tone = "site",
  fit = false,
}: {
  /** Called after the local session is cleared, however the API answered. */
  onSignedOut?: () => void;
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
  /**
   * Whether to keep the 44px floor.
   *
   * **It is on by default and off in the drawer's button row**, which is the
   * one place this control stands beside another button rather than alone.
   * `min-h-11` against the CTA's `min-h-[2.03em]` — about 28px at the phone's
   * type floor — made the pair read as a button and a bigger button, which is
   * exactly the mismatch the row was rebuilt to remove.
   *
   * A prop rather than a class passed in, because `cn` is a plain join: both
   * `min-h` classes would ship and the cascade, not the caller, would pick the
   * winner. Nothing in the drawer loses a tap target by it — the row's own
   * buttons set the height there, and they are the same height.
   */
  fit?: boolean;
}) {
  const { setCustomer } = useSignedIn();
  const [leaving, setLeaving] = useState(false);

  async function press() {
    if (leaving) return;

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
    onSignedOut?.();
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
        both carry. The words are `invisible` under the spinner while it
        works, and the checks would rather not depend on copy that a
        translation changes; `data-` is there in both states and says which.
      */
      data-sign-out={leaving ? "busy" : "idle"}
      className={cn(
        /*
          **`w-fit`: the button is its own label plus padding, never the
          column's width.** Stretched to the panel it read as a bar rather
          than a control.
        */
        /*
          `fit` takes the drawer row's padding rather than this one's, for the
          reason on the prop: the two buttons in that row have to be one
          shape, and `cn` is a join rather than a merge, so a caller cannot
          override a utility that is already here.
        */
        fit ? "w-fit px-[1.4em] py-[0.2em]" : "w-fit px-[1.1em] py-[0.35em]",
        /*
          **The same 44px tap target in all three places.** The paywall's panel
          is height-capped and this button costs it more than the one-line link
          it replaced — about 30px at 1280x800 — so the cap moved rather than
          the control: one sign-out shape everywhere was worth more than the
          four percent. See `check-viewing-room.mjs`, which records the new
          number and why.
        */
        fit ? "min-h-[2.03em]" : "min-h-11",
        tone === "panel"
          ? "text-[clamp(12px,0.95vw,15px)] text-[#f9f3d0]"
          : fit
            ? "text-nav-sm"
            : "text-note",
        "hover:shadow-(--glow-gold)",
        className,
      )}
    >
      {copy.idle}
    </Button>
  );
}
