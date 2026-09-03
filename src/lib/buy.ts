/**
 * Buying one reading: the two round trips that happen before anything is
 * charged, and the record left behind for the confirmation to read.
 *
 * Apart from the panel deliberately. Everything here is about the order of four
 * things — place, pay, remember, go — and none of it is about a button, which
 * is what lets the sequence be exercised without laying out a page. See
 * `docs/plans/hosted-checkout.md`.
 *
 * ## Two roads, and the same four steps on each
 *
 * From 29 August 2026 there are two: `startCheckout`, the card button, which
 * ends in an address to send the browser to; and `startWalletPayment`, the
 * wallet button, which ends in a secret for the express checkout element to
 * confirm against on our own page. **They cannot be one function**, because a
 * hosted Checkout Session and a PaymentIntent are not two settings of one
 * thing — one is an address and one is an iframe.
 *
 * What they do share is the sequence, and it is worth naming what that
 * protects: **the record is written before the last step on both**, because
 * after it there may be no code of ours left running. On the card road the
 * browser leaves for Stripe; on the wallet road 3D Secure can take it away just
 * as completely.
 *
 * ## Place, then pay. Two calls, and they stay two
 *
 * Placing the order earlier — on question blur — was rejected: it mints a
 * `pending` order for everyone who types a sentence and leaves. Folding the two
 * into one endpoint was rejected too; it buys about 300ms and destroys the
 * place-then-pay shape that makes a retry safe, since a second press pays the
 * order rather than placing another one.
 *
 * ## It navigates nothing, and it confirms nothing
 *
 * The address comes back and the caller sends the browser to it; the secret
 * comes back and the caller confirms it with Stripe. That is what keeps this
 * testable at all — `location.assign` or a `confirmPayment` in here would mean
 * no test of this sequence could ever run to the end.
 */

import { rememberCheckout, sessionIdFrom } from "./checkout-session.ts";
import type { GiftInput } from "./orders.ts";
import { payOrder, placeOrder } from "./orders.ts";
import { paymentStarted, paymentStopped } from "./payment-in-flight.ts";
import type { Money } from "./price.ts";

/**
 * `/pay` answered something the road that asked cannot act on.
 *
 * **Each road refuses the other's shape, and that is deliberate rather than
 * incidental.** The card road asked for `stripe` and may only navigate to a
 * `redirect`; the wallet road asked for `stripe_wallet` and may only confirm a
 * `client_secret`. Getting the other one back does not mean "use it" — it means
 * the backend disagreed with us about which road this is, and acting on it
 * would charge a customer through a road nobody chose.
 *
 * The shapes that reach it on either road: `nothing_to_pay`, which a *fresh*
 * order has no business answering; the other road's shape; and a `type` this
 * build has never heard of, which is what a backend that has grown a method
 * ahead of us looks like.
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

/** One reading, at the price the page was quoting, with what was typed on it. */
type Bought = {
  /** The reading being bought, and the page a cancelled checkout returns to. */
  productKey: string;
  money: Money;
  /**
   * What the customer typed, if anything. Optional on every product, and
   * **never sent beside a `gift`**: the backend refuses the pair with a 422
   * keyed to this field, and the panel answers empty in gift mode for that
   * reason. See `lib/order-note.ts`.
   *
   * ~~The wire field is `question` and what reaches it is not always one.~~
   * **Struck 3 September 2026.** It was a composed gift note in gift mode until
   * the backend grew `lines[].gift` and a `gifts` table behind it; a sentence
   * in this field could tell Jennifer a present had been bought, and could not
   * mint a code, send it, or put the obligation on a screen. See `gift` below.
   */
  question?: string;
  /**
   * The present, on a gift, and **it reaches the order as well as the record**.
   *
   * ~~It reaches the record and never the order — `POST /orders` has no field
   * for it.~~ **Struck 3 September 2026**, which is the whole of this change:
   * the endpoint has `lines[].gift`, and a gift that does not travel on it is a
   * gift the backend never hears about. What that cost, until it did travel: no
   * `gifts` row, so no code minted at settlement, so no mail to the recipient
   * and nothing on the panel's Gifts screen — and a reading queued for the
   * **buyer**, who was never the querent.
   *
   * **The record still gets its own two fields**, derived from this one rather
   * than passed beside it. That is the pair that legitimately parts: the order
   * takes the present, and the record takes a flag and an address, because the
   * confirmation is reached after a round trip to Stripe and has no other
   * channel to either. Deriving them here rather than taking them from the
   * caller is what stops a road being added that fills one and forgets the
   * other.
   *
   * Passed rather than parsed back out of `question`, which was never possible
   * and is worth saying: a `startsWith("Gift")` anywhere downstream would be a
   * mis-parse putting a wrong address in a sentence telling somebody where
   * their present went.
   */
  gift?: GiftInput;
};

