/**
 * The words on the sign in page.
 *
 * Beside `passwords.ts` rather than inside it: the two password pages are
 * reached from a link in a mail and know who they are talking to, and this page
 * is reached by anybody and knows nothing at all. It shares their shape and none
 * of their sentences.
 *
 * **Three sentences here are load-bearing rather than decorative**, and each is
 * a rule the backend keeps and the page must not contradict:
 *
 * - `refused` stands for a wrong password, an address with no account, and an
 *   account made by a purchase whose owner has never chosen a password. The API
 *   answers all three identically and will not change, so this wording must
 *   leave every door open and name none of them
 * - `forgot.sent` is shown whatever the answer was, because asking for a link
 *   is always a 200 with the same body. It never says a message was sent — some
 *   of the time nothing was
 * - `refused` sends an unclaimed account to `forgot`, which is the way out of
 *   that state: a reset link sets a first password just as well as a claim
 *   link, so somebody whose receipt link has died is not stranded
 */

export const loginCopy = {
  title: "Sign in",
  heading: "Sign in",
  intro: "For the account your readings are kept with.",
  emailLabel: "Your email",
  passwordLabel: "Your password",
  submitLabel: "Sign in",
  busyLabel: "Signing in…",
  /**
   * One refusal for three causes, and no wording that separates them. The
   * second sentence is the whole exit for somebody whose account was made by a
   * purchase — including the customer of #49's second item, whose claim link
   * has been spent or overwritten.
   */
  refused:
    "Those details do not sign you in. If you bought a reading and have not chosen a password yet, ask for a link below and choose one now.",
  /** `{wait}` is replaced with the wait the API sent, when it sent one. */
  rateLimited: "That is a few too many tries. Try again in {wait}.",
  rateLimitedBriefly: "That is a few too many tries. Wait a moment and try once more.",
  unknownFailure: "Something went wrong at our end. Try again in a moment.",
  forgotPrompt: "Forgotten your password?",

  forgot: {
    heading: "Ask for a link",
    intro:
      "Type the address you bought with. If we have an account for it, a link to choose a password is on its way. It lasts an hour and works once.",
    emailLabel: "Your email",
    submitLabel: "Send me a link",
    busyLabel: "Asking…",
    /**
     * Shown on every success, and success is every answer. Never "sent": the
     * endpoint answers the same way for an address we have never seen.
     */
    sent: "If we have an account for that address, a link is on its way. Look for it in the next few minutes.",
    /**
     * The only refusal this panel can draw.
     *
     * `POST /api/v1/forgot-password` validates `email` as `required|string|email`
     * and **deliberately carries no `exists` rule** — the backend's own comment
     * says an `exists` would "turn a validation error into the answer to 'does
     * this person have an account'". So the only 422 it can answer is an address
     * that is malformed or missing, and naming that leaks nothing about who has
     * an account. It is also the only thing the person can act on.
     */
    invalidAddress: "That does not look like an email address. Check it and try again.",
    rateLimited: "That is a few too many asks. Try again in {wait}.",
    rateLimitedBriefly: "That is a few too many asks. Wait a moment and try once more.",
    unknownFailure: "Something went wrong at our end. No link has been sent. Try again in a moment.",
    backPrompt: "Back to sign in",
  },
} as const;

/** Where a signed-in customer lands. There is no member area to land in yet. */
export const afterSignIn = "/readings/";

/**
 * The sign in page's own address, exported so the three places that send people
 * there cannot drift apart: the masthead in `site.ts`, and the dead-link way out
 * of `PasswordForm`. Trailing slash because the export is a directory of
 * `index.html` files and a link without one costs a redirect.
 */
export const signInPath = "/login/";
