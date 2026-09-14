import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CARD_PATH_PATTERN,
  cardPath,
  findMajorArcanaByPath,
  majorArcana,
  suitPath,
  suits,
} from "./library.ts";

test("every card's path follows the issue's SEO pattern", () => {
  for (const card of majorArcana) {
    assert.match(cardPath(card), CARD_PATH_PATTERN, `${card.name} has a malformed path`);
  }
});

test("slugs are lowercase, hyphenated, and free of special characters", () => {
  for (const card of majorArcana) {
    assert.match(card.slug, /^[a-z]+(?:-[a-z]+)*$/, `${card.name} has a malformed slug`);
  }
});

test("every card round-trips from its own path", () => {
  for (const card of majorArcana) {
    const segment = cardPath(card).slice("/library/".length, -1);

    assert.equal(findMajorArcanaByPath(segment), card);
  }
});

test("the twenty-two paths are distinct", () => {
  assert.equal(new Set(majorArcana.map(cardPath)).size, majorArcana.length);
});

test("a bare slug is not a card page", () => {
  assert.equal(findMajorArcanaByPath("the-fool"), undefined);
});

test("an unknown card is not found", () => {
  assert.equal(findMajorArcanaByPath("the-nonesuch-tarot-card-meaning"), undefined);
});

test("a suit's path follows the equivalent suit pattern", () => {
  assert.equal(suitPath(suits[0]), "/library/swords-tarot-suit-meaning/");
});
