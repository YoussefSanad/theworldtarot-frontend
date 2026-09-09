import assert from "node:assert/strict";
import { test } from "node:test";

import {
  artist,
  closingCta,
  featuredTestimonial,
  hero,
  included,
  journey,
  placeStatement,
  products,
  valueProps,
  worldTarot,
} from "./home.ts";

/*
  The extraction's only claim is that nothing changed. Values as of 8 September
  2026, written longhand rather than derived — a test that computes its
  expectation from the thing under test proves nothing.

  This passed before any string moved into JSON and must pass unchanged after.
*/

test("the hero keeps both lengths of its body, which are different sentences", () => {
  assert.equal(hero.titleTop, "Enter");
  assert.equal(hero.titleMain, "The Living Tarot");
  assert.equal(hero.tagline, "cinematic tarot, brought to life");
  assert.equal(
    hero.body,
    "Discover a cinematic interpretation of the Major Arcana. Reveal a card and experience The Living Tarot one story at a time.",
  );
  assert.equal(
    hero.bodyMobile,
    "Discover a cinematic interpretation of the Major Arcana. Experience a card's story.",
  );
  assert.equal(hero.returnPrompt, "Return another day to discover a new card.");
  assert.equal(hero.closing.lead, "ancient wisdom•timeless stories•endless discovery.");
  assert.equal(hero.closing.question, "Where will The World Tarot take you?");
});

/*
  Each label is two rendered lines and each has a shorter phone variant. Four
  arrays, and the pairing between a label and its own `labelMobile` is the part
  that would break silently if the extraction indexed anything wrongly.
*/
test("both hero buttons keep their two lines, their mobile variants and their hrefs", () => {
  assert.deepEqual(hero.secondaryActions[0].label, ["explore the", "complete collection"]);
  assert.deepEqual(hero.secondaryActions[0].labelMobile, ["explore the", "collection"]);
  assert.equal(hero.secondaryActions[0].href, "/living-tarot");
  assert.ok(hero.secondaryActions[0].icon.src.endsWith(".webp"));

  assert.deepEqual(hero.secondaryActions[1].label, ["ASK A QUESTION", "GET A PERSONAL READING"]);
  assert.deepEqual(hero.secondaryActions[1].labelMobile, ["GET A PERSONAL", "READING"]);
  assert.equal(hero.secondaryActions[1].href, "/readings");
});

/* Split around an inline badge, so the trailing and leading spaces are load-bearing. */
test("the World Tarot paragraph keeps the spaces its inline badge sits between", () => {
  assert.ok(worldTarot.body.before.endsWith("she is creating "));
  assert.ok(worldTarot.body.after.startsWith(" — a cinematic deck"));
});

test("the four tiles keep their copy, their keys and their artwork", () => {
  assert.deepEqual(
    products.map((p) => [p.key, p.title, p.subtitle, p.action]),
    [
      ["one-card", "1 CARD READING", "A Single Message from the Tarot", "BEGIN READING"],
      ["three-card", "3 CARD READING", "One Question, Three Cards", "BEGIN READING"],
      ["month-ahead", "MONTH AHEAD", "What’s in Store? 5 Card Forecast", "BEGIN READING"],
      ["viewing-room-pass", "VIEWING ROOM", "Complete Cinematic Collection", "ENTER"],
    ],
  );

  for (const product of products) {
    assert.ok(product.href.startsWith("/"), `${product.href} is not a path`);
    assert.ok(product.image.width > 0 && product.image.height > 0, `${product.key} lost its artwork`);
  }
});

test("the sections that render as pre-split lines keep their line counts", () => {
  assert.equal(journey.subheading.length, 2);
  assert.equal(placeStatement.length, 2);
  assert.equal(included.columns.length, 2);
  assert.equal(included.columns[0].length, 3);
  assert.equal(included.columns[1].length, 2);
  assert.equal(artist.body.length, 2);
  assert.equal(artist.quote.length, 2);
  assert.equal(closingCta.testimonial.quote.length, 2);
});

test("the smaller pieces survive the move", () => {
  assert.equal(journey.heading, "Choose Your Journey:");
  assert.equal(included.heading, "What’s Included");
  assert.equal(valueProps.length, 3);
  assert.equal(valueProps[0].title, "Led by the Cards");
  assert.equal(featuredTestimonial.attribution, "- Blake M., Big Sur, CA");
  assert.equal(closingCta.heading, "Ready to Receive Your Message?");
  assert.equal(closingCta.action.label, "GET MY READING");
  assert.equal(closingCta.action.href, "/readings");
});
