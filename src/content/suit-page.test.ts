import assert from "node:assert/strict";
import { test } from "node:test";

import { findSuit, suitDescription, suitMeta, suits, type Suit } from "./library.ts";

test("an unknown suit is not found", () => {
  assert.equal(findSuit("hearts"), undefined);
});

test("an unknown suit's metadata throws rather than rendering empty", () => {
  assert.throws(() => suitMeta("hearts"), /Unknown suit/);
});

test("every suit's metadata prefers her own description", () => {
  for (const suit of suits) {
    const { description } = suitMeta(suit.slug);

    assert.equal(
      description,
      suit.content?.metaDescription,
      `${suit.title} has a generated description`,
    );
  }
});

test("every suit's metadata title is its heading name", () => {
  for (const suit of suits) {
    assert.equal(suitMeta(suit.slug).title, suit.title);
  }
});

test("a suit with no content falls back to the generated description", () => {
  /*
    The holding-page arm. Unreachable while all four carry copy, which is why it
    is asserted on a constructed suit rather than a real one — the branch exists
    so a suit whose words are pulled still answers with a description instead of
    `undefined`, which would ship a page with no meta description at all.

    Typed as `Suit` so the optional `content` is a real absence rather than an
    excess property on an inferred literal.
  */
  const orphan: Suit = {
    slug: "hearts",
    label: "HEARTS",
    title: "Hearts",
    href: "/library/hearts-tarot-suit-meaning/",
  };

  assert.equal(orphan.content, undefined);
  assert.equal(
    suitDescription(orphan),
    "The suit of Hearts in the Minor Arcana of The World Tarot.",
  );
});

test("a suit with content is described in her own words", () => {
  for (const suit of suits) {
    assert.equal(suitDescription(suit), suit.content?.metaDescription, `${suit.title} is generated`);
  }
});
