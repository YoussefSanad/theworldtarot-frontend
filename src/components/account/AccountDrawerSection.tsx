"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { AccountIcon } from "@/components/account/AccountMenu";
import { SignOutConfirm } from "@/components/account/SignOutConfirm";
import { useSignedIn } from "@/components/account/useSignedIn";
import { ButtonLink } from "@/components/ui/Button";
import { loginCopy, signInPath } from "@/content/login";
import { safeReturnPath } from "@/lib/return-path";
import { customerLabel } from "@/lib/session";

const copy = loginCopy.menu;

/**
 * Signing in from inside the mobile drawer.
 *
 * **~~The form itself~~ — a button to `/login/` from 30 October 2026.** This
 * section used to hold a whole `SignInForm`, on the reasoning that a drawer is
 * already a panel the visitor opened on purpose, so a form inside it is the
 * thing they came for with nothing to discover.
 *
 * What that reasoning missed is the drawer's job. It is a *navigation* panel —
 * a list of places to go — and a two-field form with its own errors, its own
 * busy state and its own keyboard sat inside it as a second kind of thing
 * entirely, on the surface with the least room to hold one. The client
 * reported it as awkward, and it was.
 *
 * So the drawer now does what the rest of it does: it offers somewhere to go.
 * The button sits beside GET MY READING in the same row, which is where a
 * visitor already looks for the two things this masthead can do, and the form
 * lives on `/login/` where there is a page's worth of room for it.
 *
 * **`?next=` is what makes that honest.** Sending somebody away to sign in is
 * only acceptable if they come back, so the button carries where they were and
 * `SignInPanel` returns them there. See `signInHref` below.
 */
export function AccountDrawerSection({ onNavigate }: { onNavigate?: () => void }) {
  const { customer } = useSignedIn();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /*
    **Where the visitor was, so `/login/` can send them back.**

    `safeReturnPath` is the same guard `SignInPanel` reads it with, applied
    here as well rather than trusted to the far end: it refuses `/login/`,
    `/set-password/` and `/reset-password/`, which is exactly what the drawer
    is standing on when somebody opens it from one of those pages. Null then,
    and the button goes to a bare `/login/` — which lands them on
    `landingFor()` afterwards instead of looping them back to a form.

    The query string comes along because a reading page carries its product in
    one, so dropping it would return a buyer to the wrong reading.
  */
  const here = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const next = safeReturnPath(here);
  const signInHref = next === null ? signInPath : `${signInPath}?next=${encodeURIComponent(next)}`;

  /*
    **A bare control, not a section with its own stack.**

    It is a flex item of the masthead's CTA row, so anything this returns sits
    *beside* GET MY READING rather than under it. That is why the signed-in
    address is not here: it is prose rather than a control, and a paragraph in
    a row of buttons either stretches the row to its own length or wraps inside
    one cell of it. `AccountDrawerLine` below is that text, rendered as a row
    of its own underneath — see `SiteHeader`.
  */
  if (customer) {
    /*
      **Matched to the button beside it rather than to the paywall's.**

      `SignOutConfirm`'s own `min-h-11` is a 44px floor it carries for the
      Viewing Room, where it stands alone in a height-capped panel. Here it
      stands next to a `min-h-[2.03em]` CTA — about 28px at the phone floor —
      and the two together read as a button and a bigger button. `fit` is what
      drops it to the row's own height; see the prop, and why it is a prop
      rather than a class passed in.

      `fit` carries the padding and the type as well, so the pair differ in
      their words and in nothing else.
    */
    return <SignOutConfirm fit />;
  }

  /*
    Drawn during `asking` too, when `/me` has not answered — the same trade
    `useSignedIn` makes everywhere. A sign in button offered to somebody who
    turns out to be signed in already costs them a press and a redirect; a
    drawer that sits empty for up to eight seconds costs everybody the way in.

    `onNavigate` closes the drawer, as it does for every other link in here.
    The navigation itself is what `ButtonLink` does.
  */
  return (
    <ButtonLink
      href={signInHref}
      variant="ghost"
      size="fluid"
      className="min-h-[2.03em] gap-[0.5em] px-[1.4em] py-[0.2em] text-nav-sm text-(--header-cta)"
      onClick={onNavigate}
      aria-label={copy.triggerLabel}
    >
      <AccountIcon className="size-[1.1em]" />
      {copy.drawerAction}
    </ButtonLink>
  );
}

/**
 * The address the drawer is signed in as, on a line of its own.
 *
 * **Separated from the button so the row above can be a row of buttons.** An
 * email is the longest thing the masthead ever prints — `customerLabel`
 * truncates it, but it is still prose — and sharing a flex row with two
 * controls made it set that row's width and outrank the CTA beside it.
 *
 * Renders nothing at all when signed out, so the drawer spends no space on it:
 * the row above already says SIGN IN, which is the whole of what there is to
 * report in that state.
 */
export function AccountDrawerLine() {
  const { customer } = useSignedIn();

  if (!customer) return null;

  return (
    <p className="text-note text-ash">
      {copy.signedInAs}{" "}
      {/*
        `title` carries the address in full, because `customerLabel` is allowed
        to shorten it and the one thing this line exists to answer is *which*
        account — see `API_CONTRACT.md` on people paying under one address and
        signing in as another.
      */}
      <span title={customer.email} className="text-champagne">
        {customerLabel(customer)}
      </span>
    </p>
  );
}
