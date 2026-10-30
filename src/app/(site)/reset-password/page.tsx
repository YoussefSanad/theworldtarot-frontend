import type { Metadata } from "next";
import { Suspense } from "react";

import { PasswordForm } from "@/components/account/PasswordForm";
import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { resetPasswordCopy } from "@/content/passwords";
import { siteName } from "@/content/site";

/**
 * Where somebody chooses a new password after asking for a reset link.
 *
 * Exported as `/reset-password/`, so `FRONTEND_RESET_PASSWORD_PATH` wants the
 * trailing slash for the same reason the claim page does. See that page for the
 * rest of the shape; the only difference here is the endpoint and every word.
 */
export const metadata: Metadata = {
  title: `${resetPasswordCopy.title} — ${siteName}`,
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  /*
    A `div`, not a `main`: `(site)/layout.tsx` already renders the page's one
    `<main>`, and a second nested inside it is invalid HTML — it also made
    `getByRole("main")` ambiguous and broke `check:set-password`.
  */
  return (
    <div data-page="account">
      {/* The same ground the sign in page takes: these three are one surface
          to a visitor, and two of them had no atmosphere at all. */}
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
        <PasswordForm flow="reset" />
      </Suspense>
    </div>
  );
}
