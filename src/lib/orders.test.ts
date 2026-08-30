import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { fetchPaymentStatus, payOrder, placeOrder } from "./orders.ts";

type Call = { url: string; init: RequestInit };

const realFetch = globalThis.fetch;
const realDocument = globalThis.document;

let calls: Call[] = [];

/**
 * Stubbed at the network, not at `apiWrite`. Orders are worth testing through
 * the handshake rather than around it: the request that actually leaves the
 * browser is the thing the backend refuses or accepts.
 */
function stubFetch(...responses: Response[]): void {
  const queue = [...responses];

  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });

    const next = queue.shift();
    if (!next) throw new Error(`Unexpected fetch to ${String(input)}.`);

    return next;
  }) as typeof fetch;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://staging-api.theworldtarot.com";
  globalThis.document = { cookie: "XSRF-TOKEN=token" } as Document;
});

after(() => {
  globalThis.fetch = realFetch;
  globalThis.document = realDocument;
});

test("places an order with no locale segment and returns what the backend priced", async () => {
  // The worked example from API_CONTRACT.md, so the expected values come from
  // the spec rather than from anything this code computes.
  stubFetch(
    new Response(null, { status: 204 }),
    json(
      {
        id: 41,
        status: "pending",
        currency: "GBP",
        total_amount: 6400,
        lines: [
          { product: "one-card", unit_amount: 1900, quantity: 1, question: "What next?" },
          { product: "viewing-room-pass", unit_amount: 4500, quantity: 1, question: null },
        ],
        pay_token: "kQ3rN8xvT1sLb0Zy",
      },
      201,
    ),
  );

  const order = await placeOrder({
    name: "Jane Doe",
    email: "jane@example.com",
    currency: "GBP",
    lines: [{ product: "one-card", quantity: 1, question: "What next?" }, { product: "viewing-room-pass" }],
  });

  assert.equal(calls[1].url, "https://staging-api.theworldtarot.com/api/v1/orders");
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
    name: "Jane Doe",
    email: "jane@example.com",
    currency: "GBP",
    lines: [{ product: "one-card", quantity: 1, question: "What next?" }, { product: "viewing-room-pass" }],
  });

  assert.equal(order.id, 41);
  assert.equal(order.status, "pending");
  assert.deepEqual(order.total, { currency: "GBP", amount: 6400 });
  assert.equal(order.payToken, "kQ3rN8xvT1sLb0Zy");
  // The one currency the API sends, put back on every line's own price.
  assert.deepEqual(order.lines[1].unitPrice, { currency: "GBP", amount: 4500 });
});

test("paying returns the client secret, addressing the order by its pay token", async () => {
  stubFetch(
    new Response(null, { status: 204 }),
    json({ type: "client_secret", client_secret: "pi_1_secret_2" }),
  );

  const result = await payOrder("kQ3rN8xvT1sLb0Zy");

  assert.equal(
    calls[1].url,
    "https://staging-api.theworldtarot.com/api/v1/orders/kQ3rN8xvT1sLb0Zy/pay",
  );
  assert.equal(result.type, "client_secret");
  assert.equal(result.type === "client_secret" && result.clientSecret, "pi_1_secret_2");
});

test("an already settled order says there is nothing to pay", async () => {
  stubFetch(new Response(null, { status: 204 }), json({ type: "nothing_to_pay" }));

  assert.equal((await payOrder("kQ3rN8xvT1sLb0Zy")).type, "nothing_to_pay");
});

test("an unrecognised type is returned, never thrown", async () => {
  // A new payment method can add one, and the contract says to handle an
  // unknown `type` by not crashing. `gift_code` is the shape the backend has
  // reserved and not built, which makes it the honest example of a type this
  // code must not have a branch for. `redirect` was that example until 29
  // August; it has a branch now, and the test below is the one that proves it.
  stubFetch(
    new Response(null, { status: 204 }),
    json({ type: "gift_code", code: "not-a-shape-this-build-knows" }),
  );

  const result = await payOrder("kQ3rN8xvT1sLb0Zy");

  assert.equal(result.type, "unrecognised");
  assert.equal(result.type === "unrecognised" && result.reportedType, "gift_code");
});

test("a guest may place an order with no name and no email", async () => {
  // Relaxed on 29 August: Stripe's hosted page collects the buyer's email
  // *after* the order exists, and the webhook fills identity from the Session's
  // `customer_details`. The two keys must be absent rather than sent empty — an
  // empty string is an address, and a 422 on it would refuse a valid order.
  stubFetch(
    new Response(null, { status: 204 }),
    json(
      {
        id: 42,
        status: "pending",
        currency: "EUR",
        total_amount: 7000,
        lines: [{ product: "month-ahead", unit_amount: 7000, quantity: 1, question: "What next?" }],
        pay_token: "kQ3rN8xvT1sLb0Zy",
      },
      201,
    ),
  );

  const order = await placeOrder({
    currency: "EUR",
    lines: [{ product: "month-ahead", quantity: 1, question: "What next?" }],
  });

  assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
    currency: "EUR",
    lines: [{ product: "month-ahead", quantity: 1, question: "What next?" }],
  });
  assert.deepEqual(order.total, { currency: "EUR", amount: 7000 });
});

