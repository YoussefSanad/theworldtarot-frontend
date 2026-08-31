/**
 * Placing and paying for an order — the two writes checkout is made of.
 *
 * Both go through `api-write.ts`, so the CSRF handshake and the typed errors
 * are not restated here. Neither endpoint takes a locale segment: an order is
 * the same order whatever language it was placed in.
 */

import { apiWrite } from "./api-write.ts";
import type { Money } from "./price.ts";

/** One thing being bought. `quantity` defaults to 1 at the backend, maximum 10. */
export type OrderLineInput = {
  /** A product key — permanent and untranslated. Never a name or an id. */
  product: string;
  quantity?: number;
  /**
   * Refused with a 422 on any product whose `allows_question` is false, and
   * never required on one where it is true.
   */
  question?: string;
};

export type PlaceOrderInput = {
  /**
   * **Optional for a guest since 29 August 2026**, and ignored for a signed-in
   * customer, who always gets their own account.
   *
   * Optional is what lets the checkout button place an order from a page that
   * collects neither: Stripe's **hosted page** collects the buyer's email *after* the
   * order exists, and the webhook fills identity from the Session's
   * `customer_details`. An order that carries them behaves exactly as it always
   * has, so the probe and anything else already collecting them keeps sending
   * them.
   *
   * Absent rather than empty. An empty string is an address, and sending one
   * would turn an order the backend would accept into a 422.
   */
  name?: string;
  email?: string;
  /**
   * Taken exactly as sent — no detection happens at this endpoint, and an
   * unsupported currency is a 422 rather than a fallback. One currency for the
   * whole order, because a basket priced in two has no total.
   */
  currency: string;
  lines: OrderLineInput[];
};

/** A line as the backend priced it. */
export type OrderLine = {
  product: string;
  /**
   * What one of them costs. **Money**, not a bare amount: the wire sends one
   * currency for the whole order and this puts it back on the number, so no
   * line price can travel without the currency it is in.
   */
  unitPrice: Money;
  quantity: number;
  question: string | null;
};

export type Order = {
  id: number;
  /**
   * `pending` until a payment succeeds or somebody settles it by hand. **A 201
   * means the order is recorded, never that it is paid.**
   */
  status: string;
  /** What the whole order comes to, as the backend priced it. */
  total: Money;
  lines: OrderLine[];
  /**
   * A credential, and the whole of the authority to pay this order. Never put
   * it in an address bar, a redirect, an analytics event or a log.
   */
  payToken: string;
};

type ApiOrder = {
  id: number;
  status: string;
  currency: string;
  total_amount: number;
  lines: { product: string; unit_amount: number; quantity: number; question: string | null }[];
  pay_token: string;
};

/**
 * Records an order and prices it. Open to anybody, signed in or not.
 *
 * Throws `ApiValidationError` when a line is refused, with the error keyed to
 * that line — `lines.0.product`. One bad line refuses the whole order, so
 * nothing is silently dropped.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const order = await apiWrite<ApiOrder>("/api/v1/orders", input);

  /*
    The wire shape is unchanged: one currency for the whole order, and bare
    minor units on the total and on every line. It is paired up here, at the
    boundary, so nothing downstream ever holds an amount on its own.
  */
  const currency = order.currency;

  return {
    id: order.id,
    status: order.status,
    total: { currency, amount: order.total_amount },
    lines: order.lines.map((line) => ({
      product: line.product,
      unitPrice: { currency, amount: line.unit_amount },
      quantity: line.quantity,
      question: line.question,
    })),
    payToken: order.pay_token,
  };
}

/**
 * What to do next about an order.
 *
 * The backend answers one of three shapes, each naming itself, and this adds a
 * fourth arm for anything else. **Read `type`, then read the field it names** —
 * never infer from the shape of what came back.
 *
 * The `redirect` shape was published on 25 August 2026, withdrawn on the 26th as
 * a case with no caller, and is back from the 29th with one: it is the **hosted
 * page**, and it is what the card button uses. See
 * `docs/adr/0002-checkout-happens-on-stripes-page.md`.
 */
export type PaymentInstruction =
  /**
   * Send the browser to `redirectUrl`. It is a Stripe Checkout Session, and
   * **it is not the order's address**: a Session expires after 24 hours and an
   * order never does, so this is never stored and a customer coming back calls
   * `/pay` again for a fresh one.
   */
  | { type: "redirect"; redirectUrl: string }
  /** Confirm this with Stripe, in the Express Checkout or Payment Element. */
  | { type: "client_secret"; clientSecret: string }
  /**
   * Nothing to collect — go straight to the confirmation. It is what an order
   * already settled answers, what a hand-settled one answers, and what a gift
   * code redemption will answer.
   */
  | { type: "nothing_to_pay" }
  /**
   * A `type` this build does not know. A value to render, never a throw: a new
   * payment method can add one, and a checkout that crashes on an unknown type
   * fails for a customer whose order is perfectly fine.
   */
  | { type: "unrecognised"; reportedType: string };

type ApiPaymentInstruction = { type: string; client_secret?: string; redirect_url?: string };

