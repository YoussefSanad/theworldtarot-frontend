/**
 * The words on the two password pages.
 *
 * **They are two sets, not one set with a noun swapped.** Somebody who has just
 * bought something and never had a password is not resetting anything, and
 * telling them they are reads as a mistake on our side. The pages share a form
 * and share nothing that a person reads.
 *
 * `linkFailure` is the wording that stands in for every reason a link can be
 * dead — used, expired, malformed, or an account already claimed. One string,
 * because the page must not say which. See `readPasswordFailure` in
 * `src/lib/passwords.ts`.
 */

export type PasswordPageCopy = {
  title: string;
  heading: string;
  intro: string;
  passwordLabel: string;
  confirmLabel: string;
  submitLabel: string;
  busyLabel: string;
  successHeading: string;
  successBody: string;
  /** Shown for a dead link, and never accompanied by the reason. */
  linkFailure: string;
  rateLimited: string;
  unknownFailure: string;
};

export const setPasswordCopy: PasswordPageCopy = {
  title: "Set your password",
  heading: "Set your password",
  intro:
    "Your account is made and your order is with it. Choose a password and it is yours to sign in with.",
  passwordLabel: "Choose a password",
  confirmLabel: "Type it again",
  submitLabel: "Set my password",
  busyLabel: "Setting…",
  successHeading: "Your account is ready",
  successBody: "You can sign in with your new password whenever you like.",
  // Not "reset" and not "again": this link works once, and the way back is a
  // sign in attempt rather than a second copy of the same mail.
  linkFailure:
    "This link is no longer valid. If you have already set a password, sign in with it. If not, ask for a new link from the sign in page.",
  rateLimited: "That is a few too many tries. Wait a moment and try once more.",
  unknownFailure: "Something went wrong at our end. Your password has not been changed. Try again in a moment.",
};

export const resetPasswordCopy: PasswordPageCopy = {
  title: "Choose a new password",
  heading: "Choose a new password",
  intro: "Pick a new password for your account. The old one stops working as soon as you do.",
  passwordLabel: "New password",
  confirmLabel: "Type it again",
  submitLabel: "Change my password",
  busyLabel: "Changing…",
  successHeading: "Your password has been changed",
  successBody: "You can sign in with it now.",
  linkFailure:
    "This link is no longer valid. Reset links last an hour and work once. Ask for a new one from the sign in page.",
  rateLimited: "That is a few too many tries. Wait a moment and try once more.",
  unknownFailure: "Something went wrong at our end. Your password has not been changed. Try again in a moment.",
};
