import { pickCopy } from "../lib/copy.ts";
import { currentLocale } from "../lib/locale.ts";
import en from "./locales/en/passwords.json" with { type: "json" };
import es from "./locales/es/passwords.json" with { type: "json" };

/** The words on this screen, in whichever language it is being read. */
const copy = pickCopy(en, { es }, currentLocale());

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
  /**
   * The way out of a dead link, and the only one there is. Both `linkFailure`
   * sentences send somebody to the sign in page, which **exists since #49** —
   * before it did, this was an instruction to visit a 404. Rendered as a link
   * beside the failure rather than woven into the sentence, so the copy stays
   * one string for a translator.
   */
  signInPrompt: string;
  rateLimited: string;
  unknownFailure: string;
};

export const setPasswordCopy: PasswordPageCopy = copy.set;

export const resetPasswordCopy: PasswordPageCopy = copy.reset;
