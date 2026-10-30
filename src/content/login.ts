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
 *   account made when an order settled whose owner has never chosen a password.
 *   The API
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
   * second sentence is the whole exit for somebody whose account was made by an
   * order settling — including the customer of #49's second item, whose claim
   * link has been spent or overwritten.
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

  /**
   * The masthead's dropdown, which is where most people sign in now.
   *
   * It shares every sentence above that it can — the fields, the refusals, the
   * forgot-password panel are the same words in a smaller box, because they are
   * the same errand. What is here is only what the page has no need of: a name
   * for the trigger, and the signed-in state the page never draws.
   */
  menu: {
    /**
     * The trigger's accessible name while nobody is signed in, and the panel's
     * while it is holding the sign in form.
     */
    triggerLabel: "Sign in",
    /**
     * The first half of the trigger's name once somebody is signed in, and the
     * panel's name in that state: "Account: jane@example.com".
     *
     * **Without it a screen reader hears only the customer's own name** on that
     * button — "Jane Doe, button, collapsed" — which says who they are and
     * nothing about what pressing it does. The signed-out link it replaced
     * always said "Sign in", so this keeps that promise in the other state.
     */
    accountOf: "Account:",
    /** Followed by whatever `customerLabel` answers for them. */
    signedInAs: "Signed in as",
    /**
     * The drawer's sign in button, which replaced the form that used to sit
     * there.
     *
     * **In the client's capitals, because it stands beside GET MY READING** in
     * the same row and the two read as a pair. The icon beside it is
     * `headerActions.account.icon`, the mark the desktop row already uses for
     * this, so the two surfaces name the same thing the same way.
     *
     * It is a link to `/login/` rather than a form: see the note on
     * `AccountDrawerSection`, where the form used to be.
     */
    drawerAction: "SIGN IN",
  },

  /**
   * The sign out button, which carries its own confirmation.
   *
   * **It shows one word and two pictures**, and the two pictures are why there
   * are only three strings here: armed, it is a door mark and a warmer glow;
   * working, a spinner. Neither is text, so neither changes the button's width
   * — see `SignOutConfirm`, where that is the whole point of the arrangement.
   *
   * **No warning language, deliberately.** Signing out of this site costs
   * nothing: no unsaved work, no member area to be thrown out of, and the way
   * back in is the same two fields it always was. Copy that said "are you
   * sure?" would dress a harmless action up as a dangerous one.
   */
  signOutConfirm: {
    /**
     * The button at rest.
     *
     * The only words this control ever shows. Armed, it swaps them for a door
     * mark and a warmer glow; working, for a spinner. Both of those are
     * pictures, so both are announced through the two strings below rather
     * than drawn as text — which is also what lets the button hold one width
     * through the whole journey.
     */
    idle: "Sign out",
    /**
     * What a screen reader hears once the button is armed, in place of the
     * amber it cannot see.
     *
     * The confirmation is a second press rather than a question, because
     * signing out of this site costs nothing — no unsaved work, and the way
     * back in is two fields. A sentence putting the question to them, with a
     * "stay signed in" to decline, dressed a harmless action up as a dangerous
     * one. It is guarded at all because the control sits one slip away from a
     * signed-in customer's own name.
     */
    armedHint: "Press again to confirm signing out",
    /** Announced while the sign out is in flight; the button shows a spinner. */
    busyLabel: "Signing out…",
  },
} as const;

/**
 * The sign in page's own address, exported so the three places that send people
 * there cannot drift apart: the masthead in `site.ts`, and the dead-link way out
 * of `PasswordForm`. Trailing slash because the export is a directory of
 * `index.html` files and a link without one costs a redirect.
 */
export const signInPath = "/login/";
