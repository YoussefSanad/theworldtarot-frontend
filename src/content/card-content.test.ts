import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { cardPaper, cardShadows, cardSymbols } from "../lib/assets.ts";
import { majorArcana } from "./library.ts";
import { majorArcanaContent } from "./card-content.ts";

test("every card has a shadow panel asset", () => {
  for (const card of majorArcana) {
    assert.ok(cardShadows[card.slug], `${card.name} has no shadow asset`);
  }
});

test("the twenty-nine shared symbols are all present", () => {
  const expected = [
    "air", "earth", "fire", "water",
    "aquarius", "aries", "cancer", "capricorn", "gemini", "leo", "libra",
    "pisces", "sagittarius", "scorpio", "taurus", "virgo",
    "jupiter", "mars", "mercury", "moon", "neptune", "pluto", "saturn",
    "sun", "uranus", "venus",
    "yes", "no", "maybe",
  ];

  assert.equal(Object.keys(cardSymbols).length, 29);

  for (const name of expected) {
    assert.ok(cardSymbols[name], `no symbol for "${name}"`);
  }
});

test("shadow blocks are two or three lines, and never empty", () => {
  for (const [slug, content] of Object.entries(majorArcanaContent)) {
    assert.ok(content.shadow.length >= 2, `${slug} has ${content.shadow.length} shadow lines`);
    assert.ok(content.shadow.length <= 3, `${slug} has ${content.shadow.length} shadow lines`);

    for (const line of content.shadow) {
      assert.ok(line.trim().length > 0, `${slug} has an empty shadow line`);
    }
  }
});

test("every meta symbol resolves to a real asset", () => {
  const known = new Set(Object.values(cardSymbols).map((symbol) => symbol.src));

  for (const [slug, content] of Object.entries(majorArcanaContent)) {
    for (const [field, entry] of Object.entries(content.meta)) {
      assert.ok(
        entry.symbol.src.length > 0 && !entry.symbol.src.includes("undefined"),
        `${slug}.meta.${field} has an unresolved symbol`,
      );

      if (field === "keyword") continue; // the shared key glyph, not a packet symbol

      assert.ok(known.has(entry.symbol.src), `${slug}.meta.${field} points outside cardSymbols`);
    }
  }
});

test("no stray separator characters survived the import", () => {
  for (const [slug, content] of Object.entries(majorArcanaContent)) {
    const all = [
      content.keywords,
      content.subtitle,
      ...content.essay,
      ...content.lookFor,
      ...content.shadow,
      ...content.closing,
      content.spheres.love,
      content.spheres.career,
      content.spheres.money,
    ].join(" ");

    // U+2028 is her paragraph break and must have been split on, not kept.
    assert.ok(!all.includes("\u2028"), `${slug} still contains a U+2028 line separator`);
    // U+00B7 is her second bullet glyph; the import unifies it on U+2022.
    assert.ok(!all.includes("\u00b7"), `${slug} still contains a U+00B7 middle dot`);
  }
});

test("every card has the four appears columns and non-empty copy", () => {
  for (const [slug, content] of Object.entries(majorArcanaContent)) {
    assert.equal(content.appears.length, 4, `${slug} has ${content.appears.length} columns`);
    assert.ok(content.essay.length >= 3, `${slug} has ${content.essay.length} essay paragraphs`);
    assert.ok(content.keywords.trim().length > 0, `${slug} has no keywords`);
    assert.ok(content.subtitle.trim().length > 0, `${slug} has no subtitle`);
    assert.ok(content.closing.length >= 1, `${slug} has no closing line`);
  }
});

test("all twenty-two Major Arcana cards have content", () => {
  assert.equal(Object.keys(majorArcanaContent).length, 22);

  for (const card of majorArcana) {
    assert.ok(card.content, `${card.name} has no content and would render ComingSoonPage`);
  }
});

/*
  **Every asset a card page names must exist on disk.**

  The gap this closes: the build verified that each page *referenced* its own
  parchment, which a page does whether or not the file is there. The Fool's
  three slices were missing for exactly that reason — his folder is exempt from
  the packet roster, so the pipeline skipped him — and the build, the lint and
  every other test stayed green while his approved page rendered bare paper.
*/
test("every card's parchment and shadow files exist on disk", () => {
  /* The trailing slash is load-bearing: without it `./figma` resolves as a
     sibling of `public` rather than inside it, and every check passes or fails
     for the wrong reason. */
  const root = new URL("../../public/", import.meta.url);

  for (const card of majorArcana) {
    const paper = cardPaper(card.slug);

    assert.ok(existsSync(new URL(`.${paper}`, root)), `${card.name}: parchment missing — ${paper}`);

    assert.ok(
      existsSync(new URL(`.${cardShadows[card.slug].src}`, root)),
      `${card.name}: shadow missing — ${cardShadows[card.slug].src}`,
    );
  }
});

