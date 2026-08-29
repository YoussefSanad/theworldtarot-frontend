import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  checkoutFor,
  recallCheckout,
  rememberCheckout,
  sessionIdFrom,
  type CheckoutRecord,
} from "./checkout-session.ts";

const realStorage = Reflect.get(globalThis, "sessionStorage");

/** Enough of the Storage interface for this module, in memory. */
function memoryStorage() {
  const entries = new Map<string, string>();

  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
  } as unknown as Storage;
}

/** A storage that refuses everything, as a locked-down browser's does. */
function refusingStorage() {
  return {
    getItem: () => {
      throw new DOMException("denied");
    },
    setItem: () => {
      throw new DOMException("denied");
    },
    removeItem: () => {
      throw new DOMException("denied");
    },
  } as unknown as Storage;
}

function useStorage(storage: Storage): void {
  Object.defineProperty(globalThis, "sessionStorage", { value: storage, configurable: true });
}

const record: CheckoutRecord = {
  payToken: "the-authority-to-pay",
  money: { currency: "EUR", amount: 4900 },
  sessionId: "cs_test_a1B2c3",
  productKey: "month-ahead",
  question: "What should I focus on this month?",
};

beforeEach(() => {
  useStorage(memoryStorage());
});

afterEach(() => {
  Object.defineProperty(globalThis, "sessionStorage", { value: realStorage, configurable: true });
});

test("a written record reads back whole", () => {
  rememberCheckout(record);

  assert.deepEqual(recallCheckout(), record);
});

test("reading twice returns the record both times, so a reload still works", () => {
  rememberCheckout(record);

  assert.deepEqual(recallCheckout(), record);
  assert.deepEqual(recallCheckout(), record);
});

test("a second purchase replaces the first, so the older one cannot be recalled", () => {
  rememberCheckout(record);
  rememberCheckout({ ...record, payToken: "the-second-order", sessionId: "cs_test_d4E5f6" });

  assert.equal(recallCheckout()?.sessionId, "cs_test_d4E5f6");
});

test("the question is optional — a customer may type nothing and still buy", () => {
  const { question, ...silent } = record;

  rememberCheckout(silent);

  assert.deepEqual(recallCheckout(), silent);
  assert.equal(question, record.question);
});

test("a client secret is kept when one is written, for the road that brings it back", () => {
  const walletRecord = { ...record, clientSecret: "pi_3Abc123_secret_XyZ789" };

  rememberCheckout(walletRecord);

  assert.deepEqual(recallCheckout(), walletRecord);
});

test("nothing stored recalls as null", () => {
  assert.equal(recallCheckout(), null);
});

test("a record that is not JSON recalls as null rather than throwing", () => {
  sessionStorage.setItem("checkout", "{not json");

  assert.equal(recallCheckout(), null);
});

for (const [name, stored] of [
  ["no pay token", { ...record, payToken: undefined }],
  ["an empty pay token", { ...record, payToken: "" }],
  ["no session id", { ...record, sessionId: undefined }],
  ["an empty session id", { ...record, sessionId: "" }],
  ["no product key", { ...record, productKey: undefined }],
  ["no money", { ...record, money: undefined }],
  ["money as a bare number", { ...record, money: 4900 }],
  ["an amount that is not a number", { ...record, money: { currency: "EUR", amount: "4900" } }],
  ["no currency", { ...record, money: { amount: 4900 } }],
  ["a question that is not a string", { ...record, question: 12 }],
  ["a client secret that is not a string", { ...record, clientSecret: 12 }],
] as const) {
  test(`a stored value with ${name} recalls as null`, () => {
    sessionStorage.setItem("checkout", JSON.stringify(stored));

    assert.equal(recallCheckout(), null);
  });
}

test("a record from the build before this one recalls as null", () => {
  // What the wallet road wrote: a client secret, no session and no product. It
  // outlives a deploy in a tab that was open across one, and it is the ordinary
  // way this returns something unusable.
  sessionStorage.setItem(
    "checkout",
    JSON.stringify({
      payToken: record.payToken,
      money: record.money,
      clientSecret: "pi_3Abc123_secret_XyZ789",
    }),
  );

  assert.equal(recallCheckout(), null);
});

test("storage that refuses is survivable in both directions", () => {
  useStorage(refusingStorage());

  assert.doesNotThrow(() => rememberCheckout(record));
  assert.equal(recallCheckout(), null);
  assert.equal(checkoutFor("cs_test_a1B2c3"), null);
});

test("the record is returned for the payment it names", () => {
  rememberCheckout(record);

  assert.deepEqual(checkoutFor("cs_test_a1B2c3"), record);
});

test("a record naming another payment is withheld — the stale-result guard", () => {
  rememberCheckout(record);

  assert.equal(checkoutFor("cs_test_d4E5f6"), null);
});

test("with no session named, nothing is shown at all", () => {
  // A typed address, or a bookmark. The record is a payment made in this tab
  // and the URL is not evidence of having just made it, so a confirmation
  // reached this way has nothing to show rather than the last purchase's money.
  rememberCheckout(record);

  assert.equal(checkoutFor(null), null);
});

test("no record applies to any payment", () => {
  assert.equal(checkoutFor(null), null);
  assert.equal(checkoutFor("cs_test_a1B2c3"), null);
});

test("the session id is read off the redirect's path", () => {
  assert.equal(
    sessionIdFrom("https://checkout.stripe.com/c/pay/cs_test_a1B2c3#fidkdWxOYHwnPyd1blpx"),
    "cs_test_a1B2c3",
  );
  assert.equal(sessionIdFrom("https://checkout.stripe.com/pay/cs_live_b7X8y9"), "cs_live_b7X8y9");
});

test("nothing that is not a Session's address yields an id", () => {
  // The fragment carries an opaque blob of Stripe's own, and a query string is
  // not where a Session names itself either. Neither may stand in for the id
  // the confirmation is guarded on.
  assert.equal(sessionIdFrom("https://checkout.stripe.com/c/pay/#cs_test_a1B2c3"), null);
  assert.equal(sessionIdFrom("https://checkout.stripe.com/c/pay/?id=cs_test_a1B2c3"), null);
  assert.equal(sessionIdFrom("https://example.test/somewhere-else"), null);
  assert.equal(sessionIdFrom("not a url at all"), null);
});
