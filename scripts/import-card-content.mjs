/**
 * Turns the client's `LIBRARY CARDS CONTENT 1.xls` into TypeScript.
 *
 * **Its output is the source and is committed**; this script is not part of the
 * build. These pages are statically exported to be indexed, so their copy
 * belongs at build time — the reasoning `card-content.ts`'s own header gives.
 *
 * **Her copy is transcribed verbatim.** The rule `library.ts` keeps for card
 * names — fix outright misspellings — is deliberately NOT applied here at the
 * client's instruction, so `SOVREIGNTY` and `fufillment` ship as she wrote
 * them. The Fool's own `the unkown` correction predates that instruction and
 * stays, which makes his the only non-verbatim page.
 *
 * Her sheet is column-per-card: numerals across, field labels down.
 *
 * **This script was run against her sheet while the plan was written**, so the
 * shape below is verified rather than assumed: twenty-one objects, eighty-four
 * `appears` columns, all twenty-nine symbols referenced, no `.png` left in a
 * value, no stray separators.
 *
 *   node scripts/import-card-content.mjs
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHEET = resolve(root, "..", "asset dump", "LIBRARY CARDS CONTENT 1.xls");

/** Her row numbers, zero-indexed, as measured. */
const ROWS = {
  name: 3,
  keywords: 9,
  subtitle: 10,
  essay: 11,
  appears: [
    [15, 16],
    [17, 18],
    [19, 20],
    [21, 22],
  ],
  lookFor: 26,
  love: 30,
  career: 31,
  money: 32,
  shadowBullets: 35,
  shadowClosing: 36,
  element: 39,
  planet: 40,
  sign: 41,
  keyword: 42,
  yesNo: 43,
  yesNoText: 44,
  quote: 47,
};

/** Her column order, mapped to the slugs `library.ts` uses. */
const SLUGS = [
  "the-magician", "the-high-priestess", "the-empress", "the-emperor",
  "the-high-priest", "the-lovers", "the-chariot", "strength", "the-hermit",
  "the-wheel", "justice", "the-hangman", "death", "temperance", "the-devil",
  "the-tower", "the-star", "the-moon", "the-sun", "judgement", "the-world",
];

const PY = `
import json, xlrd
b = xlrd.open_workbook(r"${SHEET}")
sh = b.sheets()[0]
print(json.dumps([[str(sh.cell_value(r, c)) for c in range(sh.ncols)] for r in range(sh.nrows)]))
`;

const grid = JSON.parse(execFileSync("python", ["-c", PY], { encoding: "utf8", maxBuffer: 8 << 20 }));

const cell = (row, col) => (grid[row]?.[col] ?? "").trim();

/**
 * Her line breaks, of which there are two kinds.
 *
 * **Eighteen of the twenty-one essays break paragraphs with U+2028**, the
 * Unicode line separator, rather than a newline — an artefact of the sheet
 * coming out of Numbers. Splitting on a newline alone collapses those essays
 * into a single paragraph, which is the failure this function exists to
 * prevent. Both characters are invisible in an editor.
 */
const lines = (value) =>
  value
    .split(/[\n\u2028]/)
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Her separator, normalized.
 *
 * **She uses two characters for the same dot**: U+2022 (bullet) and U+00B7
 * (middle dot), mixed within the summary, look-for and shadow rows — 57 middle
 * dots against bullets elsewhere. Side by side they are visibly different
 * weights, so they are unified on the bullet The Fool's page already draws.
 *
 * **This is normalization, not a copy correction.** Her words are untouched;
 * only a glyph she typed inconsistently is made consistent, the same class of
 * judgement as trimming trailing whitespace.
 */
const bullets = (value) => value.replace(/\u00b7/g, "\u2022");

/**
 * A single-line field, with her wrapping removed.
 *
 * **Some cells are wrapped with a real newline** rather than flowing — the
 * three sphere paragraphs and The Hermit's money text among them. They are one
 * paragraph, not two, so the break is layout in her spreadsheet rather than
 * content: kept, it survives into the string and HTML collapses it into a
 * second space mid-sentence.
 *
 * `lines()` handles the fields that genuinely are multi-part. This is for the
 * ones that are not.
 */
const flow = (value) => value.replace(/[\s\u2028]+/g, " ").trim();

const quote = (value) => JSON.stringify(value);

const camel = (slug) => slug.replace(/-(.)/g, (_, ch) => ch.toUpperCase());

