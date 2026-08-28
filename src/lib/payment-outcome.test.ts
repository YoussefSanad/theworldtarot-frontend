import assert from "node:assert/strict";
import { test } from "node:test";

import { outcomeFor } from "./payment-outcome.ts";

test("succeeded is money received", () => {
  assert.equal(outcomeFor("succeeded"), "received");
});

test("processing is money on its way, told apart from received", () => {
  assert.equal(outcomeFor("processing"), "pending");
});

test("requires_payment_method is nothing taken", () => {
  assert.equal(outcomeFor("requires_payment_method"), "unpaid");
});

test("a cancelled intent reads as nothing taken, like a decline", () => {
  assert.equal(outcomeFor("canceled"), "unpaid");
});

for (const status of ["requires_action", "requires_confirmation", "requires_capture"]) {
  test(`${status} is unfinished rather than either claim`, () => {
    assert.equal(outcomeFor(status), "unfinished");
  });
}

test("a status this build has never heard of renders rather than throwing", () => {
  assert.equal(outcomeFor("requires_something_stripe_adds_in_2027"), "unfinished");
});
