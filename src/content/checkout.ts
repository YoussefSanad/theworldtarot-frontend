import type { PaymentOutcome } from "@/lib/payment-outcome";

/**
 * The words on the confirmation screen.
 *
 * **Six of these seven screens are about money and only `received` is about a
 * reading.** That split replaced a flat rule on 30 August 2026 and the old rule
 * is worth stating, because everything below still runs on the half of it that
 * survived.
 *
 * ~~Every line here is about money and none of them is about a reading.~~ The
 * screen renders from a PaymentIntent; the reading is sent when the backend
 * **settles** the order on a verified webhook, which has not necessarily
 * happened by the time a customer reads this. So "Your reading is on its way"
 * is a promise made by the one part of the system that cannot know it.
 *
 * **The client made it anyway, knowingly, and that is why it is here** — see
 * #51, where the exposure was put to her in one line before this was built and
 * her answer is recorded. It is bounded: settlement is a webhook that arrives
 * in seconds, `ReconcileOrders` sweeps what does not, and a `succeeded`
 * PaymentIntent that never becomes a paid order is a fault we would be handling
 * regardless. She owns the promise to her customers; the code's job was to make
 * sure it was hers to make rather than one this file made for her quietly.
 *
 * **The rule that did not move**: the other six may still say nothing about a
 * reading. Four of them say no money was taken, and a screen that hedges about
 * a payment while promising a reading is worse than either. `check:confirmation`
 * holds both halves — one run per state, each declaring which side of the line
 * it is on.
 *
 * ~~The account line is deliberately soft~~ — the account sentence is gone with
 * it, replaced by the client's "A confirmation email is on its way." That mail
 * is the **receipt** everywhere in this codebase and in `CONTEXT.md`; she calls
 * it a confirmation email to her customers, and the customer's word is the one
 * that belongs in the copy. The name in the code has not moved.
 */

export type OutcomeCopy = {
  heading: string;
  /**
   * The paragraph under the amount, written from the name of the reading that
   * was bought.
   *
   * **A function on all four, spent by one.** Only `received` names the reading
   * — the three that report unfinished money have nothing to name it about —
   * but a `body` that were sometimes a string and sometimes a function would
   * put the branch in the component that renders it, and that component would
   * be choosing between two shapes of copy rather than rendering copy. This way
   * the screen asks every outcome the same question.
   */
  body: (reading: string) => string;
  /** Introduces the amount, when there is an amount to restate. */
  amountLabel: string;
};