/**
 * The card names the site uses, keyed by slug.
 *
 * **Not her NAME row, and that is the point.** Her row 3 reads `HERMIT` and
 * `JUDGMENT`, where `library.ts` calls them "The Hermit" and "Judgement" — the
 * one place the verbatim rule does not reach, because a name is the card's
 * identity rather than its copy. Deriving the description from her row put a
 * different spelling in the description than in the page's own title.
 *
 * These are `library.ts`'s names, copied rather than imported because this
 * script runs outside the app's module graph.
 */
const CARD_NAMES = {
  "the-magician": "The Magician",
  "the-high-priestess": "The High Priestess",
  "the-empress": "The Empress",
  "the-emperor": "The Emperor",
  "the-high-priest": "The High Priest",
  "the-lovers": "The Lovers",
  "the-chariot": "The Chariot",
  strength: "Strength",
  "the-hermit": "The Hermit",
  "the-wheel": "The Wheel",
  justice: "Justice",
  "the-hangman": "The Hangman",
  death: "Death",
  temperance: "Temperance",
  "the-devil": "The Devil",
  "the-tower": "The Tower",
  "the-star": "The Star",
  "the-moon": "The Moon",
  "the-sun": "The Sun",
  judgement: "Judgement",
  "the-world": "The World",
};

/**
 * The page's own meta description.
 *
 * **Her keywords plus the first sentence of her essay**, which is the shape The
 * Fool's already has. Built rather than transcribed because her sheet has no
 * column for it — its PAGE TITLE row duplicates what `cardMeta()` already
 * derives from `card.name`, and its ALT TEXT row is the image's, not the page's.
 *
 * Runs 150..170 characters across the twenty-one, inside what a search result
 * shows.
 */
const metaDescription = (col) => {
  const opening = lines(cell(ROWS.essay, col))[0];
  const sentence = opening.split(/(?<=[.!?])\s/)[0];
  const keywords = bullets(cell(ROWS.keywords, col)).toLowerCase();

  return `${CARD_NAMES[SLUGS[col - 1]]} tarot card meaning in The World Tarot: ${keywords}. ${sentence}`;
};

const objects = SLUGS.map((slug, index) => {
  const col = index + 1;
  const appears = ROWS.appears.map(([labelRow, bodyRow], n) => {
    const icon = `cardReference.appearsIcon${n + 1}`;
    return `    {\n      icon: ${icon},\n      label: ${quote(flow(cell(labelRow, col)))},\n      body: ${quote(flow(cell(bodyRow, col)))},\n    },`;
  });

  const shadow = [...lines(bullets(cell(ROWS.shadowBullets, col))), flow(cell(ROWS.shadowClosing, col))];
  /** Her meta rows name a file (`moon.png`); the page shows the stem. */
  const stem = (row) => cell(row, col).replace(/\.png$/i, "");
  const symbol = (row) => `cardSymbols.${stem(row).toLowerCase()}`;

  return `export const ${camel(slug)}: MajorArcanaContent = {
  keywords: ${quote(bullets(cell(ROWS.keywords, col)))},
  subtitle: ${quote(flow(cell(ROWS.subtitle, col)))},
  essay: [
${lines(cell(ROWS.essay, col)).map((p) => `    ${quote(p)},`).join("\n")}
  ],
  appears: [
${appears.join("\n")}
  ],
  lookFor: [
${lines(bullets(cell(ROWS.lookFor, col))).map((l) => `    ${quote(l)},`).join("\n")}
  ],
  spheres: {
    love: ${quote(flow(cell(ROWS.love, col)))},
    career: ${quote(flow(cell(ROWS.career, col)))},
    money: ${quote(flow(cell(ROWS.money, col)))},
  },
  shadow: [
${shadow.map((l) => `    ${quote(l)},`).join("\n")}
  ],
  meta: {
    element: { symbol: ${symbol(ROWS.element)}, value: ${quote(stem(ROWS.element))} },
    planet: { symbol: ${symbol(ROWS.planet)}, value: ${quote(stem(ROWS.planet).toUpperCase())} },
    sign: { symbol: ${symbol(ROWS.sign)}, value: ${quote(stem(ROWS.sign).toUpperCase())} },
    keyword: { symbol: cardReference.symbolKey, value: ${quote(cell(ROWS.keyword, col))} },
    yesNo: { symbol: ${symbol(ROWS.yesNo)}, value: ${quote(cell(ROWS.yesNoText, col))} },
  },
  closing: [${quote(flow(cell(ROWS.quote, col)))}],
  metaDescription: ${quote(metaDescription(col))},
};`;
});

writeFileSync(join(root, "src", "content", "card-content.generated.ts"), objects.join("\n\n") + "\n");
console.log(`Wrote ${objects.length} content objects to src/content/card-content.generated.ts`);
