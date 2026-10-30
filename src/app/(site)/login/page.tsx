import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInPanel } from "@/components/account/SignInPanel";
import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { loginCopy } from "@/content/login";
import { siteName } from "@/content/site";

/**
 * Where somebody signs in, and where they ask for a link when they cannot.
 *
 * **The masthead has pointed here since before this page existed** — the href
 * came from the client's navigation document — and so do both password pages'
 * dead-link sentences and the backend's own refusal message. All four were a
 * 404 until this route landed; see #49.
 *
 * `trailingSlash` in next.config.mjs means the export is `/login/`.
 *
 * The reset-link request is on this page rather than in a ticket of its own
 * because nothing else in this app can ask for one: `/reset-password/` is where
 * a token lands, not where one is requested, and until this form existed
 * "ask for a new link from the sign in page" was an instruction nobody could
 * follow.
 */
export const metadata: Metadata = {
  title: `${loginCopy.title} — ${siteName}`,
  // A sign in form is not a landing page, and the two password pages beside it
  // are already out of the index for the same reason.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  /*
    **A Suspense boundary, like the password pages, and for their reason.**

    This page carried a comment saying it needed none because nothing here read
    the query string. That stopped being true when `?next=` arrived: `SignInPanel`
    reads it with `useSearchParams`, which is client-only under a static export,
    so the boundary is what keeps this route static instead of making the whole
    thing dynamic.

    The fallback is blank on purpose, as it is there: for the fraction of a
    second before the query string is read there is nothing true to say, and a
    heading that flashes into a different heading reads as a fault.
  */
  /*
    A `div`, not a `main`: `(site)/layout.tsx` already renders the page's one
    `<main>`, and a second nested inside it is invalid HTML — it also made
    `getByRole("main")` ambiguous and broke `check:set-password`.
  */
  return (
    <div data-page="account">
      {/*
        **No `relative` here, and that is what keeps the band away.**

        `PageAtmosphere` is `absolute inset-0`, so it resolves against the
        nearest positioned ancestor. With `relative` on this wrapper that was
        this div, which begins below the header and ends at the bottom of the
        form — so the sky's `#091828` stopped there, and the footer's own top
        margin let a strip of `body`'s `--color-night` (`#081525`) show through
        between them. Two blues a step apart meeting in a hard edge: the
        visible horizontal band above the footer.

        Without it the atmosphere resolves against the layout column, which
        `(site)/layout.tsx` is positioned for and which spans header, main and
        footer — so there is no seam left to see. `CardReferencePage` omits it
        for this same reason; see the longer note there.
      */}
      <PageAtmosphere variant="card-reference" />
      <Suspense fallback={null}>
        <SignInPanel />
      </Suspense>
    </div>
  );
}
