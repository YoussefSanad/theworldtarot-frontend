"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type SubmitEvent, useState } from "react";

import type { SubmitStatus } from "@/components/coming-soon/InvitationSignup";
import { Button } from "@/components/ui/Button";
import { comingSoon } from "@/content/coming-soon";

const LABEL_FADE_SECONDS = 0.3;
const STATUS_FADE_SECONDS = 0.25;

/**
 * Only the sent state renames the button. Sending deliberately does not: the
 * wait is shown by the loader beside the button, and a button that renames
 * itself mid-press reads as being swapped out rather than as being busy.
 */
const BUTTON_LABEL: Record<SubmitStatus, string> = {
  idle: comingSoon.submitLabel,
  sending: comingSoon.submitLabel,
  sent: comingSoon.sentLabel,
  error: comingSoon.submitLabel,
};

/**
 * Started as a copy of NewsletterForm.tsx and still shares its markup, `.field`
 * styling and HTML5 validation — but no longer its inertness: this one submits.
 * The request itself, and everything that happens after it, belongs to
 * `InvitationSignup`, which owns `status` because the confirmation copy it
 * drives lives outside this form.
 *
 * `onSubmit` calls `preventDefault()` and there is deliberately **no
 * `noValidate`**: the browser runs `required` and `type="email"` before it fires
 * a submit event at all, so native validation still gates every send and this
 * handler only ever sees an address the browser already accepted.
 *
 * Once sent, the email and consent inputs go `disabled` alongside the button.
 * Disabling the button alone would leave two live controls attached to a
 * request that has already been answered, and the visitor editing them would
 * have no way to act on the edit. The form stays on the page rather than fading
 * out so the column keeps its height — see the note on the swap slot in
 * `InvitationSignup`.
 *
 * Nothing in this form moves as the status changes. The two transient states —
 * the loader and the failure message — share one absolutely positioned slot
 * beside the button, and the button's own label is crossfaded in place. That is
 * a correction rather than a flourish: the failure message used to mount into
 * the form's flow, and with no `/subscribe` route to succeed against, every
 * press bounced the fine print down and back.
 */
export function InvitationForm({
  status,
  onSubmit,
}: {
  status: SubmitStatus;
  onSubmit: (email: string) => void;
}) {
  const [consentChecked, setConsentChecked] = useState(false);
  const reducedMotion = useReducedMotion();

  const inFlight = status === "sending";
  const locked = inFlight || status === "sent";

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locked) return;

    const email = new FormData(event.currentTarget).get("email");
    if (typeof email === "string") onSubmit(email);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-[36.25rem] flex-col items-center gap-[0.6em]">
      <div className="flex w-full items-center gap-[0.5em]">
        <label htmlFor="invitation-email" className="shrink-0 text-nav text-champagne">
          {comingSoon.emailLabel}
        </label>
        <input
          id="invitation-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={locked}
          /* RFC 5321's maximum addressable length. */
          maxLength={50}
          className="field w-full px-3 py-2 text-note"
        />
      </div>

      <label className="flex items-start gap-[0.5em] text-fine text-champagne">
        <input
          type="checkbox"
          name="consent"
          required
          disabled={locked}
          checked={consentChecked}
          onChange={(event) => setConsentChecked(event.target.checked)}
          className="mt-[0.2em] size-[1.125em] shrink-0 appearance-none border border-ash bg-transparent checked:bg-gold disabled:opacity-50"
        />
        <span className="text-left">{comingSoon.consent}</span>
      </label>

      {/*
        The wrapper exists only to give the status slot something to anchor to.
        It is a content-width flex item, so it is exactly the button's box and
        contributes no height of its own.
      */}
      <div className="relative flex items-center">
        <Button type="submit" className="lowercase" disabled={!consentChecked || locked} aria-busy={inFlight}>
          {/*
            The label crossfades rather than cutting, so the button reads as
            changing state instead of being swapped out.

            `mode="wait"` is what keeps the button's width from twitching: the
            outgoing label stays mounted, holding its width, until its fade
            finishes, so the width only changes in the instant when neither
            label is visible. Overlapping the two instead would animate the
            width under legible text. The `md` size class in Button.tsx carries
            `whitespace-nowrap`, so no label ever wraps while that settles.
          */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={BUTTON_LABEL[status]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : LABEL_FADE_SECONDS }}
            >
              {BUTTON_LABEL[status]}
            </motion.span>
          </AnimatePresence>
        </Button>

        {/*
          The loader and the failure message share one slot, absolutely
          positioned off the button's right edge. `absolute` is the whole point:
          both states used to sit in the form's flow, so every failed attempt
          shoved the fine print down and pulled it back up. Out of flow, neither
          can move anything.

          The slot is narrow by necessity — the button leaves roughly 92px of
          slack inside its column — so the message wraps to about three short
          lines. `w-[7em]` is set in `em` of text-fine so that wrap stays about
          thirteen characters at every breakpoint instead of collapsing on
          mobile. Any overflow past the form's edge is harmless: `<main>` is
          `overflow-hidden`, and the container is centred with empty page to its
          right.
        */}
        <span className="absolute top-1/2 left-full ml-[0.6em] flex w-[7em] -translate-y-1/2 items-center text-left text-fine leading-tight text-champagne">
          <AnimatePresence mode="wait" initial={false}>
            {inFlight ? (
              <motion.span
                key="loader"
                aria-hidden
                className="loader size-[1.1em] shrink-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : STATUS_FADE_SECONDS }}
              />
            ) : status === "error" ? (
              <motion.span
                key="error"
                role="alert"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : STATUS_FADE_SECONDS }}
              >
                {comingSoon.error}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </div>

      <p className="rounded-full bg-night/25 px-[1.1em] py-[0.5em] text-center text-fine text-champagne">
        {comingSoon.finePrint.map((line) => (
          <span key={line} className="block text-balance">
            {line}
          </span>
        ))}
      </p>
    </form>
  );
}
