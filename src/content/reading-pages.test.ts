import assert from "node:assert/strict";
import { test } from "node:test";

import {
  inDepth,
  monthAhead,
  questionLimit,
  readingPageChrome,
  readingPageFor,
  readingPages,
  rushDelivery,
  threeCard,
} from "./reading-pages.ts";

/*
  Values as of 8 September 2026, written longhand. Passed before any string
  moved into JSON and must pass unchanged after.
*/

test("the question and gift sections keep every label and placeholder", () => {
  const { question, gift } = readingPageChrome;

  assert.equal(question.heading, "Ask a Question");
  assert.deepEqual(question.body, ["Begin your reading by entering", "an optional question."]);
  assert.equal(question.label, "Your question");
  assert.equal(question.placeholder, "Enter your question…");

  assert.equal(gift.heading, "Recipient Details");
  assert.equal(gift.enter, "Gift a Reading");
  assert.equal(gift.leave, "A Reading for Myself");
  assert.equal(gift.signature.label, "Who the gift is from");
  assert.equal(gift.email.label, "Recipient's email address");
  assert.equal(gift.confirmation.mismatch, "These two email addresses do not match.");
  assert.equal(gift.message.label, "Personal message (optional)");
  assert.equal(gift.note, "They will choose their own question when the reading reaches them.");
});

/*
  Every one of these is shown to somebody whose money is in flight, so each is
  pinned individually rather than counted. `walletUnresolved` is the one that
  must never say nothing was charged, because it does not know.
*/
test("the checkout keeps all six of its failure sentences, unreworded", () => {
  const { checkout } = readingPageChrome;

  assert.equal(checkout.heading, "Get My Reading");
  assert.equal(checkout.anchor, "get-my-reading");
  assert.equal(checkout.card, "Pay with Card");
  assert.equal(checkout.buy, "Pay Another Way");
  assert.equal(checkout.buying, "Taking you to checkout…");
  assert.equal(
    checkout.buyFailed,
    "We could not start the checkout, and nothing has been charged. Please try again.",
  );
  assert.equal(checkout.walletFailed, "We could not take this payment. Nothing has been charged.");
  assert.equal(
    checkout.walletUnresolved,
    "We could not complete this payment. If you were charged, your receipt will arrive by email.",
  );
  assert.equal(
    checkout.walletNeedsGiftDetails,
    "Please check the gift's details before paying. Nothing has been charged.",
  );
  assert.equal(checkout.pricePending, "Fetching the price");
  assert.equal(checkout.secure, "Secure checkout powered by Stripe");
});

test("the shared sections keep their copy and their artwork", () => {
  assert.equal(readingPageChrome.hero.alt.length > 10, true);
  assert.ok(readingPageChrome.hero.video.length > 0);
  assert.equal(readingPageChrome.included.heading, "Your Reading");
  assert.equal(readingPageChrome.gate.heading, "Beyond the Gate");
  assert.equal(readingPageChrome.gate.subtitle, "Your Journey Begins Here");
  assert.ok(readingPageChrome.gate.image.width > 0);
  assert.equal(readingPageChrome.closingAction, "GET MY READING");

  assert.equal(readingPageChrome.features.length, 3);
  assert.deepEqual(
    readingPageChrome.features.map((f) => [f.title, f.body.length]),
    [
      ["Led by the Cards", 2],
      ["Composed with Intention", 2],
      ["Clarity in Motion", 2],
    ],
  );
});

test("the three readings keep their titles, prices and delivery promises", () => {
  assert.deepEqual(
    readingPages.map((p) => [p.productKey, p.title, p.price, p.delivery]),
    [
      ["three-card", "3 Card Reading", "$75", "Delivery Time: within 24 hours"],
      ["month-ahead", "Month Ahead Reading", "$75", "Delivery Time: within 24 hours"],
      ["in-depth", "In-Depth Reading", "$120", "Delivery Time: within 48 hours"],
    ],
  );
});

/*
  `included` is a list of items each pre-split into rendered lines, and the
  three-phrase entry is deliberate: splitting "Presented on original / World
  Tarot / artwork" adds a break a 375px panel needs and never moves one the
  desktop uses. Losing that nesting would wrap mid-name.
*/
test("every reading keeps its nested line structure", () => {
  for (const page of readingPages) {
    assert.equal(page.tagline.length, 2, `${page.id} tagline`);
    assert.equal(page.included.length, 5, `${page.id} included`);
    assert.equal(page.included[3].length, 3, `${page.id} house-name entry`);
    assert.equal(page.testimonial.quote.length, 2, `${page.id} quote`);
    assert.equal(page.testimonial.attribution.length, 2, `${page.id} attribution`);
    assert.equal(page.closing.length, 2, `${page.id} closing`);
  }
});

test("the lookup still finds a reading by the backend's key", () => {
  assert.equal(readingPageFor("three-card"), threeCard);
  assert.equal(readingPageFor("month-ahead"), monthAhead);
  assert.equal(readingPageFor("in-depth"), inDepth);
  assert.equal(readingPageFor("viewing-room-pass"), undefined);
});

/* Settings rather than copy: neither belongs in a translator's file. */
test("the two settings stay settings", () => {
  assert.equal(questionLimit, 500);
  assert.equal(rushDelivery.enabled, false);
  assert.equal(rushDelivery.label, "24-Hour Rush");
  assert.equal(rushDelivery.surcharge, "+$25");
});
