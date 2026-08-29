import assert from "node:assert/strict";
import { test } from "node:test";

import { offers } from "./payment-methods.ts";

test("a method this environment lists is offered", () => {
  assert.equal(offers(["stripe", "stripe_wallet"], "stripe_wallet"), true);
  assert.equal(offers(["stripe", "stripe_wallet"], "stripe"), true);
});

test("an environment that configured no Stripe offers neither", () => {
  // Locally that is hand settlement alone: nobody has the keys on a laptop, and
  // an offered method with no credentials is a button that fails at the worst
  // moment. `manual` is offered to a person in an admin panel and drawn on no
  // page, so the endpoint does not list it either.
  assert.equal(offers([], "stripe_wallet"), false);
  assert.equal(offers(["gift_code"], "stripe_wallet"), false);
});

test("a name this build cannot draw a button for is not a method it offers", () => {
  // The list is the backend's and it grows. Nothing here casts a string into a
  // name this build knows — the question is only ever whether the one wanted is
  // present.
  assert.equal(offers(["stripe_wallet_v2"], "stripe_wallet"), false);
});