/**
 * The ways of paying this build knows the names of.
 *
 * **Published values, agreed with the backend before either side switched them
 * on**, and the same strings `GET /api/v1/payment-methods` answers with. They
 * are two rather than one because they are a hosted Session and a PaymentIntent
 * — an address you send a browser to, and an iframe you mount — and no Stripe
 * parameter reconciles those. See
 * `docs/adr/0002-checkout-happens-on-stripes-page.md`.
 *
 * **Not a union of every method the backend has.** `manual` is offered to a
 * person in an admin panel and drawn on no page, and the endpoint that lists
 * what a customer may press excludes it. A name outside this pair is something
 * this build cannot draw a button for, which is why `fetchPaymentMethods`
 * answers strings and only this type reaches `payOrder`.
 */
export type PaymentMethodName =
  /** The card button: a hosted Checkout Session, answered as a `redirect`. */
  | "stripe"
  /**
   * The wallet button: a PaymentIntent, answered as a `client_secret`, which
   * the express checkout element confirms against on our own page.
   */
  | "stripe_wallet";

/**
 * Starts a payment for an order already placed. The token is the authority, so
 * this is open to a guest.
 *
 * Safe to call twice on a pending order — it gives a fresh Session or a fresh
 * secret, which is what a declined card and an abandoned checkout should both
 * do, and creates no second order. An unknown token is a 404, and so is
 * somebody else's, identically.
 *
 * ## `method` names which button was pressed, and both roads name themselves
 *
 * Optional on the wire — the backend falls back to `payments.default` — and
 * **sent by both roads regardless**, because from 29 August 2026 there are two
 * and the endpoint cannot tell them apart otherwise. A road that relies on the
 * default is a road that silently changes the day somebody edits a config file
 * on the other side, and the two answers here are not interchangeable: one is
 * an address to navigate to and one is a secret to confirm in an iframe.
 *
 * Anything outside what this environment offers is a 422 naming the field.
 *
 * ## `returnTo` is a product key, and it is what makes cancelling land anywhere
 *
 * Optional, and one of `one-card`, `three-card`, `month-ahead`, `in-depth` —
 * **never a path and never a URL**. It says which reading page the checkout
 * started from, and the backend builds both return addresses from it against an
 * origin configured on its own side; a caller-supplied address would be an open
 * redirect available to anybody holding a pay token. Anything outside the set
 * is a 422 rather than a fallback.
 *
 * **Send nothing and a cancelled checkout lands on the readings index**, which
 * loses the page the customer was on and the question they typed on it.
 */
export async function payOrder(
  payToken: string,
  { returnTo, method }: { returnTo?: string; method?: PaymentMethodName } = {},
): Promise<PaymentInstruction> {
  const instruction = await apiWrite<ApiPaymentInstruction>(
    `/api/v1/orders/${encodeURIComponent(payToken)}/pay`,
    {
      // Absent rather than null, both of them. `sometimes` is what the backend
      // validates these with, and a key present holding nothing is a key
      // present — it fails the rule rather than skipping it.
      ...(returnTo === undefined ? {} : { return_to: returnTo }),
      ...(method === undefined ? {} : { method }),
    },
  );

  /*
    The field is `redirect_url` and not `url`. An earlier draft of the plan
    wrote the latter, and reading the wrong key here would hand
    `location.assign` an `undefined` — stranding a customer on the reading page
    with an order already placed, which looks like nothing happening at all.

    The address is checked rather than assumed for the same reason: a `redirect`
    with nothing to redirect to is not a redirect, and falling through to
    `unrecognised` is the arm that renders a message instead of navigating
    nowhere.
  */
  if (instruction.type === "redirect" && instruction.redirect_url) {
    return { type: "redirect", redirectUrl: instruction.redirect_url };
  }

  if (instruction.type === "client_secret" && instruction.client_secret) {
    return { type: "client_secret", clientSecret: instruction.client_secret };
  }

  if (instruction.type === "nothing_to_pay") return { type: "nothing_to_pay" };

  return { type: "unrecognised", reportedType: instruction.type };
}

/**
 * The PaymentIntent's status for an order, as Stripe reports it and the backend
 * passes it through.
 *
 * **The pay token goes in the body**, which is the whole reason this is a POST:
 * it is a credential, and a path segment lands in every access log between the
 * browser and the application. The Checkout Session id in the confirmation's
 * address is not what this takes — a `cs_...` id is opaque and nothing on the
 * backend maps one to an order.
 *
 * The string is returned unchanged, including one this build has never heard
 * of. **The set is Stripe's and can grow**, and what to do about an unfamiliar
 * one is the caller's decision: the confirmation treats it as "we do not know
 * yet" and leaves what it is already showing alone. A throw here would take
 * that decision away from it.
 *
 * Rejects on a 503, which is what the backend answers when Stripe cannot be
 * reached, and which says nothing whatsoever about the payment.
 */
export async function fetchPaymentStatus(payToken: string): Promise<string> {
  const answer = await apiWrite<{ status: string }>("/api/v1/orders/status", {
    pay_token: payToken,
  });

  return answer.status;
}
