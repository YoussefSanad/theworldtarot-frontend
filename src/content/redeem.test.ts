import assert from "node:assert/strict";
import { test } from "node:test";

import { redeemCopy } from "./redeem.ts";

/*
  Values as of 8 September 2026, written longhand. Passed before any string
  moved into JSON and must pass unchanged after.
*/

test("the entry screen keeps its copy", () => {
  assert.equal(redeemCopy.pageTitle, "Redeem a Gift");
  assert.equal(redeemCopy.entry.heading, "Redeem a Gift");
  assert.deepEqual(redeemCopy.entry.body, [
    "Someone has given you a reading.",
    "Enter the code from your email to open it.",
  ]);
  assert.equal(redeemCopy.entry.submit, "FIND MY GIFT");
  assert.equal(redeemCopy.entry.forgiving, "Capitals and spacing do not matter.");
});

/*
  Three failures a visitor holding a paid, non-expiring code can hit. Each says
  something different about whether the code is still good, and `unreachable`
  in particular must keep saying that a failure to check is not a verdict.
*/
test("the three lookup failures keep saying different things", () => {
  assert.equal(
    redeemCopy.unknown,
    "We could not find a gift for that code. Check it against the one in your email and try again.",
  );
  assert.equal(
    redeemCopy.unreachable,
    "We could not check that code just now, which says nothing about whether it is good. Please try again in a moment.",
  );
  assert.equal(
    redeemCopy.throttled,
    "That is a lot of tries in a short time. Please wait a minute and try again.",
  );
});

test("the ask screen keeps every field label and its failure", () => {
  assert.equal(redeemCopy.ask.heading, "Ask Your Question");
  assert.equal(redeemCopy.ask.question.label, "Your question");
  assert.equal(redeemCopy.ask.email.label, "Where to send your reading");
  assert.equal(redeemCopy.ask.name.label, "Your name (optional)");
  assert.equal(redeemCopy.ask.submit, "GET MY READING");
  assert.equal(
    redeemCopy.ask.failed,
    "We could not ask for your reading, and your code has not been used. Please try again.",
  );
});

/*
  Two sentences are built around values, so they are the one shape in the
  catalogue that is not a finished string. What is pinned here is that the
  values land in them — a placeholder left unsubstituted would show a visitor a
  brace.
*/
test("the two interpolated sentences put their values in", () => {
  const spent = redeemCopy.spent.body("3 September");
  assert.ok(spent.includes("opened on 3 September,"), spent);
  assert.ok(!spent.includes("{"), "a placeholder survived into the rendered sentence");

  const asked = redeemCopy.asked.body("Month Ahead Reading", "reader@example.com");
  assert.ok(asked.includes("Your Month Ahead Reading is being written"), asked);
  assert.ok(asked.includes("sent to reader@example.com."), asked);
  assert.ok(!asked.includes("{"), "a placeholder survived into the rendered sentence");
});

test("the spent, asked and lost screens keep their headings and their way back", () => {
  assert.equal(redeemCopy.spent.heading, "Already Redeemed");
  assert.equal(redeemCopy.spent.cta, "GET ANOTHER READING");
  assert.equal(redeemCopy.spent.invitation, "The cards are always ready for another question.");
  assert.equal(redeemCopy.asked.heading, "Your Reading Is On Its Way");
  assert.equal(redeemCopy.asked.asking, "You asked");
  assert.equal(redeemCopy.lost.heading, "We Cannot Show You This Redemption");
  assert.equal(redeemCopy.backLabel, "BACK TO READINGS");
  assert.equal(redeemCopy.backHref, "/readings/");
});
