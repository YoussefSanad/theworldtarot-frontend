"use client";

import { useEffect, useRef } from "react";

import { useAccountMenu } from "@/components/account/account-menu-store";
import { SignInForm } from "@/components/account/SignInForm";
import { SignOutConfirm } from "@/components/account/SignOutConfirm";
import { useSignedIn } from "@/components/account/useSignedIn";
import { loginCopy } from "@/content/login";
import { customerLabel } from "@/lib/session";

const copy = loginCopy.menu;

/**
 * Signing in from inside the mobile drawer, as a section of it.
 *
 * **Not the dropdown with a narrower panel.** The masthead's desktop control is
 * an icon you press to reveal a panel, because a desktop row has no space to
 * hold a form and nothing to push out of the way. The drawer has the opposite
 * problem: it is already a full-height panel the visitor opened on purpose, so
 * an icon inside it is a second thing to find and press before the form they
 * came for appears — and on a phone that icon sits in a row of other icons,
 * where it reads as decoration rather than as the way in.
 *
 * So here the form is simply present, under a heading, the way the navigation
 * below it is present. Nothing to discover.
 *
 * It shares `useAccountMenu` with the dropdown all the same, for the one case
 * that needs it: the Viewing Room's paywall asks for an account menu, the store
 * publishes `"drawer"`, `SiteHeader` opens the drawer, and this section scrolls
 * itself into view so the visitor arrives at the form rather than at the top of
 * a drawer with the form somewhere below the fold.
 */
export function AccountDrawerSection({ onNavigate }: { onNavigate?: () => void }) {
  const { customer } = useSignedIn();
  const { open, setOpen } = useAccountMenu("drawer");
  const ref = useRef<HTMLDivElement>(null);

  /*
    Asked for from outside — the paywall's sign-in line — rather than pressed
    here. The form is always on screen in this drawer, so there is nothing to
    reveal; what the request means is "put them in front of it".

    The flag is cleared immediately: it is a one-shot errand, not a state this
    section sits in, and leaving it set would re-scroll on every later render.
  */
  useEffect(() => {
    if (!open) return;

    ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    ref.current?.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
    setOpen(false);
  }, [open, setOpen]);

  return (
    <section ref={ref} aria-label={copy.triggerLabel} className="flex flex-col items-start gap-4">
      {customer ? (
        /*
          The account, then the way out of it — the line stays while the
          control below it arms. Whoever opened this drawer came to read which
          account they are in; replacing that with a question takes away the
          thing they came for.
        */
        <>
          <p className="text-note text-ash">
            {copy.signedInAs}{" "}
            <span title={customer.email} className="text-champagne">
              {customerLabel(customer)}
            </span>
          </p>
          <SignOutConfirm />
        </>
      ) : (
        /*
          Drawn during `asking` too, when `/me` has not answered. A form that
          turns out to be unnecessary is a smaller fault than a drawer that sits
          empty for up to eight seconds; `useSignedIn` makes the same trade.
        */
        <SignInForm
          variant="compact"
          onSignedIn={() => {
            /*
              The drawer closes, and the page underneath re-decides on its own
              because every reader of the session store sees the change at once
              — including the Viewing Room's paywall, which is the reason
              somebody might be signing in from here at all.
            */
            onNavigate?.();
          }}
        />
      )}
    </section>
  );
}
