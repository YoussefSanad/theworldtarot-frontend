import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import type { ApiProduct } from "./api.ts";
import type { Product } from "../content/home.ts";
import { resolveProducts } from "./products.ts";

/**
 * The tiles as `content/home.ts` writes them, minus the artwork.
 *
 * Written here rather than imported, for the reason `reading-prices.test.ts`
 * takes its bundled string as an argument: the real list reaches for
 * `@/lib/assets` through a path alias `node --test` cannot resolve, and a test
 * asserting against live marketing copy would break the day somebody edits a
 * subtitle.
 */
function tile(key: string, title: string, subtitle: string, price: string): Product {
  return { key, title, subtitle, price, action: "BEGIN", href: `/readings/${key}/`, image: {} as Product["image"] };
}

const bundled = [
  tile("one-card", "1 CARD READING", "A Single Message from the Tarot", "$12"),
  tile("month-ahead", "MONTH AHEAD", "What's in Store?", "$75"),
];

function priced(key: string, currency: string, amount: number, name = key.toUpperCase()): ApiProduct {
  return {
    key,
    type: "reading",
    name,
    short_description: "Live copy.",
    allows_question: true,
    price: { currency, amount },
  };
}

const realWarn = console.warn;

beforeEach(() => {
  // A withdrawn tile warns on purpose, and the suite should not be noisy about
  // the cases that are asserting exactly that.
  console.warn = () => {};
});

after(() => {
  console.warn = realWarn;
});

test("before an answer the bundled tiles stand, which is what the export ships", () => {
  assert.deepEqual(resolveProducts(null, bundled), bundled);
});

test("an empty catalogue is a fault rather than a shop with nothing in it", () => {
  // A successful response, and still not honoured literally: the backend seeds
  // every product complete and priced, so every tile withdrawn at once is not
  // something anybody does on purpose. `reading-prices.test.ts` reads the same
  // rule from the other side.
  assert.deepEqual(resolveProducts([], bundled), bundled);
});

test("live copy replaces the bundled copy, which is what the API owns", () => {
  const [tile] = resolveProducts([priced("one-card", "USD", 1200, "ONE CARD, LIVE")], bundled);

  assert.equal(tile?.title, "ONE CARD, LIVE");
  assert.equal(tile?.subtitle, "Live copy.");
});

test("the price is formatted from the answer's Money, which is what makes a currency switch move it", () => {
  // Fact 3 of the plan's "What proves it", at the seam it is decided.
  const [tile] = resolveProducts([priced("one-card", "GBP", 1000)], bundled);

  assert.equal(tile?.price, "£10");
});

test("the same tile in a second currency prices in that one", () => {
  const [tile] = resolveProducts([priced("one-card", "EUR", 1150)], bundled);

  assert.equal(tile?.price, "€11.50");
});

test("what the bundle owns survives the merge, because artwork and links only exist there", () => {
  const [tile] = resolveProducts([priced("one-card", "USD", 1200)], bundled);

  assert.equal(tile?.href, "/readings/one-card/");
  assert.equal(tile?.action, "BEGIN");
});

test("a tile the catalogue answered without is withdrawn rather than shown at a stale price", () => {
  const showing = resolveProducts([priced("one-card", "USD", 1200)], bundled);

  assert.deepEqual(
    showing.map((tile) => tile.key),
    ["one-card"],
  );
});

test("a withdrawn tile says so in the console, since three tiles where there were four is otherwise silent", () => {
  let warned = "";
  console.warn = (message: string) => (warned = message);

  resolveProducts([priced("one-card", "USD", 1200)], bundled);

  assert.match(warned, /month-ahead/);
});

test("a live product with no tile is ignored, because a tile cannot be rendered without artwork", () => {
  // `in-depth` is on the endpoint and not on the homepage today.
  const showing = resolveProducts([priced("one-card", "USD", 1200), priced("in-depth", "USD", 12000)], bundled);

  assert.deepEqual(
    showing.map((tile) => tile.key),
    ["one-card"],
  );
});

test("empty live copy falls back to the bundled subtitle rather than leaving a blank line", () => {
  const answer = { ...priced("one-card", "USD", 1200), short_description: "   " };
  const [tile] = resolveProducts([answer], bundled);

  assert.equal(tile?.subtitle, "A Single Message from the Tarot");
});

test("the order is the bundle's, so a hand-tuned grid cannot be rearranged from the admin panel", () => {
  const answer = [priced("month-ahead", "USD", 7500), priced("one-card", "USD", 1200)];

  assert.deepEqual(
    resolveProducts(answer, bundled).map((tile) => tile.key),
    ["one-card", "month-ahead"],
  );
});
