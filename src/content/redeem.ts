/**
 * The words a **querent** reads: on `/redeem/`, and — from 3 September 2026
 * (#82) — on the confirmation a spent code now lands on. `asked` and `lost`
 * are read at `/checkout/complete/` and everything above them on this page.
 *
 * **One file for the two, because it is one person being spoken to** in one
 * voice across two addresses, and the sentence that promises the reading has to
 * sit beside `giftReceived`'s reason for promising nothing. It is the same
 * arrangement `content/checkout.ts` already has, from the other end.
 *
 * **All of it is ours.** The client's walkthrough draws a stripped-down page —
 * the reading's name, a question box and a submit — and
 * `docs/adr/0003-redemption-is-a-page-of-its-own.md` argues that page down to
 * its opposite: the **querent** is the one person in this flow who never chose
 * the reading they are holding, so they get the presentation half in full and
 * lose only what sells. What her frame does not carry is any of the sentences
 * below, so these go to her with `giftingComing` and the rest of the gift copy
 * in `content/reading-pages.ts`.
 *
 * ## Three states, and the one that is deliberately missing
 *
 * A code is **valid**, **already redeemed**, or **unknown**. There is no
 * expired state, here or anywhere else in this feature: gift codes do not
 * expire — the backend's `docs/adr/0005-gift-codes-do-not-expire.md` — and
 * writing the sentence is how the concept gets into a product that decided
 * against it.
 *
 * **Already redeemed is said plainly and is not hidden.** It cannot hide behind
 * the answer an unknown code gets, because it is a state the real recipient has
 * to be told about; what closes the guessing oracle that creates is the entropy
 * in the code itself, plus the backend's throttle.
 *
 * ## Nothing here says who the gift is from
 *
 * The lookup does not answer it, deliberately: the endpoint answers to anybody
 * holding a bearer credential, which is not necessarily the person the mail was
 * sent to. The **gift signature** is in the recipient's own mail and stays
 * there. So no sentence on this page may be written as though the name were
 * available — see `CONTEXT.md` on **Recipient** and **Querent**.
 */

