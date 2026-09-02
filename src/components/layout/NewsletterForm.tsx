"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { newsletter } from "@/content/site";
import {
  type NewsletterFailure,
  readNewsletterFailure,
  subscribeToNewsletter,
} from "@/lib/newsletter";

/** Nothing yet, in flight, or answered. A refusal is `failure`, and returns here to `idle`. */
type Status = "idle" | "sending" | "sent";

const MESSAGE_FADE_SECONDS = 0.35;
const LABEL_FADE_SECONDS = 0.3;

/**
 * Mailchimp signup, from the footer. The markup and the HTML5 validation are
 * unchanged from the inert version that stood here until this was wired up; what
 * is new is that it submits, and that it has somewhere to put the answer.
 *
 * `onSubmit` calls `preventDefault()` and there is deliberately **no
 * `noValidate`**: the browser runs `required` and `type="email"` before it fires
 * a submit event at all, so native validation still gates every send and this
 * handler only ever sees an address and a ticked box the browser already
 * accepted. That is also why `consent` is not read here — a submit event cannot
 * happen without it, and `lib/newsletter.ts` sends it as the constant it is.
 *
 * **The blurb slot is where every answer goes.** The confirmation and the three
 * refusals each replace those two lines rather than mounting under them, which
 * is the same swap the coming-soon page makes with its lead-in, and for the same
 * reason: a message that arrives in the flow pushes the consent row and the
 * button down under whatever thumb just pressed them. The `min-h` holds the box
 * at two lines of `text-note` so the swap moves nothing, and `aria-live` sits on
 * the box rather than on the message — a live region that mounts already holding
 * its text is unreliable, and this one is present from first paint.
 *
 * **Refusals are not coloured**, which is the site's habit rather than this
 * form's invention: `Refusal` in `account/FormPanel.tsx` and the checkout
 * panel's `Note` both sit in the surrounding ink and are marked up as alerts
 * instead. The markup differs here and only here — those mount a `role="alert"`
 * paragraph, and this box is present from first paint and holds three different
 * things over its life, so it is a `polite` region that gets updated.
 *
 * **The consent box gates the form with `required` alone**, where the
 * `origin/coming-soon-page` form also holds the button `disabled` until it is
 * ticked. Dropping that is deliberate. Native validation already refuses the
 * press and says why, in the browser's own words attached to the box itself,
 * and a control that is dead before anybody has done anything is the reading
 * the client rejected on the checkout panel — see the note on `locked` below.
 *
 * There is no abort on unmount and no need of one: this form is rendered by the
 * site layout, which survives every client-side route change, so the only thing
 * that unmounts it is a full page load that discards the request anyway.
 *
 * That same fact is why **a sent form stays sent as somebody moves around the
 * site**, which is deliberate rather than incidental. The footer is one instance
 * for the whole visit, so the confirmation travels with it and a second signup
 * cannot be pressed out of a page further on. A reload starts it over.
 */
