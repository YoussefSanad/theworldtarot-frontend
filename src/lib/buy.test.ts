import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { CheckoutUnavailable, startCheckout, startWalletPayment } from "./buy.ts";
import { recallCheckout } from "./checkout-session.ts";

type Call = { url: string; init: RequestInit };

const realFetch = globalThis.fetch;
const realDocument = globalThis.document;
const realStorage = Reflect.get(globalThis, "sessionStorage");

let calls: Call[] = [];

/** Stubbed at the network, so what is asserted is the request that leaves. */
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

function memoryStorage() {
  const entries = new Map<string, string>();

  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
  } as unknown as Storage;
}

const SESSION_URL = "https://checkout.stripe.com/c/pay/cs_test_a1B2c3#fidkdWxOYHwnPyd1blpx";

/**
 * The order as the backend prices it — **not** the offer the page was quoting.
 * The two are deliberately different here: what the confirmation restates has
 * to be what was actually charged.
 */
function placed(total = 7000) {
  return json(
    {
      id: 41,
      status: "pending",
      currency: "EUR",
      total_amount: total,
      lines: [{ product: "month-ahead", unit_amount: total, quantity: 1, question: null }],
      pay_token: "kQ3rN8xvT1sLb0Zy",
    },
    201,
  );
}

/** The four requests one press makes: two CSRF handshakes and two writes. */
function bodies() {
  return calls.filter((call) => call.init.body !== undefined).map((call) => JSON.parse(String(call.init.body)));
}

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://staging-api.theworldtarot.com";
  globalThis.document = { cookie: "XSRF-TOKEN=token" } as Document;
  Object.defineProperty(globalThis, "sessionStorage", { value: memoryStorage(), configurable: true });
});

after(() => {
  globalThis.fetch = realFetch;
  globalThis.document = realDocument;
  Object.defineProperty(globalThis, "sessionStorage", { value: realStorage, configurable: true });
});

const offer = { currency: "EUR", amount: 7000 };

test("one press places an order, pays it, remembers it, and answers where to send the browser", async () => {
  stubFetch(
    new Response(null, { status: 204 }),
    placed(),
    new Response(null, { status: 204 }),
    json({ type: "redirect", redirect_url: SESSION_URL }),
  );

  const url = await startCheckout({
    productKey: "month-ahead",
    money: offer,
    question: "What should I focus on this month?",
  });

  assert.equal(url, SESSION_URL);

  // Place, then pay. Folding the two into one call would buy about 300ms and
  // destroy the shape that makes a retry safe.
  assert.deepEqual(bodies(), [
    {
      currency: "EUR",
      lines: [
        { product: "month-ahead", quantity: 1, question: "What should I focus on this month?" },
      ],
    },
    // The road names itself. There are two from 29 August 2026 and the endpoint
    // cannot tell them apart otherwise.
    { return_to: "month-ahead", method: "stripe" },
  ]);

  // No name and no email: Stripe's page collects the buyer's email after the
  // order exists, and the reading page collects neither.
  assert.equal("name" in bodies()[0], false);
  assert.equal("email" in bodies()[0], false);
});

test("the record holds what the backend charged, not what the page was quoting", async () => {
  // The catalogue said €70 and the order came back at €65. The confirmation
  // restates a payment, so it must restate the second.
  stubFetch(
    new Response(null, { status: 204 }),
    placed(6500),
    new Response(null, { status: 204 }),
    json({ type: "redirect", redirect_url: SESSION_URL }),
  );

  await startCheckout({ productKey: "month-ahead", money: offer, question: "What next?" });

  assert.deepEqual(recallCheckout(), {
    payToken: "kQ3rN8xvT1sLb0Zy",
    money: { currency: "EUR", amount: 6500 },
    sessionId: "cs_test_a1B2c3",
    productKey: "month-ahead",
    question: "What next?",
  });
});

test("a question nobody typed is neither sent nor remembered", async () => {
  stubFetch(
    new Response(null, { status: 204 }),
    placed(),
    new Response(null, { status: 204 }),
    json({ type: "redirect", redirect_url: SESSION_URL }),
  );

  await startCheckout({ productKey: "month-ahead", money: offer, question: "   " });

  assert.deepEqual(bodies()[0].lines, [{ product: "month-ahead", quantity: 1 }]);
  assert.equal("question" in recallCheckout()!, false);
});

for (const answer of [
  { type: "nothing_to_pay" },
  // The wallet road's shape, arriving on the card road. Not something to
  // quietly act on: it means the backend disagreed about which road this is.
  { type: "client_secret", client_secret: "pi_1_secret_2" },
  { type: "conjured_by_a_later_backend" },
]) {
  test(`\`${answer.type}\` refuses the press rather than crashing it`, async () => {
    // The window where this frontend has shipped and the backend has not, and
    // the window after the backend grows a shape this build has never seen.
    // Neither may navigate anywhere, and neither may leave a record behind
    // that a confirmation would paint a payment from.
    stubFetch(
      new Response(null, { status: 204 }),
      placed(),
      new Response(null, { status: 204 }),
      json(answer),
    );

    await assert.rejects(
      () => startCheckout({ productKey: "month-ahead", money: offer }),
      CheckoutUnavailable,
    );

    assert.equal(recallCheckout(), null);
  });
}

test("a refused order never reaches the payment call", async () => {
  stubFetch(
    new Response(null, { status: 204 }),
    json({ message: "That is not something you can buy right now.", errors: { "lines.0.product": ["No."] } }, 422),
  );

  await assert.rejects(() => startCheckout({ productKey: "month-ahead", money: offer }), { status: 422 });

  assert.equal(bodies().length, 1);
  assert.equal(recallCheckout(), null);
});