/**
 * The first of the four steps, and the one both roads do identically.
 *
 * Shared because it is the same order either way — the customer's choice of
 * button is about how the money arrives, not about what they are buying, and
 * `POST /orders` has no field that varies with it. What is *not* shared is
 * everything after: the two roads ask `/pay` for different things and are
 * handed shapes that have nothing in common.
 *
 * Answers the trimmed question alongside the order, because both callers need
 * it again for the record and re-trimming it in each is how the two drift.
 */
async function placeOneReading({ productKey, money, question, gift }: Bought) {
  // Absent rather than empty, in the line and in the record both. A question of
  // three spaces is not a question, and sending one would put whitespace on an
  // order line and back into a textarea on the way home.
  const asked = question?.trim() ? question.trim() : undefined;

  const order = await placeOrder({
    currency: money.currency,
    lines: [
      {
        product: productKey,
        quantity: 1,
        ...(asked === undefined ? {} : { question: asked }),
        /*
          **Sent as it was read, empty fields and all.** The backend requires an
          address and a signature on a present, so a gift the buyer typed
          nothing into is a 422 with nothing charged — which is the refusal this
          road wants. Dropping an empty one here would place an ordinary order
          for the buyer instead, and that is the exact failure of the composed
          note this replaced: an order that looked like a self-purchase, paid
          for, with a reading queued to the wrong person.
        */
        ...(gift === undefined ? {} : { gift }),
      },
    ],
  });

  return { order, asked };
}

/**
 * Runs one road, with the currency control frozen for its length.
 *
 * **The rule is here rather than on each road**, so that a third road cannot be
 * added that forgets it, and so that the one asymmetry in it is stated once.
 *
 * That asymmetry: **only a refusal lowers the flag.** A `finally` here would be
 * the obvious shape and it would be wrong — both roads succeed by handing the
 * caller something that takes the browser away, and clearing the flag in the gap
 * between the return and the navigation puts a live currency row back under a
 * thumb for exactly the moment the freeze exists to cover. A page that is
 * leaving stays frozen until it unloads. `HostedCheckoutButton` holds its own
 * `pending` state through the same gap, for the same reason and in the same
 * words.
 *
 * The raise is synchronous with the call, before the first byte leaves: the
 * write is what is being protected, so waiting for the write to start would be
 * waiting for the thing being guarded against.
 */
