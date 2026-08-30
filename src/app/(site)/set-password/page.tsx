import type { Metadata } from "next";
import { Suspense } from "react";

import { PasswordForm } from "@/components/account/PasswordForm";
import { setPasswordCopy } from "@/content/passwords";
import { siteName } from "@/content/site";

/**
 * Where somebody claims the account that was made for them when they bought
 * something. The receipt links here, by a path the backend holds as
 * configuration, so **this route existing is what stops that link being a 404**.
 *
 * `trailingSlash` in next.config.mjs means the export is `/set-password/`. The
 * backend's default is `/set-password`, which would cost every receipt a
 * redirect hop, so `FRONTEND_SET_PASSWORD_PATH` wants the slash.
 *
 * A separate page from the reset, not a mode of it. Nothing is being reset for
 * a person who has never had a password.
 */
export const metadata: Metadata = {
  title: `${setPasswordCopy.title} — ${siteName}`,
  // Reached only from a link in a mail, and it carries a single-use token in
  // the address. Nothing about it belongs in an index.
  robots: { index: false, follow: false },
};

export default function SetPasswordPage() {
  /*
    The form reads the token and the email with `useSearchParams`, which is
    client-side only under a static export, so it renders inside a Suspense
    boundary rather than making the whole route dynamic. The fallback is blank
    on purpose: for the fraction of a second before the query string is read
    there is nothing true to say, and a heading that flashes into a different
    heading reads as a fault.
  */
  return (
    <Suspense fallback={null}>
      <PasswordForm flow="claim" />
    </Suspense>
  );
}
