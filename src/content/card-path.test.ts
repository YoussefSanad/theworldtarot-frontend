import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CARD_PATH_PATTERN,
  SUIT_PATH_PATTERN,
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
  assert.equal(findMajorArcanaByPath("the-nonesuch-tarot-meaning"), undefined);
});

test("card paths use the client's -tarot-meaning suffix", () => {
  assert.equal(cardPath(majorArcana[0]), "/library/the-fool-tarot-meaning/");
});

test("a suit's path follows the equivalent suit pattern", () => {
  assert.equal(suitPath(suits[0]), "/library/swords-tarot-suit-meaning/");
});

test("every suit's path follows the issue's SEO pattern", () => {
  for (const suit of suits) {
    assert.match(suitPath(suit), SUIT_PATH_PATTERN, `${suit.title} has a malformed path`);
  }
});

test("a suit's href is its SEO path", () => {
  for (const suit of suits) {
    assert.equal(suit.href, suitPath(suit), `${suit.title} still links at its old URL`);
  }
});

test("suit slugs are lowercase, hyphenated, and free of special characters", () => {
  for (const suit of suits) {
    assert.match(suit.slug, /^[a-z]+(?:-[a-z]+)*$/, `${suit.title} has a malformed slug`);
  }
});

test("the four suit paths are distinct", () => {
  assert.equal(new Set(suits.map(suitPath)).size, suits.length);
});

test("suit paths use the client's -tarot-suit-meaning suffix", () => {
  for (const suit of suits) {
    assert.ok(suitPath(suit).endsWith("-tarot-suit-meaning/"), `${suit.title} has the wrong suffix`);
  }
});

test("a suit path is not a card path", () => {
  /*
    Both live under `/library/`, and `[card]` would answer a suit URL if the
    static segment did not win. `findMajorArcanaByPath` must not resolve one.
  */
  for (const suit of suits) {
    const segment = suitPath(suit).slice("/library/".length, -1);

    assert.equal(findMajorArcanaByPath(segment), undefined, `${suit.title} resolves as a card`);
  }
});

test("every suit's route directory exists at its SEO path", async () => {
  /*
    The route *is* the directory name under `app/(site)/library/`, so this
    checks the rename actually happened rather than trusting the href. A suit
    whose href moved but whose folder did not would 404 — and `dynamicParams =
    false` on `[card]` means it 404s silently rather than falling through.
  */
  const { access } = await import("node:fs/promises");
  const { join } = await import("node:path");

  for (const suit of suits) {
    const segment = suitPath(suit).slice("/library/".length, -1);
    const dir = join(process.cwd(), "src", "app", "(site)", "library", segment);

    await assert.doesNotReject(access(dir), `${suit.title} has no route directory at ${segment}`);
  }
});

test("no suit answers at its old bare path", async () => {
  const { access } = await import("node:fs/promises");
  const { join } = await import("node:path");

  for (const suit of suits) {
    const dir = join(process.cwd(), "src", "app", "(site)", "library", suit.slug);

    await assert.rejects(access(dir), `${suit.title} still has a directory at /library/${suit.slug}/`);
  }
});
