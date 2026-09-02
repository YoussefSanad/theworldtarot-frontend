import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { askCurrencies, currencyOptions, forgetCurrencies, KNOWN_CURRENCIES, resolveCurrencies } from "./currencies.ts";

const realFetch = globalThis.fetch;
const realError = console.error;

let calls: string[] = [];

function stubFetch(...answers: Response[]): void {
  const queue = [...answers];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));

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
  console.error = () => {};
  forgetCurrencies();
});

after(() => {
  globalThis.fetch = realFetch;
  console.error = realError;
});

test("what the backend answers is what the control offers, symbols included", () => {
  const live = [
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
  ];

  assert.deepEqual(resolveCurrencies(live), live);
});

test("before the answer the three known currencies stand, so the control is never empty", () => {
  assert.deepEqual(resolveCurrencies(null), KNOWN_CURRENCIES);
});

test("a failed request keeps the control on the page", () => {
  // The difference from languages, and the whole reason this resolver is not
  // the same function: a currency cannot appear or vanish without a migration
  // and a deploy on both sides, so a list held here cannot silently drift.
  assert.deepEqual(resolveCurrencies(null), KNOWN_CURRENCIES);
  assert.equal(resolveCurrencies(null).length, 3);
});

test("an empty answer is a fault rather than a shop that sells in no currency", () => {
  assert.deepEqual(resolveCurrencies([]), KNOWN_CURRENCIES);
});

test("the known three are the ones the backend sells in", () => {
  assert.deepEqual(
    KNOWN_CURRENCIES.map((currency) => currency.code),
    ["USD", "EUR", "GBP"],
  );
});

test("the currencies endpoint carries no locale segment, being the same list in every language", async () => {
  stubFetch(json({ available: [{ code: "USD", symbol: "$" }] }));

  await askCurrencies();

  assert.deepEqual(calls, ["https://staging-api.theworldtarot.com/api/v1/currencies"]);
});

test("asked once however many controls want it — the header renders two", async () => {
  stubFetch(json({ available: [{ code: "GBP", symbol: "£" }] }));

  await askCurrencies();
  await askCurrencies();

  assert.equal(calls.length, 1);
});

test("an answered list reads back", async () => {
  stubFetch(json({ available: [{ code: "GBP", symbol: "£" }] }));

  await askCurrencies();

  assert.deepEqual(currencyOptions(), [{ code: "GBP", symbol: "£" }]);
});

test("a broken endpoint leaves the three known currencies on screen", async () => {
  stubFetch(json({ message: "nope" }, 500));

  await askCurrencies();

  assert.deepEqual(resolveCurrencies(currencyOptions()), KNOWN_CURRENCIES);
});
