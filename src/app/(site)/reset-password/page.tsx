import type { Metadata } from "next";
import { Suspense } from "react";

import { PasswordForm } from "@/components/account/PasswordForm";
import { resetPasswordCopy } from "@/content/passwords";
import { buildMetadata } from "@/lib/seo";

/**
 * Where somebody chooses a new password after asking for a reset link.
 *
 * Exported as `/reset-password/`, so `FRONTEND_RESET_PASSWORD_PATH` wants the
 * trailing slash for the same reason the claim page does. See that page for the
 * rest of the shape; the only difference here is the endpoint and every word.
 */
export const metadata: Metadata = buildMetadata({
  path: "/reset-password/",
  title: resetPasswordCopy.title,
  index: false,
});

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <PasswordForm flow="reset" />
    </Suspense>
  );
}
