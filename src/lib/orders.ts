/**
 * Placing and paying for an order — the two writes checkout is made of.
 *
 * Both go through `api-write.ts`, so the CSRF handshake and the typed errors
 * are not restated here. Neither endpoint takes a locale segment: an order is
 * the same order whatever language it was placed in.
 */

import { apiWrite } from "./api-write.ts";

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
  /** Required for a guest and ignored for a signed-in customer. */
  name: string;
  email: string;
  /**
   * Taken exactly as sent — no detection happens at this endpoint, and an
   * unsupported currency is a 422 rather than a fallback. One currency for the
   * whole order, because a basket priced in two has no total.
   */
  currency: string;
  lines: OrderLineInput[];
};

/** A line as the backend priced it. Amounts are integer minor units. */
export type OrderLine = {
  product: string;
  unitAmount: number;
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
  currency: string;
  totalAmount: number;
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

  return {
    id: order.id,
    status: order.status,
    currency: order.currency,
    totalAmount: order.total_amount,
    lines: order.lines.map((line) => ({
      product: line.product,
      unitAmount: line.unit_amount,
      quantity: line.quantity,
      question: line.question,
    })),
    payToken: order.pay_token,
  };
}

/**
 * What to do next about an order.
 *
 * The backend answers one of two shapes, each naming itself, and this adds a
 * third arm for anything else. **Read `type`, then read the field it names** —
 * never infer from the shape of what came back.
 *
 * A `redirect` shape was published and withdrawn on 26 August 2026. It has no
 * branch here deliberately: it never had an implementation and cannot acquire
 * one, since checkout happens on our page precisely because a hosted page
 * cannot pre-select a wallet. It arrives as `unrecognised` like anything else.
 */
export type PaymentInstruction =
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

type ApiPaymentInstruction = { type: string; client_secret?: string };

/**
 * Starts a payment for an order already placed. The token is the authority, so
 * this is open to a guest.
 *
 * Safe to call twice on a pending order — it gives a fresh secret, which is
 * what a declined card should do, and creates no second order. An unknown token
 * is a 404, and so is somebody else's, identically.
 */
export async function payOrder(
  payToken: string,
  { method }: { method?: string } = {},
): Promise<PaymentInstruction> {
  // The body is optional. `method` is left out unless asked for, so that
  // gifting can add `gift_code` later without changing the shape of this call.
  const instruction = await apiWrite<ApiPaymentInstruction>(
    `/api/v1/orders/${encodeURIComponent(payToken)}/pay`,
    method ? { method } : {},
  );

  if (instruction.type === "client_secret" && instruction.client_secret) {
    return { type: "client_secret", clientSecret: instruction.client_secret };
  }

  if (instruction.type === "nothing_to_pay") return { type: "nothing_to_pay" };

  return { type: "unrecognised", reportedType: instruction.type };
}