test("paying answers a redirect, read off `redirect_url`", async () => {
  // The field is `redirect_url` and not `url`. Reading the wrong key hands
  // `location.assign` an `undefined` and strands a customer whose order is
  // already placed, which is why this is asserted on the value rather than on
  // the type alone.
  stubFetch(
    new Response(null, { status: 204 }),
    json({ type: "redirect", redirect_url: "https://checkout.stripe.com/c/pay/cs_test_a1" }),
  );

  const result = await payOrder("kQ3rN8xvT1sLb0Zy");

  assert.equal(result.type, "redirect");
  assert.equal(
    result.type === "redirect" && result.redirectUrl,
    "https://checkout.stripe.com/c/pay/cs_test_a1",
  );
});

test("a redirect with no address is unrecognised rather than a redirect to nowhere", async () => {
  stubFetch(new Response(null, { status: 204 }), json({ type: "redirect" }));

  assert.equal((await payOrder("kQ3rN8xvT1sLb0Zy")).type, "unrecognised");
});

test("`return_to` is sent as the product key the checkout started from", async () => {
  // Optional, and a product key — never a path and never a URL. Send nothing
  // and a cancelled checkout lands on the readings index instead of the page
  // the customer was on.
  stubFetch(
    new Response(null, { status: 204 }),
    json({ type: "redirect", redirect_url: "https://checkout.stripe.com/c/pay/cs_test_a1" }),
  );

  await payOrder("kQ3rN8xvT1sLb0Zy", { returnTo: "month-ahead" });

  assert.deepEqual(JSON.parse(String(calls[1].init.body)), { return_to: "month-ahead" });
});

test("with no page to return to, the body carries no `return_to` at all", async () => {
  stubFetch(new Response(null, { status: 204 }), json({ type: "nothing_to_pay" }));

  await payOrder("kQ3rN8xvT1sLb0Zy");

  assert.deepEqual(JSON.parse(String(calls[1].init.body)), {});
});

test("`method` names the road, and the two roads are not interchangeable", async () => {
  // The card button and the wallet button ask this endpoint for different
  // things, and it cannot tell them apart otherwise. Relying on the backend's
  // default would mean the road changes when somebody edits a config file on
  // the other side.
  stubFetch(
    new Response(null, { status: 204 }),
    json({ type: "client_secret", client_secret: "pi_1_secret_2" }),
  );

  await payOrder("kQ3rN8xvT1sLb0Zy", { returnTo: "month-ahead", method: "stripe_wallet" });

  assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
    return_to: "month-ahead",
    method: "stripe_wallet",
  });
});

test("a method nobody named is absent rather than null", async () => {
  // `sometimes` is what the backend validates both of these with, and a key
  // present holding nothing is a key present: it fails the rule rather than
  // skipping it.
  stubFetch(new Response(null, { status: 204 }), json({ type: "nothing_to_pay" }));

  await payOrder("kQ3rN8xvT1sLb0Zy", { method: "stripe" });

  const body = JSON.parse(String(calls[1].init.body));

  assert.deepEqual(body, { method: "stripe" });
  assert.equal("return_to" in body, false);
});

test("a payment's status is read back with the pay token in the body", async () => {
  stubFetch(new Response(null, { status: 204 }), json({ status: "succeeded" }));

  const status = await fetchPaymentStatus("kQ3rN8xvT1sLb0Zy");

  assert.equal(status, "succeeded");
  // The token is a credential and a path segment lands in every access log
  // between the browser and the application, which is why this is a POST with a
  // body and why the assertion is on the URL as well as on the body.
  assert.equal(calls[1].url, "https://staging-api.theworldtarot.com/api/v1/orders/status");
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), { pay_token: "kQ3rN8xvT1sLb0Zy" });
});

test("a status this build has never heard of comes back as it was sent", async () => {
  // The set is Stripe's and can grow. Passing it through unchanged is what lets
  // the confirmation decide that an unrecognised status is not worth correcting
  // a screen over; a throw here would take that decision away from it.
  stubFetch(new Response(null, { status: 204 }), json({ status: "requires_hovercraft" }));

  assert.equal(await fetchPaymentStatus("kQ3rN8xvT1sLb0Zy"), "requires_hovercraft");
});

test("a 503 from the status endpoint throws, and says nothing about the payment", async () => {
  stubFetch(
    new Response(null, { status: 204 }),
    json({ message: "Stripe could not be reached." }, 503),
  );

  await assert.rejects(() => fetchPaymentStatus("kQ3rN8xvT1sLb0Zy"), { status: 503 });
});