export const redeemCopy = {
  /**
   * The route's `<title>`, and the one string that has to be true before a code
   * has resolved — which, on a static export, is every string in the exported
   * HTML.
   */
  pageTitle: "Redeem a Gift",

  /**
   * The screen before a reading is known: no code in the address, or one that
   * did not resolve.
   *
   * It is a plain centred column rather than a reading page, because there is
   * no reading yet to draw one of. The moment a code resolves the page becomes
   * that reading's own, which is the whole of ADR 0003.
   */
  entry: {
    heading: "Redeem a Gift",
    /**
     * Two phrases, so the line breaks where it is written rather than where the
     * measure happens to fall. See the note at the top of `content/readings.ts`.
     */
    body: ["Someone has given you a reading.", "Enter the code from your email to open it."],
    label: "Your gift code",
    placeholder: "Enter your gift code…",
    submit: "FIND MY GIFT",
    /** While the code is being looked up. Not a claim that it is any good. */
    looking: "Looking up your code…",
    /**
     * Under the field, because a code typed off a printed mail is the case this
     * field exists for and the spacing is the first thing somebody worries
     * about. It is true: the backend normalises before it looks anything up.
     */
    forgiving: "Capitals and spacing do not matter.",
  },

  /**
   * A code that resolved to nothing.
   *
   * **It says the same thing for a code that never existed, one mistyped past
   * reading, and one whose money never arrived**, because the backend answers
   * all three the same way — telling them apart is a way of asking whether a
   * guess got closer.
   */
  unknown:
    "We could not find a gift for that code. Check it against the one in your email and try again.",

  /**
   * The lookup could not be made at all: a 5xx, or no network.
   *
   * **It says nothing about the code**, which is the whole point of it being a
   * separate sentence. Telling somebody their present does not exist because a
   * server was down is the one thing this page must not do.
   */
  unreachable:
    "We could not check that code just now, which says nothing about whether it is good. Please try again in a moment.",

  /**
   * The backend's throttle, which is the tighter of its two on the lookup.
   *
   * Also not an answer about the code, and separated from the sentence above
   * because there is something the visitor can do about this one: wait.
   */
  throttled: "That is a lot of tries in a short time. Please wait a minute and try again.",

  /**
   * The panel that replaces the commerce half: what a **querent** is asked for.
   *
   * `ReadingPresentation` takes it in the `commerce` slot — the place on the
   * page where a purchase would be, holding something that collects no money.
   */
  ask: {
    heading: "Ask Your Question",
    body: ["This reading is yours.", "Ask your question and it will be written for you."],
    /**
     * Shown so the visitor can see what was resolved from whatever they typed
     * or whatever the link carried. The printed form is the backend's answer,
     * not a rendering of the input.
     */
    codeLabel: "Gift code",
    /**
     * **Required here, where a buyer's question is optional.** This is the
     * asking: it is the moment the reading starts existing, and a reading
     * without a question is not one.
     */
    question: { label: "Your question", placeholder: "Enter your question…" },
    /**
     * **Asked for, never inherited from the address the gift was sent to.** A
     * forwarded gift is enough to part the **recipient** from the **querent**,
     * and inheriting silently would deliver the reading to whoever forwarded
     * it. See `CONTEXT.md`.
     */
    email: { label: "Where to send your reading", placeholder: "Your email address…" },
    /** Optional, exactly as a buyer's name is. */
    name: { label: "Your name (optional)", placeholder: "Your name…" },
    submit: "GET MY READING",
    /** Held across the round trip, because a button that looks idle is pressed twice. */
    asking: "Asking for your reading…",
    /**
     * **It says the code has not been used**, and that is the load-bearing half
     * of the sentence: a refusal that left somebody unsure whether they had
     * just spent their one non-expiring credential would be worse than the
     * failure it reports. Every arm that reaches this threw before the backend
     * spent anything, or threw because the backend refused to.
     */
    failed:
      "We could not ask for your reading, and your code has not been used. Please try again.",
  },

  /**
   * A code that has already been spent — from the lookup, or from a submit that
   * lost the race to another tab.
   */
  spent: {
    heading: "Already Redeemed",
    /**
     * `when` is the day it was spent, formatted against the site's locale.
     *
     * The date is here because it is the fact that lets somebody work out
     * whether it was them. What is not here is who redeemed it or what they
     * asked: this endpoint answers to anybody holding the code.
     */
    body: (when: string) =>
      `This gift was opened on ${when}, and the reading it carried has already been asked for. A gift code holds a single reading, so this one has done what it was sent to do.`,
    /** The same sentence for an answer that carried no date to read. */
    undated:
      "This gift has already been opened, and the reading it carried has already been asked for. A gift code holds a single reading.",
    /**
     * **The way onward, which is the only thing this screen can offer.** The
     * code is spent and no sentence can unspend it, so the screen stops being
     * a refusal at this line: a reading of one's own is a thing the visitor
     * can still have, and this is the page that has their attention.
     *
     * It is an invitation and not a promise — it must not read as though the
     * spent gift entitles them to anything further.
     */
    invitation: "The cards are always ready for another question.",
    /** Sent to `backHref`, the same shelf every other way out of this page lands on. */
    cta: "GET ANOTHER READING",
  },

  /**
   * The confirmation, rendered from the answer that spent the code and from no
   * second call. `POST /orders/status` reports a payment, and the payment
   * behind a redeemed gift happened months earlier to somebody else.
   *
   * **It is read at `/checkout/complete/` from 3 September 2026** (#82), not on
   * this page. The words did not move with it — a querent is told the same
   * three things in the same voice — but the screen did, so that both roads
   * through the shop end in the same room. See
   * `docs/adr/0003-redemption-is-a-page-of-its-own.md`, amended for it, and
   * `RedemptionRecord` in `lib/checkout-session.ts` for what carries it there.
   */
  asked: {
    heading: "Your Reading Is On Its Way",
    /**
     * **This screen may promise the reading**, and it is the one gift surface
     * that may: the querent has asked, the reading exists as a row, and
     * Jennifer has been told. The confirmation a gift *buyer* sees promises
     * nothing, because at that moment nobody has asked anything — see
     * `giftReceived` in `content/checkout.ts`.
     *
     * `reading` is the noun phrase after "Your", resolved from the **product
     * key** on the record through `readingPageFor` — the same way the card
     * road names what was bought, down to `unnamedReading` standing in for a
     * key this build has drawn no page for. **It is named here and was not on
     * the panel** because the panel stood inside that reading's own page, with
     * the name and the artwork above it; this screen has nothing above it.
     */
    body: (reading: string, email: string) =>
      `Thank you. Your ${reading} is being written, and it will be sent to ${email}. A confirmation email is on its way to you now.`,
    /** Above the question, so somebody can check it is the one they meant. */
    asking: "You asked",
  },

  /**
   * The confirmation reached by a handle this tab has no record for.
   *
   * **`sessionStorage` dies with the tab**, so this is reachable: a reload is
   * fine and a link opened somewhere else is not. It is the redemption road's
   * `unknown`, and it is a screen of its own rather than that one because
   * `unknownBody` sends a customer to look for a **receipt** — and a querent
   * has none. Nobody sent them a receipt; nobody took their money.
   *
   * **So it points at the mail instead**, which on this road is the durable
   * record — the backend's `ReadingOnItsWay`, sent to the address they gave. It
   * says so conditionally, because the other way to this screen is an address
   * nobody redeemed anything with, and a screen cannot tell the two apart.
   */
  lost: {
    heading: "We Cannot Show You This Redemption",
    body:
      "There is nothing here for us to look up — this page shows a gift redeemed in this tab, and that is not what brought you here. If you have just redeemed one, nothing has been lost: the email confirming it is on its way to the address you gave, and that mail is the record that counts.",
  },

  /** The way back, in the same capitals the rest of the site sets this control in. */
  backLabel: "BACK TO READINGS",
  /**
   * Slashed, because `trailingSlash: true` exports a directory of `index.html`
   * files and the unslashed form costs a 308 on the way. `headerActions.cta`
   * moved for this on 29 August 2026; see `components/reading/README.md`.
   */
  backHref: "/readings/",
} as const;