export const checkoutCompleteCopy = {
  /**
   * The route's `<title>`, and the one string here that has to be true in all
   * seven states.
   *
   * It cannot vary by outcome: this is a static export and the outcome is only
   * known client-side, long after the metadata has shipped. So it names the
   * subject and never a result — four of these screens say in the body that no
   * payment was taken, and a tab reading "Payment received" above them is the
   * part of a page that gets screenshotted and re-read.
   */
  pageTitle: "Your payment",
  /** Above the amount, whatever the outcome. */
  outcomes: {
    received: {
      heading: "Your reading is on its way",
      /*
        `reading` is the noun phrase after "Your" — "Month Ahead Reading" where
        the record names a product this build has a page for, and
        `unnamedReading` below where it does not. Interpolated rather than
        written in, because this one screen serves every reading the site sells
        and the whole point of #51's second decision was that no product name
        and no amount is a literal in this file.

        **"within 24 hours" is a literal, and it is the one thing on this line
        that can go stale without anybody touching this file.** It is what every
        reading promises today and what the client's frame states as standard
        — see `delivery` on `ReadingPage` — so it is restated here rather than
        derived, which is what #51 asked for and no more. But `rushDelivery` in
        `content/reading-pages.ts` is a switch the CMS owns: turned on, 24 hours
        becomes the **paid** upgrade and standard delivery becomes something
        else, and this sentence would be handing the upgrade away on the one
        screen nobody re-reads. **Whoever flips that switch changes this line
        too**, and the delivery figure moves to `readingPageFor` the same way
        the name already has.
      */
      body: (reading) =>
        `Thank you. Your ${reading} has been received and will be delivered within 24 hours. A confirmation email is on its way.`,
      amountLabel: "Payment received:",
    },
    pending: {
      heading: "Your payment is going through",
      body: () =>
        "Your bank has it and has not finished with it yet, which some payment methods do. Nothing more is needed from you. We will email you as soon as it clears.",
      amountLabel: "Being paid",
    },
    unpaid: {
      heading: "No payment was taken",
      body: () =>
        "Nothing has been charged. Your order is still waiting, so you can go back to the reading and try again — a different card, or the same one a moment later.",
      amountLabel: "Still to pay",
    },
    unfinished: {
      heading: "Your payment is not finished",
      body: () =>
        "It has not been completed and nothing has been charged yet. If you were in the middle of confirming with your bank, go back to the reading and start the payment again.",
      amountLabel: "To pay",
    },
  } satisfies Record<PaymentOutcome, OutcomeCopy>,

  /**
   * The eighth screen, and the only one that is not a `PaymentOutcome`: what
   * `received` says when what was paid for was a **gift**.
   *
   * **It is a variant of `received` and of nothing else.** The other six states
   * are untouched by gifting, and four of them say no money was taken — a
   * screen that hedges about a payment has nothing to add about who a present
   * went to, and a gift-shaped `unpaid` would be two hedges where one will do.
   * So this is chosen at render, on `received` alone, and the six keep the
   * words they have.
   *
   * **It promises no reading, because nobody has one.** A gift is not a reading
   * until it is **redeemed** — the recipient has not asked anything, and there
   * is nothing for anybody to write — so the sentence the client took on
   * herself for `received` on #51 has no counterpart here, and none is invented
   * for her. The delivery window is not stated for the same reason: the clock
   * starts at `asked_at`, which is a moment that has not happened. See the
   * backend's `docs/adr/0004-a-reading-is-a-row-of-its-own.md`.
   *
   * **What it does say is who it went to.** That is the one detail a gift buyer
   * can still have got wrong, the reason the panel takes the address twice, and
   * the last moment anybody can catch it — the code goes to the recipient and
   * the buyer never sees it. `check:confirmation` reads both halves: the
   * address is named, and no sentence claims a reading.
   *
   * **Ours, not the client's.** She has no gift confirmation frame, as she has
   * no gift panel — this goes to her with `giftingComing` and the rest of the
   * gift copy in `content/reading-pages.ts`.
   */
  giftReceived: {
    heading: "Your gift is on its way",
    /*
      `recipient` is the address the buyer typed, not a name — the panel asks
      for no name for the recipient, only for the **gift signature** of the
      person sending it, and quoting an address back is what lets a typo be
      seen. `unnamedRecipient` below stands in where the record has none.
    */
    body: (recipient) =>
      `Thank you. We have sent your gift to ${recipient}, with a code to redeem it whenever they are ready. Your own confirmation email is on its way.`,
    amountLabel: "Payment received:",
  } satisfies OutcomeCopy,

  /** While Stripe is being asked. Not a claim about anything. */
  checkingHeading: "Checking your payment",

  /**
   * Reached with nothing to read: no intent in the URL and none in this tab.
   *
   * The realistic way somebody gets here is not a mistyped address. It is a
   * payment panel that treated `nothing_to_pay` as "done" — which a `manual`
   * `PAYMENT_METHOD` answers for a perfectly unpaid order — and sent the
   * customer to a confirmation with no intent at all. **So this must not read
   * as a confirmation.** It says what is true (we cannot tell) and never that
   * anything was received.
   */
  unknownHeading: "We cannot show you this payment",
  unknownBody:
    "There is nothing here for us to look up — this page shows a payment made in this tab, and that is not what brought you here. If you have just paid, your receipt will arrive by email and is the record that counts. If you were part-way through, go back to the reading and start again.",

  /** Stripe answered, but not with an intent. Nothing to report either way. */
  errorHeading: "We could not check your payment",
  errorBody:
    "Something went wrong looking it up, which says nothing about whether you were charged. Your receipt will arrive by email if the payment went through. Reloading this page is safe.",

  /**
   * What `received.body` calls the thing that was bought when the record names
   * a product with no page here.
   *
   * Lower case, because it is read as the tail of "Your ___" and the sentence
   * is the same one either way: "Your reading has been received" beside "Your
   * Month Ahead Reading has been received". A screen that could not name the
   * product says less rather than something else.
   */
  unnamedReading: "reading",

  /**
   * What `giftReceived.body` calls the address when the record carries none.
   *
   * The ordinary way that happens is a record written before 3 September 2026,
   * when `giftRecipient` did not exist; the other is a gift order placed with
   * the address left blank, which `orderFormAccepts` refuses at the press
   * because it is a guard rather than a guarantee — and which the backend then
   * refuses with a 422, so that screen is reached by a reload rather than by a
   * payment.
   *
   * Phrased so the sentence stays true either way. "The address you gave" is
   * exactly as much as the screen knows, and it is better than naming the wrong
   * one — which is the failure this whole field exists to avoid.
   */
  unnamedRecipient: "the address you gave",

  /**
   * ~~"Back to the readings"~~, and set in the client's capitals from 30 August
   * 2026 — the same form as `closingAction` on the reading page, which is
   * already the house treatment for this control.
   *
   * The `lowercase` class that used to sit on this button went with it. It was
   * there to render the old sentence-cased label in lower case, and left in
   * place it would have quietly swallowed every capital here.
   */
  backLabel: "BACK TO READINGS",
  /**
   * ~~`/readings`~~ **Slashed 3 September 2026** (#82). `trailingSlash` exports
   * a directory of `index.html` files, so the unslashed form costs a 308 on the
   * way — the cost `redeemCopy.backHref` and `headerActions.cta` were both
   * moved for. It went unnoticed here because every road that reaches this
   * screen arrived from somewhere else; the redemption road made it this
   * screen's own inconsistency, since `redemptionHref` argues the slash three
   * files away and then routed a querent out through the unslashed form.
   */
  backHref: "/readings/",
} as const;