async function whileInFlight<T>(road: () => Promise<T>): Promise<T> {
  paymentStarted();

  try {
    return await road();
  } catch (refusal: unknown) {
    // Nothing was charged on any arm that throws — `startCheckout` and
    // `startWalletPayment` both say so — so there is nothing left to protect.
    paymentStopped();
    throw refusal;
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
export function startCheckout(bought: Bought): Promise<string> {
  return whileInFlight(() => hostedRoad(bought));
}

async function hostedRoad({ productKey, money, question, gift }: Bought): Promise<string> {
  const { order, asked } = await placeOneReading({ productKey, money, question, gift });

  /*
    `return_to` is the product key of the page this started from, and it is what
    makes a cancelled checkout land back on it. Send nothing and the customer
    returns to the readings index, having lost both the page and the question.
  */
  const instruction = await payOrder(order.payToken, {
    returnTo: productKey,
    method: "stripe",
  });

  if (instruction.type !== "redirect") throw new CheckoutUnavailable(instruction.type);

  /*
    The Session id is read out of the address because `/pay` answers an address
    and nothing else. Where it cannot be — a redirect shaped in some way
    `sessionIdFrom` does not recognise — the record is written **without** one.

    The two things the record does are not equally important. Without a Session
    id the confirmation can identify nothing and says so, and the **receipt** is
    the record that counts. But the question comes home from a cancelled
    checkout either way, and losing several sentences of typed question silently
    is the worst thing this flow can do.
  */
  const sessionId = sessionIdFrom(instruction.redirectUrl);

  if (sessionId === null) {
    // Loud here and quiet on the page, as `useProduct` is about an unreachable
    // catalogue: from the outside a confirmation that cannot identify the
    // payment is indistinguishable from one that worked, and it needs to be
    // distinguishable from in here.
    console.error("No Checkout Session id in the redirect, so this payment cannot be confirmed.");
  }

  /*
    Written **before** the navigation, because after it there is no code of ours
    left running to write anything.
  */
  rememberCheckout({
    payToken: order.payToken,
    money: order.total,
    productKey,
    ...(sessionId === null ? {} : { sessionId }),
    ...(asked === undefined ? {} : { question: asked }),
    // Absent on a self-purchase rather than `false`, so a record carries the
    // same keys it always has unless there is something new to say. Written the
    // same way on the wallet road below; the two records are built separately
    // and a field added to one and forgotten on the other is a confirmation
    // that names nobody on whichever road the customer happened to take.
    ...(gift ? { gift: true } : {}),
    // The address the present went to, and absent where the buyer left it
    // blank — a sentence naming the empty string is worse than the one the
    // confirmation falls back to. Read off the present rather than taken
    // beside it, so the record cannot disagree with the order about where a
    // gift was sent.
    ...(gift?.recipient_email ? { giftRecipient: gift.recipient_email } : {}),
  });

  return instruction.redirectUrl;
}

/**
 * Places an order for one reading, starts a **wallet** payment for it,
 * remembers the checkout, and answers the client secret to confirm.
 *
 * The same four steps as `startCheckout` with a different third and fourth: the
 * backend mints a PaymentIntent rather than a hosted Session, and what comes
 * back is confirmed in an iframe on this page rather than navigated to.
 *
 * ## It sends no `return_to`
 *
 * That field exists so the backend can build the two addresses a **hosted
 * page** returns to. There is no hosted page on this road and no cancel to
 * come back from — the customer never leaves the reading page to open the
 * sheet — so the only address in play is the one *we* hand
 * `stripe.confirmPayment`, for 3D Secure to return to. Sending a field this
 * road does not use would invite the reading that it does.
 *
 * ## The record is written before the caller confirms
 *
 * **Before**, for the same reason the card road writes before it navigates: 3D
 * Secure takes the browser away as completely as a redirect to Stripe does, and
 * there is no code of ours left running on the other side of it. It carries the
 * client secret and no Session id, which is how the confirmation tells this
 * road from the other one.
 *
 * Throws `CheckoutUnavailable` on an instruction this road cannot act on —
 * including a `redirect`, which is the card road's answer and not something to
 * quietly follow — and whatever `api-write.ts` throws on a refused write. In
 * every one of those cases nothing has been charged.
 */
export function startWalletPayment(bought: Bought): Promise<string> {
  return whileInFlight(() => walletRoad(bought));
}

async function walletRoad({ productKey, money, question, gift }: Bought): Promise<string> {
  const { order, asked } = await placeOneReading({ productKey, money, question, gift });

  const instruction = await payOrder(order.payToken, { method: "stripe_wallet" });

  if (instruction.type !== "client_secret") throw new CheckoutUnavailable(instruction.type);

  /*
    Written before the confirmation, and holding the amount the **backend**
    priced rather than the one the sheet quoted. They are the same number in
    every ordinary case; where they are not, what the confirmation restates has
    to be what was actually charged.
  */
  rememberCheckout({
    payToken: order.payToken,
    money: order.total,
    productKey,
    clientSecret: instruction.clientSecret,
    ...(asked === undefined ? {} : { question: asked }),
    ...(gift ? { gift: true } : {}),
    ...(gift?.recipient_email ? { giftRecipient: gift.recipient_email } : {}),
  });

  return instruction.clientSecret;
}
