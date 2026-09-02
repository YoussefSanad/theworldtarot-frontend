import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  chooseCurrency,
  currencySelection,
  currencySelectionOnServer,
  forgetCurrency,
  rememberResolvedCurrency,
  subscribeToCurrency,
} from "./currency.ts";

const realStorage = Reflect.get(globalThis, "localStorage");

/** Enough of the Storage interface for this module, in memory. */
function memoryStorage(seed: Record<string, string> = {}) {
  const entries = new Map<string, string>(Object.entries(seed));

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
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
}

beforeEach(() => {
  useStorage(memoryStorage());
  forgetCurrency();
});

afterEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: realStorage, configurable: true });
});

test("a visitor who has never chosen has no chosen currency, so a cold request carries none", () => {
  assert.equal(currencySelection().chosen, null);
});

test("a visitor who has never chosen has nothing resolved either", () => {
  assert.equal(currencySelection().resolved, null);
});

test("a choice reads back", () => {
  chooseCurrency("GBP");

  assert.equal(currencySelection().chosen, "GBP");
});

test("a choice survives a reload, which is what makes it stick", () => {
  chooseCurrency("GBP");

  // A fresh page load: the module's cache is empty and the storage is the one
  // the last load left behind.
  useStorage(memoryStorage({ "currency.chosen": "GBP" }));
  forgetCurrency();

  assert.equal(currencySelection().chosen, "GBP");
});

test("what the backend resolved is remembered apart from what was chosen", () => {
  rememberResolvedCurrency("EUR");

  assert.deepEqual(currencySelection(), { chosen: null, resolved: "EUR" });
});

test("remembering a resolved currency leaves a cold visitor cold", () => {
  rememberResolvedCurrency("EUR");

  // The whole point of the two values: this visitor still sends nothing, so
  // crossing a border re-detects them.
  assert.equal(currencySelection().chosen, null);
});

test("the snapshot is the same object until something changes, or useSyncExternalStore renders forever", () => {
  chooseCurrency("GBP");

  assert.equal(currencySelection(), currencySelection());
});

test("the snapshot is a new object once something changes", () => {
  const before = currencySelection();
  chooseCurrency("GBP");

  assert.notEqual(currencySelection(), before);
});

test("a choice notifies subscribers, since a same-tab write raises no storage event", () => {
  let told = 0;
  const unsubscribe = subscribeToCurrency(() => (told += 1));

  chooseCurrency("GBP");
  rememberResolvedCurrency("EUR");

  unsubscribe();
  assert.equal(told, 2);
});

test("an unsubscribed listener stops hearing", () => {
  let told = 0;
  subscribeToCurrency(() => (told += 1))();

  chooseCurrency("GBP");

  assert.equal(told, 0);
});

test("the server snapshot is empty, because the export is built with nobody having chosen", () => {
  assert.deepEqual(currencySelectionOnServer(), { chosen: null, resolved: null });
});

test("the server snapshot is stable, which useSyncExternalStore requires of it too", () => {
  assert.equal(currencySelectionOnServer(), currencySelectionOnServer());
});

test("a browser that refuses storage still answers rather than throwing", () => {
  useStorage(refusingStorage());
  forgetCurrency();

  assert.deepEqual(currencySelection(), { chosen: null, resolved: null });
});

test("a browser that refuses storage still takes a choice for this page load", () => {
  useStorage(refusingStorage());
  forgetCurrency();

  chooseCurrency("GBP");

  // The write is lost on reload, which is a worse experience and not a broken
  // one. What must not happen is the switch throwing into the header.
  assert.equal(currencySelection().chosen, "GBP");
});