/*
  **No raw line breaks in the imported copy.**

  Her sheet wraps some cells with a real newline, and only the fields that go
  through the importer's `lines()` are split on it. The three sphere fields do
  not, so `the-hermit.money` shipped with two embedded breaks — invisible in the
  data, but HTML collapses them to whitespace and the paragraph rendered with a
  double space mid-sentence.

  **U+00A0 is deliberately not checked.** The Fool's three sphere strings carry
  non-breaking spaces on purpose, to stop the client's named orphans, and
  `card-content.ts` documents them.
*/
test("no raw line breaks survived the import", () => {
  for (const [slug, content] of Object.entries(majorArcanaContent)) {
    const fields: Record<string, string> = {
      keywords: content.keywords,
      subtitle: content.subtitle,
      metaDescription: content.metaDescription,
      "spheres.love": content.spheres.love,
      "spheres.career": content.spheres.career,
      "spheres.money": content.spheres.money,
    };

    content.essay.forEach((v, i) => (fields[`essay[${i}]`] = v));
    content.lookFor.forEach((v, i) => (fields[`lookFor[${i}]`] = v));
    content.shadow.forEach((v, i) => (fields[`shadow[${i}]`] = v));
    content.closing.forEach((v, i) => (fields[`closing[${i}]`] = v));
    content.appears.forEach((a, i) => {
      fields[`appears[${i}].label`] = a.label;
      fields[`appears[${i}].body`] = a.body;
    });

    for (const [field, value] of Object.entries(fields)) {
      assert.ok(!/[\n\r]/.test(value), `${slug}.${field} contains a raw line break`);
    }
  }
});

/*
  **The prose column must be able to shrink.**

  `CardEssay` puts the artwork and the prose in a flex row at `xl`. A flex item
  defaults to `min-width: auto`, which means it will not shrink below its own
  intrinsic content width — so the longest essay in the deck set the column's
  width and pushed it past the paper's right edge instead of wrapping inside it.
  The World's essay is 1423 characters against The Empress's 754, which is why
  it showed there first and nowhere else.

  This pins the `min-w-0` that fixes it, because the symptom only appears on the
  longest card at the widest breakpoint — exactly the combination a quick check
  after an edit would miss.
*/
test("CardEssay's prose column can shrink inside the flex row", async () => {
  const source = await readFile(new URL("../components/library/card/CardEssay.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /className="flex min-w-0 flex-col items-center text-center xl:items-stretch"/,
    "the prose column lost its min-w-0 and will overflow the paper on long essays",
  );
});

/*
  **Every card's keywords must split into three unbreakable phrases.**

  `CardEssay` renders the lead line as one `nowrap` span per phrase so it can
  wrap at the bullets and never inside a word. That relies on the bullet being
  findable: The Emperor's line ships verbatim as "authority •structure •
  leadership", with a missing space, and an earlier split on `" • "` welded his
  first two phrases into one unbreakable run.

  This pins the shape the component depends on, so a re-import or a copy change
  that breaks the separator fails here rather than on the widest breakpoint of
  one card.
*/
test("every card's keywords split into three phrases at the bullets", () => {
  for (const [slug, content] of Object.entries(majorArcanaContent)) {
    const phrases = content.keywords
      .split("\u2022")
      .map((part) => part.trim())
      .filter(Boolean);

    assert.equal(phrases.length, 3, `${slug} has ${phrases.length} keyword phrases, not three`);

    for (const phrase of phrases) {
      assert.ok(phrase.length > 0, `${slug} has an empty keyword phrase`);
    }
  }
});

/*
  **The sphere cards must reserve the painted band below their copy.**

  The picture and the text share one `.stack` cell, so the taller of the two
  sets the card's height. The copy used to end 5cqw above the card's bottom
  edge, which was fine while The Fool was the only card with text — his longest
  sphere paragraph is 143 characters. The World's is 226, and those extra lines
  landed on the watercolour: measured in a browser at 1920px, love overlapped
  the landscape by 29px and career and money by 11px each.

  `pb-[57cqw]` reserves the band instead of a hairline, so a card with long copy
  grows exactly enough to keep its words on clear paper while a card with short
  copy is untouched. Measured after the fix: twelve cards unchanged at 335px,
  ten grew, worst clearance 6px and no overlap anywhere.

  This pins the reserve, because the failure only shows on the longest cards and
  a smaller value renders 1px short.
*/
test("the sphere copy reserves the watercolour band below it", async () => {
  const source = await readFile(
    new URL("../components/library/card/SpheresCarousel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /pb-\[57cqw\]/,
    "the sphere copy lost its reserve and will sit on the watercolour",
  );

  assert.doesNotMatch(
    source,
    /className="aspect-369\/420/,
    "the sphere artwork is back on a fixed aspect and cannot grow for long copy",
  );
});
