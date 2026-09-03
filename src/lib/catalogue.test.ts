import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { askCatalogue, catalogue, forgetCatalogue } from "./catalogue.ts";
import { currencySelection, forgetCurrency } from "./currency.ts";

const realFetch = globalThis.fetch;
const realStorage = Reflect.get(globalThis, "localStorage");
const realError = console.error;

let calls: string[] = [];

type Deferred = { promise: Promise<Response>; settle: (response: Response) => void };

function deferred(): Deferred {
  let settle!: (response: Response) => void;
  const promise = new Promise<Response>((resolve) => (settle = resolve));

  return { promise, settle };
}

function stubFetch(...answers: (Response | Deferred)[]): void {
  const queue = [...answers];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));

    const next = queue.shift();
    if (!next) throw new Error(`Unexpected fetch to ${String(input)}.`);

    return next instanceof Response ? next : next.promise;
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

function priced(currency: string, amount: number) {
  return [
    {
      key: "month-ahead",
      type: "reading",
      name: "MONTH AHEAD",
      short_description: "What's in Store?",
      allows_question: true,
      is_giftable: true,
      price: { currency, amount },
    },
  ];
}

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://staging-api.theworldtarot.com";
  Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(), configurable: true });
  forgetCatalogue();
  forgetCurrency();
  console.error = () => {};
});

after(() => {
  globalThis.fetch = realFetch;
  Object.defineProperty(globalThis, "localStorage", { value: realStorage, configurable: true });
  console.error = realError;
});

test("nothing has been asked for before the first ask, so the export ships bundled copy", () => {
  assert.equal(catalogue(), null);
});

test("a cold ask carries no currency", async () => {
  stubFetch(json(priced("EUR", 7000)));

  await askCatalogue(null);

  assert.equal(calls[0], "https://staging-api.theworldtarot.com/api/v1/en/products");
});

test("a chosen currency rides on the ask", async () => {
  stubFetch(json(priced("GBP", 6300)));

  await askCatalogue("GBP");

  assert.equal(calls[0], "https://staging-api.theworldtarot.com/api/v1/en/products?currency=GBP");
});

test("the answer is readable by everything on the page, from one call", async () => {
  stubFetch(json(priced("EUR", 7000)));

  await askCatalogue(null);

  assert.equal(catalogue()?.[0].price.amount, 7000);
});

test("what the backend resolved to is remembered, so a page with no product can still highlight it", async () => {
  stubFetch(json(priced("EUR", 7000)));

  await askCatalogue(null);

  assert.equal(currencySelection().resolved, "EUR");
});

test("a cold visitor stays cold through a detected answer", async () => {
  stubFetch(json(priced("EUR", 7000)));

  await askCatalogue(null);

  assert.equal(currencySelection().chosen, null);
});

test("two surfaces asking for the same thing make one call between them", async () => {
  stubFetch(json(priced("EUR", 7000)));

  await Promise.all([askCatalogue(null), askCatalogue(null)]);
  await askCatalogue(null);

  assert.equal(calls.length, 1);
});

test("a change of currency asks again", async () => {
  stubFetch(json(priced("EUR", 7000)), json(priced("GBP", 6300)));

  await askCatalogue(null);
  await askCatalogue("GBP");

  assert.equal(calls.length, 2);
  assert.equal(catalogue()?.[0].price.currency, "GBP");
});

test("the previous prices stay readable while the new ones are in flight", async () => {
  const second = deferred();
  stubFetch(json(priced("EUR", 7000)), second);

  await askCatalogue(null);
  const refetch = askCatalogue("GBP");

  // Mid-switch: blanking here would collapse a carousel for the length of a
  // round trip, so the stale price holds.
  assert.equal(catalogue()?.[0].price.amount, 7000);

  second.settle(json(priced("GBP", 6300)));
  await refetch;

  assert.equal(catalogue()?.[0].price.amount, 6300);
});

test("a failed refetch leaves the prices that were on screen", async () => {
  stubFetch(json(priced("EUR", 7000)), json({}, 500));

  await askCatalogue(null);
  await askCatalogue("GBP");

  assert.equal(catalogue()?.[0].price.amount, 7000);
});

test("a first ask that fails leaves nothing, and the bundled copy stands", async () => {
  stubFetch(json({}, 500));

  await askCatalogue(null);

  assert.equal(catalogue(), null);
});

test("an overtaken answer never lands on top of a newer one", async () => {
  const slow = deferred();
  const quick = deferred();
  stubFetch(slow, quick);

  const first = askCatalogue("GBP");
  const second = askCatalogue("EUR");

  quick.settle(json(priced("EUR", 7000)));
  await second;

  slow.settle(json(priced("GBP", 6300)));
  await first;

  assert.equal(catalogue()?.[0].price.currency, "EUR");
});
