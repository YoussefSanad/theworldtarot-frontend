import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInForm } from "@/components/account/SignInForm";
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
    `?next=` is read with `useSearchParams`, which is client-side only under a
    static export, so the form sits inside a Suspense boundary rather than
    making the route dynamic — the same shape the redeem and password pages use.
    The fallback is blank: the form renders as soon as the params resolve.
  */
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
