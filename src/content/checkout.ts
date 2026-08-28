import type { PaymentOutcome } from "@/lib/payment-outcome";

/**
 * The words on the confirmation screen.
 *
 * **Every line here is about money and none of them is about a reading.** The
 * screen renders from a PaymentIntent; the reading is sent when the backend
 * **settles** the order on a verified webhook, which has not necessarily
 * happened by the time a customer reads this. "Your reading is on its way"
 * would be a promise made by the one part of the system that cannot know. The
 * receipt is the mail that says that, and the backend sends it.
 *
 * The account line is deliberately soft — "if you are new here, a mail is on
 * its way with a link to set a password" — because the claim link comes from
 * the same settlement we are refusing to claim has happened.
 */

export type OutcomeCopy = {
  heading: string;
  body: string;
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
      heading: "Your payment has been received",
      body: "Thank you. We have your payment and your order is with us. A receipt is on its way to the email address you gave, and if you are new here it carries a link to set a password.",
      amountLabel: "Paid",
    },
    pending: {
      heading: "Your payment is going through",
      body: "Your bank has it and has not finished with it yet, which some payment methods do. Nothing more is needed from you. We will email you as soon as it clears.",
      amountLabel: "Being paid",
    },
    unpaid: {
      heading: "No payment was taken",
      body: "Nothing has been charged. Your order is still waiting, so you can go back to the reading and try again — a different card, or the same one a moment later.",
      amountLabel: "Still to pay",
    },
    unfinished: {
      heading: "Your payment is not finished",
      body: "It has not been completed and nothing has been charged yet. If you were in the middle of confirming with your bank, go back to the reading and start the payment again.",
      amountLabel: "To pay",
    },
  } satisfies Record<PaymentOutcome, OutcomeCopy>,

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

  backLabel: "Back to the readings",
  backHref: "/readings",
} as const;
