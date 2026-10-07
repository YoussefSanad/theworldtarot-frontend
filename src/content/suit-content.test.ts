import assert from "node:assert/strict";
import { test } from "node:test";

import { suits } from "./library.ts";
import { suitContent } from "./suit-content.ts";

test("every suit has content", () => {
  for (const suit of suits) {
    assert.ok(suitContent[suit.slug], `${suit.title} has no content`);
  }
});

test("content exists only for suits that exist", () => {
  const slugs = new Set(suits.map((suit) => suit.slug));

  for (const slug of Object.keys(suitContent)) {
    assert.ok(slugs.has(slug), `"${slug}" is not a suit`);
  }
});

test("every suit's essay is three paragraphs, as her frames draw", () => {
  for (const [slug, content] of Object.entries(suitContent)) {
    assert.equal(content.essay.length, 3, `${slug} does not have three paragraphs`);
  }
});

test("every suit's key themes are three lines", () => {
  for (const [slug, content] of Object.entries(suitContent)) {
    assert.equal(content.keyThemes.length, 3, `${slug} does not have three key-theme lines`);
  }
});

test("no copy carries her line-break hyphenation", () => {
  /*
    Her frames hyphenate across a line break — `fulfill-ment`, `abun-dance` —
    which is her layout engine fitting her own measure, not her spelling. This
    page wraps at its own width, so a hyphen that survived the transcription
    would appear mid-line.

    The pattern lists the stems she actually breaks rather than "a hyphen
    between two lowercase letters", because her copy has real hyphenated
    compounds — `well-being`, `clear-eyed` — that a general rule would reject.
  */
  const BROKEN = /(?:fulfill-|abun-|inten-|rela-|possi-|oppor-|enthusi-|spon-)/i;

  for (const [slug, content] of Object.entries(suitContent)) {
    const all = [
      ...content.essay,
      ...content.keyThemes,
      ...content.closing,
      ...content.unfolding.body,
      content.spheres.love,
      content.spheres.career,
      content.spheres.money,
    ];

    for (const line of all) {
      assert.doesNotMatch(line, BROKEN, `${slug} kept a line-break hyphen: "${line}"`);
    }
  }
});

test("every suit's unfolding heading names that suit", () => {
  for (const suit of suits) {
    assert.match(
      suitContent[suit.slug].unfolding.heading,
      new RegExp(suit.label, "i"),
      `${suit.title}'s unfolding heading does not name it`,
    );
  }
});
