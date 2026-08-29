/**
 * Buying one reading: the two round trips that happen before the browser leaves
 * for Stripe, and the record left behind for the confirmation to read.
 *
 * Apart from the panel deliberately. Everything here is about the order of four
 * things — place, pay, remember, go — and none of it is about a button, which
 * is what lets the sequence be exercised without laying out a page. See
 * `docs/plans/hosted-checkout.md`.
 *
 * ## Place, then pay. Two calls, and they stay two
 *
 * Placing the order earlier — on question blur — was rejected: it mints a
 * `pending` order for everyone who types a sentence and leaves. Folding the two
 * into one endpoint was rejected too; it buys about 300ms and destroys the
 * place-then-pay shape that makes a retry safe, since a second press pays the
 * order rather than placing another one.
 *
 * ## It navigates nothing
 *
 * The address comes back and the caller sends the browser to it. That is what
 * keeps this testable at all — `location.assign` in here would mean no test of
 * this sequence could ever run to the end.
 */

import { rememberCheckout, sessionIdFrom } from "./checkout-session.ts";
import { payOrder, placeOrder } from "./orders.ts";
import type { Money } from "./price.ts";

/**
 * `/pay` answered something this road cannot act on.
 *
 * Three shapes reach it: `nothing_to_pay`, which a *fresh* order has no
 * business answering; `client_secret`, which is the wallet road and needs an
 * element this page is not mounting; and a `type` this build has never heard
 * of, which is what a backend that has grown a method ahead of us looks like.
 *
 * **A thrown error rather than a redirect to nowhere.** The order exists and is
 * `pending`, nothing has been charged, and the panel says so. Treating
 * `nothing_to_pay` as "done" and sending the customer to the confirmation is
 * the specific mistake `unknownBody` in `content/checkout.ts` is written for.
 */
export class CheckoutUnavailable extends Error {
  readonly reportedType: string;

  constructor(reportedType: string) {
    super(`Checkout cannot start from a "${reportedType}" instruction.`);
    this.name = "CheckoutUnavailable";
    this.reportedType = reportedType;
  }
}

/**
 * Places an order for one reading, starts its payment, remembers the checkout,
 * and answers the **hosted page** to send the browser to.
 *
 * `money` is the offer the page was quoting, and it is here for its currency
 * alone — the amount that goes in the record is the one the backend priced,
 * because the confirmation restates what was charged rather than what was
 * advertised. Taking `Money` rather than a currency string is what makes "buy
 * something at a price no server agreed to" a type error: `ProductOffer` carries
 * it on `live` and on no other state.
 *
 * Throws `CheckoutUnavailable` on an instruction this road cannot act on, and
 * whatever `api-write.ts` throws on a refused write — a 422 on the line, a 429,
 * a network failure. In every one of those cases nothing has been charged.
 */
export async function startCheckout({
  productKey,
  money,
  question,
}: {
  productKey: string;
  money: Money;
  /** What the customer typed, if anything. Optional on every product. */
  question?: string;
}): Promise<string> {
  // Absent rather than empty, in the line and in the record both. A question of
  // three spaces is not a question, and sending one would put whitespace on an
  // order line and back into a textarea on the way home.
  const asked = question?.trim() ? question.trim() : undefined;

  const order = await placeOrder({
    currency: money.currency,
    lines: [{ product: productKey, quantity: 1, ...(asked === undefined ? {} : { question: asked }) }],
  });

  /*
    `return_to` is the product key of the page this started from, and it is what
    makes a cancelled checkout land back on it. Send nothing and the customer
    returns to the readings index, having lost both the page and the question.
  */
  const instruction = await payOrder(order.payToken, { returnTo: productKey });

  if (instruction.type !== "redirect") throw new CheckoutUnavailable(instruction.type);

  /*
    Written **before** the navigation, because after it there is no code of ours
    left running to write anything.

    The Session id is read out of the address because `/pay` answers an address
    and nothing else. Where it cannot be — a URL shaped in some way this does
    not recognise — the customer still goes to Stripe and still pays; what they
    lose is the confirmation restating their money, and the **receipt** is the
    record that counts. A record with no guard on it would be the worse trade:
    the confirmation would have to paint it against any Session at all.
  */
  const sessionId = sessionIdFrom(instruction.redirectUrl);

  if (sessionId === null) {
    // Loud here and quiet on the page, as `useProduct` is about an unreachable
    // catalogue: from the outside this is indistinguishable from a checkout
    // that worked, and it needs to be distinguishable from in here.
    console.error("No Checkout Session id in the redirect, so this checkout cannot be remembered.");
  } else {
    rememberCheckout({
      payToken: order.payToken,
      money: order.total,
      sessionId,
      productKey,
      ...(asked === undefined ? {} : { question: asked }),
    });
  }

  return instruction.redirectUrl;
}
