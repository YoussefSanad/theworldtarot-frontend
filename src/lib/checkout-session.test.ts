import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  checkoutFor,
  forgetQuestion,
  paymentIntentFrom,
  questionFor,
  recallCheckout,
  rememberCheckout,
  sessionIdFrom,
  walletCheckoutFor,
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
  ["an empty session id", { ...record, sessionId: "" }],
  ["a session id that is not a string", { ...record, sessionId: 12 }],
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

test("a record with no Session id reads back, because the question is worth more", () => {
  // A redirect `sessionIdFrom` could not read. The payment cannot be confirmed
  // and the confirmation says so; the question still comes home.
  const { sessionId, ...unconfirmable } = record;

  rememberCheckout(unconfirmable);

  assert.deepEqual(recallCheckout(), unconfirmable);
  assert.equal(sessionId, record.sessionId);
});

test("and it confirms nothing, because it names no payment", () => {
  const { sessionId, ...unconfirmable } = record;

  rememberCheckout(unconfirmable);

  // Not even against the Session it was in fact made for: the record cannot say
  // so, and a guard that passes on a value it never held is not a guard.
  assert.equal(checkoutFor(sessionId ?? null), null);
  assert.equal(checkoutFor("cs_test_anything"), null);
  // The question is not guarded on a Session, so it is still there.
  assert.equal(questionFor("month-ahead"), record.question);
});

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

test("the same object comes back until the record changes, so it can be a snapshot", () => {
  // `useSyncExternalStore` calls this on every render and compares with
  // `Object.is`. A fresh parse each time would answer a new object each time
  // and render the reading page forever.
  rememberCheckout(record);

  assert.equal(recallCheckout(), recallCheckout());

  const first = recallCheckout();

  rememberCheckout({ ...record, sessionId: "cs_test_d4E5f6" });

  assert.notEqual(recallCheckout(), first);
  assert.equal(recallCheckout()?.sessionId, "cs_test_d4E5f6");
});

test("the question is offered to the reading it was typed on", () => {
  rememberCheckout(record);

  assert.equal(questionFor("month-ahead"), record.question);
});

test("and to no other reading", () => {
  // A question restored onto a different reading is a sentence appearing in a
  // box the visitor did not type it in.
  rememberCheckout(record);

  assert.equal(questionFor("three-card"), undefined);
});

test("no record offers no question", () => {
  assert.equal(questionFor("month-ahead"), undefined);
});

test("a gift is remembered as one, and the flag survives the round trip", () => {
  rememberCheckout({ ...record, gift: true });

  assert.equal(recallCheckout()?.gift, true);
});

test("a gift's note is kept on the record and never offered to the question box", () => {
  /*
    **The one thing `questionFor` exists to prevent, in its gift form.** In gift
    mode the line's `question` is a note this code composed — "Gift — send this
    reading to …" — and putting that back in the textarea a customer types their
    own sentence into is the same fault as restoring a stranger's question,
    arriving by a different door.

    Kept on the record rather than dropped, because the confirmation and anybody
    reading this from support still want to know what was bought and for whom.
    It is the restore that refuses it, not the record.
  */
  rememberCheckout({ ...record, gift: true });

  assert.equal(recallCheckout()?.question, record.question);
  assert.equal(questionFor("month-ahead"), undefined);
});

test("a gift flag of the wrong type refuses the whole record", () => {
  // The same treatment every other optional field gets: validated when present,
  // and a record that reads back is the object that was written.
  sessionStorage.setItem("checkout", JSON.stringify({ ...record, gift: "yes" }));

  assert.equal(recallCheckout(), null);
});

test("a spent question is dropped and the rest of the record stays", () => {
  // The confirmation's call, once the backend has said the money moved. The
  // Money and the pay token stay, so a reload of the confirmation still works.
  rememberCheckout(record);

  forgetQuestion(record);

  const { question, ...rest } = record;

  assert.deepEqual(recallCheckout(), rest);
  assert.equal(questionFor("month-ahead"), undefined);
  assert.equal(question, record.question);
});

test("spending a question twice is harmless", () => {
  rememberCheckout(record);

  forgetQuestion(record);
  forgetQuestion(record);

  assert.equal(recallCheckout()?.payToken, record.payToken);
});

test("a purchase started since the verification began keeps its question", () => {
  // A verification takes a round trip. A second purchase in this tab while it
  // was in flight leaves a record whose question is about the reading being
  // bought right now, and that one is not spent.
  rememberCheckout(record);

  const second = { ...record, payToken: "the-second-order", question: "A different question" };

  rememberCheckout(second);
  forgetQuestion(record);

  assert.deepEqual(recallCheckout(), second);
});

/*
  The wallet road: a record with a client secret and no Session id, guarded on
  the intent Stripe names in the address it returns to.
*/

const SECRET = "pi_3Abc123_secret_XyZ789";

/** What the wallet road wrote before it confirmed. No Session id on this road. */
const walletRecord: CheckoutRecord = {
  payToken: "kQ3rN8xvT1sLb0Zy",
  money: { currency: "EUR", amount: 4900 },
  productKey: "month-ahead",
  question: "What next?",
  clientSecret: SECRET,
};

test("an intent id is the part of the secret before the separator", () => {
  assert.equal(paymentIntentFrom(SECRET), "pi_3Abc123");
});

test("a string that is not a client secret yields no intent", () => {
  // Each of these would be an id the secret does not belong to, which is the
  // one thing a guard may never produce.
  assert.equal(paymentIntentFrom("pi_3Abc123"), null);
  assert.equal(paymentIntentFrom("cs_test_a1_secret_b2"), null);
  assert.equal(paymentIntentFrom(""), null);
});

test("an intent named in the address shows the record that belongs to it", () => {
  rememberCheckout(walletRecord);

  assert.deepEqual(walletCheckoutFor("pi_3Abc123"), walletRecord);
});

test("a second wallet purchase cannot be shown against the first one's intent", () => {
  // The same stale-result guard the card road has, against a different id. A
  // record naming another payment describes some other purchase, and none of it
  // may appear on this screen.
  rememberCheckout({ ...walletRecord, clientSecret: "pi_3Second_secret_ZzZ" });

  assert.equal(walletCheckoutFor("pi_3Abc123"), null);
});

test("an address with no intent in it shows nothing", () => {
  rememberCheckout(walletRecord);

  assert.equal(walletCheckoutFor(null), null);
});

test("the two roads refuse each other's records", () => {
  // What having two guards buys: neither caller has to know there is another
  // road. A card record has no secret to derive an intent from, and a wallet
  // record has no Session id.
  rememberCheckout(walletRecord);

  assert.equal(checkoutFor("cs_test_a1B2c3"), null);

  rememberCheckout(record);

  assert.equal(walletCheckoutFor("pi_3Abc123"), null);
});
