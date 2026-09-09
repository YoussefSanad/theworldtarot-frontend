import assert from "node:assert/strict";
import { test } from "node:test";

import { cardBack, defaultRevealCard, findCard, livingTarot } from "./cards.ts";
import { checkoutCompleteCopy } from "./checkout.ts";
import { afterSignIn, loginCopy, signInPath } from "./login.ts";
import { resetPasswordCopy, setPasswordCopy } from "./passwords.ts";

/*
  The four smaller modules, in one file. Values as of 8 September 2026, written
  longhand. Passed before any string moved into JSON and must pass unchanged
  after.
*/

test("the sign-in page keeps its copy, and its two paths stay paths", () => {
  assert.equal(loginCopy.title, "Sign in");
  assert.equal(loginCopy.intro, "For the account your readings are kept with.");
  assert.equal(loginCopy.busyLabel, "Signing in…");
  assert.equal(loginCopy.forgotPrompt, "Forgotten your password?");
  assert.equal(loginCopy.forgot.heading, "Ask for a link");
  assert.equal(loginCopy.forgot.backPrompt, "Back to sign in");
  assert.equal(afterSignIn, "/readings/");
  assert.equal(signInPath, "/login/");
});

/*
  `{wait}` is substituted with a duration by the form. It was already the
  convention in this file before the catalogue existed, which is why the rest
  of the catalogue uses it too.
*/
test("the rate-limit sentences keep their placeholder", () => {
  assert.equal(loginCopy.rateLimited, "That is a few too many tries. Try again in {wait}.");
  assert.equal(loginCopy.forgot.rateLimited, "That is a few too many asks. Try again in {wait}.");
  assert.ok(loginCopy.rateLimitedBriefly.includes("Wait a moment"));
});

/*
  Two pages, one shape, and the wording differs deliberately: setting a first
  password is not resetting one, and `linkFailure` says a different true thing
  on each.
*/
test("the two password pages stay distinct", () => {
  assert.equal(setPasswordCopy.title, "Set your password");
  assert.equal(resetPasswordCopy.title, "Choose a new password");
  assert.equal(setPasswordCopy.submitLabel, "Set my password");
  assert.equal(resetPasswordCopy.submitLabel, "Change my password");
  assert.ok(setPasswordCopy.linkFailure.includes("If you have already set a password"));
  assert.ok(resetPasswordCopy.linkFailure.includes("Reset links last an hour"));
  assert.equal(setPasswordCopy.rateLimited, resetPasswordCopy.rateLimited);
});

test("all four payment outcomes keep their heading and their amount label", () => {
  assert.deepEqual(
    Object.entries(checkoutCompleteCopy.outcomes).map(([key, o]) => [key, o.heading, o.amountLabel]),
    [
      ["received", "Your reading is on its way", "Payment received:"],
      ["pending", "Your payment is going through", "Being paid"],
      ["unpaid", "No payment was taken", "Still to pay"],
      ["unfinished", "Your payment is not finished", "To pay"],
    ],
  );
});

/*
  Two of these sentences take a value. The other two take none and must keep
  ignoring their argument — a body that started interpolating would put a
  product name into a sentence about a payment that never happened.
*/
test("the interpolated confirmation sentences put their values in", () => {
  const received = checkoutCompleteCopy.outcomes.received.body("Month Ahead Reading");
  assert.ok(received.includes("Your Month Ahead Reading has been received"), received);
  assert.ok(!received.includes("{"), "a placeholder survived");

  const gift = checkoutCompleteCopy.giftReceived.body("friend@example.com");
  assert.ok(gift.includes("sent your gift to friend@example.com,"), gift);
  assert.ok(!gift.includes("{"), "a placeholder survived");

  assert.ok(checkoutCompleteCopy.outcomes.pending.body().startsWith("Your bank has it"));
  assert.ok(checkoutCompleteCopy.outcomes.unpaid.body().startsWith("Nothing has been charged."));
});

test("the confirmation's other screens and its stand-in nouns survive", () => {
  assert.equal(checkoutCompleteCopy.pageTitle, "Your payment");
  assert.equal(checkoutCompleteCopy.checkingHeading, "Checking your payment");
  assert.equal(checkoutCompleteCopy.unknownHeading, "We cannot show you this payment");
  assert.equal(checkoutCompleteCopy.errorHeading, "We could not check your payment");
  assert.equal(checkoutCompleteCopy.unnamedReading, "reading");
  assert.equal(checkoutCompleteCopy.unnamedRecipient, "the address you gave");
  assert.equal(checkoutCompleteCopy.backLabel, "BACK TO READINGS");
  assert.equal(checkoutCompleteCopy.backHref, "/readings/");
});

/*
  A card's `number` is a Roman numeral and is the same in every language, so it
  never leaves the .ts. Only `name` is copy.
*/
test("the one wired card keeps its name, its numeral and its film", () => {
  assert.equal(livingTarot.length, 1);
  assert.equal(livingTarot[0].id, "17-the-star");
  assert.equal(livingTarot[0].number, "XVII");
  assert.equal(livingTarot[0].name, "The Star");
  assert.ok(livingTarot[0].video?.length);
  assert.ok(livingTarot[0].image.src.length > 0);
  assert.equal(defaultRevealCard, livingTarot[0]);
  assert.equal(findCard("17-the-star"), livingTarot[0]);
  assert.equal(findCard("nope"), undefined);
  assert.ok(cardBack.video.length > 0);
});
