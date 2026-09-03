import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { fetchCurrencies, fetchLanguages, fetchProduct, fetchProducts } from "./api.ts";

const realFetch = globalThis.fetch;

let calls: string[] = [];

function stubFetch(...responses: Response[]): void {
  const queue = [...responses];

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

const BASE = "https://staging-api.theworldtarot.com";

const product = {
  key: "month-ahead",
  type: "reading",
  name: "MONTH AHEAD",
  short_description: "What's in Store?",
  allows_question: true,
  is_giftable: true,
  price: { currency: "USD", amount: 7500 },
};

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = BASE;
});

after(() => {
  globalThis.fetch = realFetch;
});

test("a cold catalogue request carries no query string at all, so the backend detects", async () => {
  stubFetch(json([product]));

  await fetchProducts();

  assert.equal(calls[0], `${BASE}/api/v1/en/products`);
});

test("a chosen currency travels on the catalogue request", async () => {
  stubFetch(json([product]));

  await fetchProducts({ currency: "GBP" });

  assert.equal(calls[0], `${BASE}/api/v1/en/products?currency=GBP`);
});

test("locale and currency are independent, and both land in the right part of the URL", async () => {
  stubFetch(json([product]));

  await fetchProducts({ locale: "es", currency: "GBP" });

  assert.equal(calls[0], `${BASE}/api/v1/es/products?currency=GBP`);
});

test("a cold product request carries no query string either", async () => {
  stubFetch(json(product));

  await fetchProduct("month-ahead");

  assert.equal(calls[0], `${BASE}/api/v1/en/products/month-ahead`);
});

test("a chosen currency travels on the product request", async () => {
  stubFetch(json(product));

  await fetchProduct("month-ahead", { currency: "EUR" });

  assert.equal(calls[0], `${BASE}/api/v1/en/products/month-ahead?currency=EUR`);
});

test("the currencies endpoint answers what we sell in, with symbols", async () => {
  stubFetch(
    json({
      available: [
        { code: "USD", symbol: "$" },
        { code: "EUR", symbol: "€" },
        { code: "GBP", symbol: "£" },
      ],
      detected: "EUR",
    }),
  );

  assert.deepEqual(await fetchCurrencies(), [
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
  ]);
});

test("`detected` is not read, because the highlight comes from the price the product carried", async () => {
  stubFetch(json({ available: [{ code: "USD", symbol: "$" }], detected: "GBP" }));

  const currencies = await fetchCurrencies();

  assert.deepEqual(currencies, [{ code: "USD", symbol: "$" }]);
});

test("the currencies endpoint has no locale segment, carrying no copy", async () => {
  stubFetch(json({ available: [] }));

  await fetchCurrencies();

  assert.equal(calls[0], `${BASE}/api/v1/currencies`);
});

test("a currencies body shaped some other way answers nothing rather than being cast", async () => {
  stubFetch(json({ available: "USD,EUR" }));

  assert.deepEqual(await fetchCurrencies(), []);
});

test("a broken currencies endpoint throws, so the caller can keep the three it knows", async () => {
  stubFetch(json({}, 500));

  await assert.rejects(() => fetchCurrencies());
});

test("the languages endpoint answers the live languages", async () => {
  stubFetch(json([{ code: "en", label: "English" }]));

  assert.deepEqual(await fetchLanguages(), [{ code: "en", label: "English" }]);
});

test("a native name rides along when the backend has one", async () => {
  stubFetch(json([{ code: "es", label: "Spanish", native_name: "Español" }]));

  const languages = await fetchLanguages();

  assert.equal(languages[0].native_name, "Español");
});

test("the languages endpoint sits outside the locale segment, being what says which there are", async () => {
  stubFetch(json([]));

  await fetchLanguages();

  assert.equal(calls[0], `${BASE}/api/v1/languages`);
});

test("an entry with no code is dropped rather than drawn as a dead switch", async () => {
  stubFetch(json([{ code: "en", label: "English" }, { label: "Nameless" }]));

  assert.deepEqual(await fetchLanguages(), [{ code: "en", label: "English" }]);
});

test("a broken languages endpoint throws, and the caller draws no switcher", async () => {
  stubFetch(json([], 503));

  await assert.rejects(() => fetchLanguages());
});
