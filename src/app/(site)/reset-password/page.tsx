import type { Metadata } from "next";
import { Suspense } from "react";

import { PasswordForm } from "@/components/account/PasswordForm";
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
  return (
    <Suspense fallback={null}>
      <PasswordForm flow="reset" />
    </Suspense>
  );
}