export function NewsletterForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState<NewsletterFailure | null>(null);
  const reducedMotion = useReducedMotion();

  /*
    In flight, or answered. Either way the form has had its press and must not
    take a second one.

    **The inputs go `disabled` and the button does not**, which is the split
    `HostedCheckoutButton` already draws. What the client rejected there was a
    genuinely `disabled` control: it "reads as a bug rather than as 'not yet'",
    so that button announces itself with `aria-disabled` and refuses the press
    in its handler, and this one does the same — it also keeps a submit in the
    tab order, which `disabled` would take out from under anybody driving this
    form by keyboard. The inputs are the other case and are not a frame anybody
    presses: leaving them live would offer edits to a request that has already
    been answered, with no way to act on the edit.
  */
  const locked = status !== "idle";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (locked) return;

    const fields = new FormData(event.currentTarget);
    const email = fields.get("email");
    const firstName = fields.get("firstName");

    if (typeof email !== "string") return;

    /*
      The last refusal deliberately **stays on screen while the retry is in
      flight**, and is replaced only by the answer. Clearing it here put the
      blurb back for the length of the request — marketing copy re-entering a
      live region, and announcing itself, over the top of the sentence the
      visitor was in the middle of acting on.
    */
    setStatus("sending");

    try {
      await subscribeToNewsletter({
        email,
        name: typeof firstName === "string" ? firstName : undefined,
      });
      setFailure(null);
      setStatus("sent");
    } catch (cause: unknown) {
      /*
        Loud here and one sentence on the page. From the outside a refused
        address and a backend that has grown a shape we cannot read look
        identical, and they need telling apart from in here.
      */
      console.error("The newsletter signup was refused.", cause);

      setFailure(readNewsletterFailure(cause));
      // Back to idle rather than to a fourth state: the form is live again and
      // the message beside it is what says the last attempt failed.
      setStatus("idle");
    }
  }

  const message =
    status === "sent"
      ? { key: "sent", lines: newsletter.success }
      : failure
        ? { key: failure.kind, lines: [newsletter.errors[failure.kind]] }
        : { key: "blurb", lines: newsletter.blurb };

  const label =
    status === "sending"
      ? newsletter.sendingLabel
      : status === "sent"
        ? newsletter.sentLabel
        : newsletter.submitLabel;

  /*
    The two crossfades below are the same six lines twice and are deliberately
    not shared. A `<p>` is what the message slot wants and is not allowed inside
    a `<button>`, so a common wrapper would have to take the element as a
    parameter to serve both — an abstraction earned by nothing but the line
    count.
  */
  const fadeMessage = { duration: reducedMotion ? 0 : MESSAGE_FADE_SECONDS };
  const fadeLabel = { duration: reducedMotion ? 0 : LABEL_FADE_SECONDS };

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[36.25rem] flex-col items-center gap-[0.6em]">
      <h2 className="font-display text-h2 text-ash">{newsletter.heading}</h2>

      <div className="grid w-full grid-cols-1 items-center gap-x-[0.5em] gap-y-[0.3em] lg:grid-cols-[auto_1fr]">
        <label htmlFor="newsletter-first-name" className="sr-only lg:not-sr-only lg:text-right lg:text-nav lg:text-ash">
          FIRST NAME:
        </label>
        <input
          id="newsletter-first-name"
          name="firstName"
          type="text"
          autoComplete="given-name"
          disabled={locked}
          /* The backend's own limit on `name`, so a longer one cannot be typed
             here and then refused as a 422 nobody can see the cause of. */
          maxLength={40}
          placeholder="First name"
          className="field w-full px-3 py-2 text-note disabled:opacity-50 lg:placeholder:text-transparent"
        />

        <label htmlFor="newsletter-email" className="sr-only lg:not-sr-only lg:text-right lg:text-nav lg:text-ash">
          EMAIL:
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={locked}
          /* RFC 5321's maximum addressable length, and the number the backend's
             own validation uses. */
          maxLength={254}
          placeholder="Email"
          className="field w-full px-3 py-2 text-note disabled:opacity-50 lg:placeholder:text-transparent"
        />
      </div>

      {/*
        Two lines of text-note at its 1.1 leading is 2.2em, which reserves the
        blurb's full height for every state that replaces it. It holds wherever
        the blurb is two lines, which is every width the footer's column is wide
        enough to keep it there; below that the box grows with whichever message
        is taller, and the footer has room to give.
      */}
      <div
        className="stack min-h-[2.2em] w-full place-items-center text-center text-note text-[#fcfbf8]"
        aria-live="polite"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={message.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeMessage}
          >
            {message.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Figma leaves ~29px above and ~24px below the consent row; the form gap covers ~10px of that. */}
      <label className="mt-[clamp(0.75rem,1vw,1.2rem)] mb-[clamp(0.5rem,0.73vw,0.875rem)] flex items-start gap-[0.5em] text-fine text-[#fcfbf8]">
        <input
          type="checkbox"
          name="consent"
          required
          disabled={locked}
          className="size-[1.125em] shrink-0 appearance-none border border-ash bg-transparent checked:bg-gold disabled:opacity-50"
        />
        <span>{newsletter.consent}</span>
      </label>

      <Button
        type="submit"
        className="lowercase"
        aria-disabled={locked}
        aria-busy={status === "sending"}
      >
        {/*
          The label crossfades rather than cutting, so the button reads as
          changing state instead of being swapped out. `mode="wait"` is what
          keeps its width from twitching: the outgoing label holds the width
          until its fade finishes, so the width only moves in the instant when
          neither is visible. `md` carries `whitespace-nowrap`, so no label ever
          wraps while that settles.
        */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeLabel}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </Button>
    </form>
  );
}
