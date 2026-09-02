import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  forgetPayment,
  paymentInFlight,
  paymentInFlightOnServer,
  paymentSettled,
  paymentStarted,
  subscribeToPayment,
} from "./payment-in-flight.ts";

beforeEach(() => {
  forgetPayment();
});

test("nothing is in flight until something is bought", () => {
  assert.equal(paymentInFlight(), false);
});

test("a write that has started is in flight, which is what the currency rows read", () => {
  paymentStarted();

  assert.equal(paymentInFlight(), true);
});

test("a refused write settles, and the control is live again", () => {
  paymentStarted();
  paymentSettled();

  assert.equal(paymentInFlight(), false);
});

test("a start notifies subscribers, because the header is not the payment panel's descendant", () => {
  let told = 0;
  const unsubscribe = subscribeToPayment(() => (told += 1));

  paymentStarted();
  paymentSettled();

  unsubscribe();
  assert.equal(told, 2);
});

test("a settle that changes nothing tells nobody, so a failure arm cannot re-render the header twice", () => {
  // `handleConfirm` has three failure channels and `startWalletPayment` throws
  // into one of them, so a settle arriving on top of a settle is the ordinary
  // case rather than a strange one.
  paymentStarted();
  paymentSettled();

  let told = 0;
  const unsubscribe = subscribeToPayment(() => (told += 1));

  paymentSettled();

  unsubscribe();
  assert.equal(told, 0);
});

test("the server snapshot is false, because the export is built with nobody buying anything", () => {
  // Hydration has to start where the markup it is adopting was built, or the
  // first client paint disagrees with it. `currencySelectionOnServer` exists
  // for the same reason.
  paymentStarted();

  assert.equal(paymentInFlightOnServer(), false);
});

test("an unsubscribed listener stops hearing", () => {
  let told = 0;
  subscribeToPayment(() => (told += 1))();

  paymentStarted();

  assert.equal(told, 0);
});
