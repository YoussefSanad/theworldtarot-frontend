import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { checkoutFor, paymentIntentId, recallCheckout, rememberCheckout } from "./checkout-session.ts";

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

const record = {
  payToken: "the-authority-to-pay",
  money: { currency: "EUR", amount: 4900 },
  clientSecret: "pi_3Abc123_secret_XyZ789",
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
  rememberCheckout({ ...record, payToken: "the-second-order", clientSecret: "pi_3Def456_secret_Uvw" });

  const recalled = recallCheckout();

  assert.equal(recalled?.clientSecret, "pi_3Def456_secret_Uvw");
  assert.equal(paymentIntentId(recalled!.clientSecret), "pi_3Def456");
});

test("the intent id is the client secret up to _secret", () => {
  assert.equal(paymentIntentId("pi_3Abc123_secret_XyZ789"), "pi_3Abc123");
});

test("nothing stored recalls as null", () => {
  assert.equal(recallCheckout(), null);
});

test("a record that is not JSON recalls as null rather than throwing", () => {
  sessionStorage.setItem("checkout", "{not json");

  assert.equal(recallCheckout(), null);
});

for (const [name, stored] of [
  ["no pay token", { money: record.money, clientSecret: record.clientSecret }],
  ["an empty pay token", { ...record, payToken: "" }],
  ["no client secret", { payToken: record.payToken, money: record.money }],
  ["no money", { payToken: record.payToken, clientSecret: record.clientSecret }],
  ["money as a bare number", { ...record, money: 4900 }],
  ["an amount that is not a number", { ...record, money: { currency: "EUR", amount: "4900" } }],
  ["no currency", { ...record, money: { amount: 4900 } }],
] as const) {
  test(`a stored value with ${name} recalls as null`, () => {
    sessionStorage.setItem("checkout", JSON.stringify(stored));

    assert.equal(recallCheckout(), null);
  });
}

test("storage that refuses is survivable in both directions", () => {
  useStorage(refusingStorage());

  assert.doesNotThrow(() => rememberCheckout(record));
  assert.equal(recallCheckout(), null);
  assert.equal(checkoutFor(null), null);
});

test("the record is returned for the payment it names", () => {
  rememberCheckout(record);

  assert.deepEqual(checkoutFor("pi_3Abc123"), record);
});

test("a record naming another payment is withheld — the stale-result guard", () => {
  rememberCheckout(record);

  assert.equal(checkoutFor("pi_3Def456"), null);
});

test("with no intent named, the record is the payment being displayed", () => {
  rememberCheckout(record);

  assert.deepEqual(checkoutFor(null), record);
});

test("no record applies to any payment", () => {
  assert.equal(checkoutFor(null), null);
  assert.equal(checkoutFor("pi_3Abc123"), null);
});
