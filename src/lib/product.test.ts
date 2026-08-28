import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { fetchProduct } from "./api.ts";
import { resolveOffer } from "./product.ts";

/**
 * The four states of a page that sells one reading, and the fetch under them.
 *
 * Stubbed at the network rather than at `fetchProduct`, as `orders.test.ts` is:
 * what matters is the status code the backend actually answers with, since a
 * 404 and a 500 are the two states this whole ticket exists to tell apart.
 *
 * `useProduct` itself is not exercised here — there is no renderer in this
 * project — which is exactly why the rule it implements lives in the pure
 * `resolveOffer` beside it.
 */

const realFetch = globalThis.fetch;
let urls: string[] = [];

function stubFetch(response: Response | Error): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    urls.push(String(input));

    if (response instanceof Error) throw response;

    return response;
  }) as typeof fetch;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const monthAhead = {
  key: "month-ahead",
  type: "reading" as const,
  name: "Month Ahead Reading",
  short_description: "One month, five cards.",
  long_description: "A written reading of the weeks to come.",
  allows_question: true,
  price: { currency: "EUR", amount: 7000 },
};

beforeEach(() => {
  urls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://staging-api.theworldtarot.com";
});

after(() => {
  globalThis.fetch = realFetch;
});

test("no answer yet is loading, and is not a withdrawn product", () => {
  assert.deepEqual(resolveOffer(undefined, false), { status: "loading" });
});

test("a priced product is live, and carries the money the API sent", () => {
  const offer = resolveOffer(monthAhead, false);

  assert.equal(offer.status, "live");
  assert.deepEqual(offer.status === "live" && offer.money, { currency: "EUR", amount: 7000 });
});

test("a failed request is unreachable, and carries no money to pay with", () => {
  // Both arguments together: a failure can arrive after the fetch resolved on a
  // previous key, and the failure has to win.
  assert.deepEqual(resolveOffer(monthAhead, true), { status: "unreachable" });
  assert.deepEqual(resolveOffer(undefined, true), { status: "unreachable" });
});

test("a 404 is withdrawn rather than loading, so the page stops offering it", () => {
  assert.deepEqual(resolveOffer(null, false), { status: "withdrawn" });
});

test("the product is read by key, under the site's locale", async () => {
  stubFetch(json(monthAhead));

  await fetchProduct("month-ahead", { locale: "en" });

  assert.deepEqual(urls, [
    "https://staging-api.theworldtarot.com/api/v1/en/products/month-ahead",
  ]);
});

test("a 404 comes back as null rather than throwing", async () => {
  stubFetch(json({ message: "Not found." }, 404));

  assert.equal(await fetchProduct("in-depth"), null);
});

test("a 500 throws, so an unreachable API is never mistaken for a withdrawn product", async () => {
  stubFetch(json({ message: "Server error." }, 500));

  await assert.rejects(fetchProduct("month-ahead"), /failed with 500/);
});

test("a network failure throws", async () => {
  stubFetch(new TypeError("Failed to fetch"));

  await assert.rejects(fetchProduct("month-ahead"), /Failed to fetch/);
});
