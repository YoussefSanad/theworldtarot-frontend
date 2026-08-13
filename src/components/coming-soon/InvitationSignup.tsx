"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { InvitationForm } from "@/components/coming-soon/InvitationForm";
import { comingSoon } from "@/content/coming-soon";
import { siteName } from "@/content/site";
import { requestInvitation } from "@/lib/api";

export type SubmitStatus = "idle" | "sending" | "sent" | "error";

const EXIT_SECONDS = 0.45;
/**
 * Shorter than the hero's 1.5s enter (RevealTrigger). That one is a reveal and
 * is allowed to take its time; this is an answer to a button press and should
 * feel prompt.
 */
const ENTER_SECONDS = 0.9;

/**
 * The coming-soon page's signup interaction: the lead-in line, the site name
 * beneath it, and the form — all three, because the lead-in is what the
 * confirmation replaces and the form is what produces it, so one component has
 * to own both ends.
 *
 * Renders a **fragment**, not a wrapper. Its three children land as direct
 * children of ComingSoon's `flex flex-col items-center gap-2` column, so the
 * page's existing spacing survives this being extracted verbatim. The gold site
 * name is here purely because it sits between the other two — it takes no part
 * in the interaction.
 *
 * This exists as its own client component so `ComingSoon` can stay a server
 * component. Hoisting `status` into the page instead would drag the whole
 * composition — video, logo, backdrop — across the client boundary for the sake
 * of one state variable.
 *
 * The swap slot borrows RevealTrigger's construction (see
 * `components/reveal/RevealTrigger.tsx`): both states centre inside a `.stack`
 * box with a `min-h`, so the one-line lead-in giving way to two lines of
 * confirmation cannot move the form underneath it. That matters more here than
 * it does in the hero — this page is the site root and is deliberately sized to
 * one viewport, so a line's worth of growth is the difference between no
 * scrollbar and one.
 */
export function InvitationSignup() {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const reducedMotion = useReducedMotion();
  const abort = useRef<AbortController | null>(null);

  // The request outlives the component only if someone leaves mid-flight, which
  // on a one-page site means a reload — but the setState after it would still be
  // a leak, and an AbortController is what the reveal's fetches already use.
  useEffect(() => () => abort.current?.abort(), []);

  const submit = async (email: string) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    setStatus("sending");

    try {
      await requestInvitation(email, { signal: controller.signal });
      setStatus("sent");
    } catch (error) {
      // An abort is us, not the backend, and must not paint an error.
      if (controller.signal.aborted) return;
      console.error(error);
      setStatus("error");
    }
  };

  const skipMotion = Boolean(reducedMotion);

  const enterFrom = skipMotion ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" };
  const visible = skipMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" };
  const exit = skipMotion
    ? { opacity: 0, transition: { duration: 0 } }
    : {
        opacity: 0,
        y: -8,
        filter: "blur(4px)",
        transition: { duration: EXIT_SECONDS, ease: "easeOut" as const },
      };
  const enterTransition = {
    duration: skipMotion ? 0 : ENTER_SECONDS,
    ease: "easeOut" as const,
  };

  return (
    <>
      {/*
        Two lines at the tightened 1.15 leading is 2.3em, so this reserves the
        confirmation's full height while the one-line lead-in is still showing
        and the swap moves nothing. It holds for every width where the lead-in
        is one line and the confirmation is two, which is all of them down to
        about 360px; below that both states can wrap and the box grows with
        whichever is taller. Raise this, not the copy, if the confirmation ever
        gains a third line.

        That reservation is also what used to read as padding around the
        lead-in: the box is always taller than the one line inside it, so the
        column's `gap-2` was stacking on top of half an empty line above and
        below. Tightening the leading from text-caption's 1.36 and pulling the
        neighbours in with `-my-1` cuts that back — both are constants applied
        in either state, so neither can move anything — and the height they give
        up goes to the logo above.

        `aria-live` sits on this box rather than on the confirmation itself —
        unlike RevealTrigger, which puts it on the entering node. A live region
        announces changes *within* it, so one that mounts already holding its
        message is unreliable; this one is present from first paint and is only
        ever updated.
      */}
      <div
        className="stack -my-1 min-h-[2.35em] w-full place-items-center text-balance text-caption leading-[1.15] text-champagne"
        aria-live="polite"
      >
        <AnimatePresence mode="wait">
          {status === "sent" ? (
            <motion.p key="sent" initial={enterFrom} animate={visible} transition={enterTransition}>
              {comingSoon.success.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </motion.p>
          ) : (
            // No enter animation and no `animate`: this is the page's resting
            // state, already painted before anyone can act on it. It only ever
            // needs to know how to leave.
            <motion.p key="lead-in" initial={false} exit={exit}>
              {comingSoon.leadIn}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <p className="font-serif text-nav text-gold lowercase">{siteName}</p>

      <InvitationForm status={status} onSubmit={submit} />
    </>
  );
}
