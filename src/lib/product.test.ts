import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { fetchProduct } from "./api.ts";
import { giftOffered, resolveOffer } from "./product.ts";

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
  is_giftable: true,
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

test("a failed first request is unreachable, and carries no money to pay with", () => {
  // Only when there is nothing to keep. A failure used to outrank the answer
  // whatever it held, which took the offer down on a currency switch the API
  // could not answer — the test above is the rule that replaced it.
  assert.deepEqual(resolveOffer(undefined, true), { status: "unreachable" });
});

test("a failed refetch leaves the price that was on screen", () => {
  // The rule `lib/catalogue.ts` follows, on the page that takes money: a
  // currency switch the API cannot answer keeps quoting the old price for the
  // length of a round trip rather than taking the offer down under the
  // visitor's thumb. The answer being for a *different* key is not this
  // function's problem — `useProduct` scopes what it keeps to the key it is
  // about, so a stale product never reaches here under a new one.
  const offer = resolveOffer(monthAhead, true);

  assert.equal(offer.status, "live");
  assert.deepEqual(offer.status === "live" && offer.money, { currency: "EUR", amount: 7000 });
});

test("a 404 is withdrawn rather than loading, so the page stops offering it", () => {
  assert.deepEqual(resolveOffer(null, false), { status: "withdrawn" });
});

test("a live product the backend says may not be gifted draws no toggle", () => {
  /*
    **The whole of F4.** `POST /orders` refuses a gift object on a line that is
    not giftable with a 422 keyed to that line, rather than dropping it quietly
    — so a toggle drawn from a list held in this repository is a button that
    refuses on submit, and it would be wrong the first time the client made a
    fourth reading giftable. `one-card` is the product this is about: it takes a
    question and cannot be gifted, which is what keeps the two flags apart.
  */
  assert.equal(giftOffered(resolveOffer({ ...monthAhead, is_giftable: false }, false)), false);
});

test("and a live product that may be gifted draws one", () => {
  assert.equal(giftOffered(resolveOffer(monthAhead, false)), true);
});

test("the toggle stands while the catalogue is still being asked", () => {
  /*
    The `loading` block is rendered `invisible` and `inert` to reserve the
    panel's height — 498px appearing under a thumb already reaching for a
    payment button is the fault that state exists to prevent — so a control
    hidden here would be a control that appears when the answer lands. Nothing
    can be bought in this state either way.
  */
  assert.equal(giftOffered(resolveOffer(undefined, false)), true);
});

test("and while the catalogue cannot be reached at all", () => {
  // The client's frames are drawn with nothing behind them, so a visitor who
  // arrives while the API is down does not meet a hole where the checkout is.
  // No order can be placed from this state, so the toggle leads nowhere it
  // could 422.
  assert.equal(giftOffered(resolveOffer(undefined, true)), true);
});

test("a withdrawn product offers nothing, gifting included", () => {
  // It never reaches the panel — `ReadingOrder` takes the whole order off the
  // page — and the answer is pinned anyway, so a future caller that did reach
  // here cannot read "not withdrawn" out of a state that is.
  assert.equal(giftOffered(resolveOffer(null, false)), false);
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
