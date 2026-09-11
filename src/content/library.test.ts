import assert from "node:assert/strict";
import { test } from "node:test";

import {
  cardAlt,
  comingSoon,
  findMajorArcana,
  library,
  majorArcana,
  majorArcanaNav,
  suitMeta,
  suits,
} from "./library.ts";

/*
  The same contract as `site.test.ts`: the extraction's only claim is that
  nothing changed. These are the values as of 11 September 2026, written out
  longhand, and this passed before any string moved into JSON.
*/

test("the deck keeps its order, its numerals and the client's names", () => {
  assert.deepEqual(
    majorArcana.map((card) => [card.slug, card.numeral, card.name]),
    [
      ["the-fool", "0", "The Fool"],
      ["the-magician", "I", "The Magician"],
      ["the-high-priestess", "II", "The High Priestess"],
      ["the-empress", "III", "The Empress"],
      ["the-emperor", "IV", "The Emperor"],
      ["the-high-priest", "V", "The High Priest"],
      ["the-lovers", "VI", "The Lovers"],
      ["the-chariot", "VII", "The Chariot"],
      ["strength", "VIII", "Strength"],
      ["the-hermit", "IX", "The Hermit"],
      ["the-wheel", "X", "The Wheel"],
      ["justice", "XI", "Justice"],
      ["the-hanged-man", "XII", "The Hanged Man"],
      ["death", "XIII", "Death"],
      ["temperance", "XIV", "Temperance"],
      ["the-devil", "XV", "The Devil"],
      ["the-tower", "XVI", "The Tower"],
      ["the-star", "XVII", "The Star"],
      ["the-moon", "XVIII", "The Moon"],
      ["the-sun", "XIX", "The Sun"],
      ["judgement", "XX", "Judgement"],
      ["the-world", "XXI", "The World"],
    ],
  );
});

test("a card's alt text is the client's format", () => {
  const fool = findMajorArcana("the-fool");
  assert.ok(fool);
  assert.equal(cardAlt(fool), "The Fool tarot card from The World Tarot");
});

test("the suits keep their labels, titles and addresses, in order", () => {
  assert.deepEqual(majorArcanaNav, { label: "MAJOR ARCANA", href: "/library/" });
  assert.deepEqual(
    suits.map((suit) => [suit.slug, suit.label, suit.title, suit.href]),
    [
      ["swords", "SWORDS", "Swords", "/library/swords/"],
      ["cups", "CUPS", "Cups", "/library/cups/"],
      ["wands", "WANDS", "Wands", "/library/wands/"],
      ["pentacles", "PENTACLES", "Pentacles", "/library/pentacles/"],
    ],
  );
  assert.deepEqual(suitMeta("cups"), {
    title: "Cups",
    description: "The suit of Cups in the Minor Arcana of The World Tarot.",
  });
});

test("the masthead, the closing line and the holding pages keep their words", () => {
  assert.deepEqual(library, {
    title: "The World Tarot Library",
    tagline: "AN ARCHIVE OF THE SYMBOL AND MEANING",
    blurb: "Explore the imagery, stories, and wisdom woven through the Tarot",
    closing: "The library - worlds without end",
    metaDescription:
      "An archive of symbol and meaning. Explore the imagery, stories, and wisdom woven through the Major Arcana of The World Tarot.",
  });
  assert.deepEqual(comingSoon, {
    card: "This card's full reference is being written.",
    suit: "This suit's reference is being written.",
    back: "Return to the Library",
  });
});