test("an address with no Session id in it is still remembered, minus the guard", async () => {
  // The guard cannot be derived, so the confirmation will identify nothing and
  // say so — the receipt is the record that counts there. The question is not
  // guarded on a Session and still comes home from a cancelled checkout, which
  // is the half of this record that matters most.
  stubFetch(
    new Response(null, { status: 204 }),
    placed(),
    new Response(null, { status: 204 }),
    json({ type: "redirect", redirect_url: "https://checkout.stripe.com/somewhere-new" }),
  );

  const url = await startCheckout({
    productKey: "month-ahead",
    money: offer,
    question: "What next?",
  });

  assert.equal(url, "https://checkout.stripe.com/somewhere-new");
  assert.deepEqual(recallCheckout(), {
    payToken: "kQ3rN8xvT1sLb0Zy",
    money: { currency: "EUR", amount: 7000 },
    productKey: "month-ahead",
    question: "What next?",
  });
});

test("storage that refuses does not cost the customer their checkout", async () => {
  Object.defineProperty(globalThis, "sessionStorage", {
    value: {
      getItem: () => {
        throw new DOMException("denied");
      },
      setItem: () => {
        throw new DOMException("denied");
      },
      removeItem: () => {
        throw new DOMException("denied");
      },
    } as unknown as Storage,
    configurable: true,
  });

  stubFetch(
    new Response(null, { status: 204 }),
    placed(),
    new Response(null, { status: 204 }),
    json({ type: "redirect", redirect_url: SESSION_URL }),
  );

  assert.equal(await startCheckout({ productKey: "month-ahead", money: offer }), SESSION_URL);
});

/*
  The wallet road. The same four steps, ending in a secret to confirm rather
  than an address to navigate to.
*/

const SECRET = "pi_3Abc123_secret_XyZ789";

test("a wallet press places an order, pays it as a wallet, remembers it, and answers the secret", async () => {
  stubFetch(
    new Response(null, { status: 204 }),
    placed(),
    new Response(null, { status: 204 }),
    json({ type: "client_secret", client_secret: SECRET }),
  );

  const secret = await startWalletPayment({
    productKey: "month-ahead",
    money: offer,
    question: "What should I focus on this month?",
  });

  assert.equal(secret, SECRET);

  assert.deepEqual(bodies(), [
    {
      currency: "EUR",
      lines: [
        { product: "month-ahead", quantity: 1, question: "What should I focus on this month?" },
      ],
    },
    /*
      The road names itself, and `return_to` is absent. That field builds the
      addresses a hosted page returns to; there is no hosted page here and no
      cancel to come back from, and the only address in play is the one handed
      to `confirmPayment` for 3D Secure.
    */
    { method: "stripe_wallet" },
  ]);
});

test("the wallet record carries the secret and no Session id", async () => {
  // How the confirmation tells the two roads apart. A wallet payment leaves a
  // secret behind; a card payment leaves a Session id.
  stubFetch(
    new Response(null, { status: 204 }),
    placed(6500),
    new Response(null, { status: 204 }),
    json({ type: "client_secret", client_secret: SECRET }),
  );

  await startWalletPayment({ productKey: "month-ahead", money: offer, question: "What next?" });

  assert.deepEqual(recallCheckout(), {
    payToken: "kQ3rN8xvT1sLb0Zy",
    // The backend's price, not the one the sheet quoted.
    money: { currency: "EUR", amount: 6500 },
    productKey: "month-ahead",
    question: "What next?",
    clientSecret: SECRET,
  });
});

test("the record is written before the caller is given anything to confirm", async () => {
  // 3D Secure takes the browser away as completely as a redirect does, and
  // there is no code of ours left running on the other side of it.
  stubFetch(
    new Response(null, { status: 204 }),
    placed(),
    new Response(null, { status: 204 }),
    json({ type: "client_secret", client_secret: SECRET }),
  );

  let recordedWhenAnswered: unknown = "not read";

  await startWalletPayment({ productKey: "month-ahead", money: offer }).then((secret) => {
    recordedWhenAnswered = recallCheckout()?.clientSecret;

    return secret;
  });

  assert.equal(recordedWhenAnswered, SECRET);
});

for (const answer of [
  { type: "nothing_to_pay" },
  // The card road's shape, arriving on the wallet road. Following it would send
  // a customer to a hosted page after they had already authorised with Face ID.
  { type: "redirect", redirect_url: SESSION_URL },
  { type: "conjured_by_a_later_backend" },
]) {
  test(`the wallet road refuses \`${answer.type}\` rather than acting on it`, async () => {
    stubFetch(
      new Response(null, { status: 204 }),
      placed(),
      new Response(null, { status: 204 }),
      json(answer),
    );

    await assert.rejects(
      () => startWalletPayment({ productKey: "month-ahead", money: offer }),
      CheckoutUnavailable,
    );

    // Nothing for a confirmation to paint a payment from, because none happened.
    assert.equal(recallCheckout(), null);
  });
}

test("a refused order never reaches the wallet payment call", async () => {
  stubFetch(
    new Response(null, { status: 204 }),
    json({ message: "That is not something you can buy right now.", errors: { "lines.0.product": ["No."] } }, 422),
  );

  await assert.rejects(
    () => startWalletPayment({ productKey: "month-ahead", money: offer }),
    { status: 422 },
  );

  assert.equal(bodies().length, 1);
  assert.equal(recallCheckout(), null);
});
