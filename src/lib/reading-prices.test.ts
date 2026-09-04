import assert from "node:assert/strict";
import { test } from "node:test";

import type { ApiProduct } from "./api.ts";
import { resolveReadingName, resolveReadingPrice } from "./reading-prices.ts";

function priced(key: string, currency: string, amount: number): ApiProduct {
  return {
    key,
    type: "reading",
    name: key.toUpperCase(),
    short_description: "",
    allows_question: true,
    is_giftable: true,
    price: { currency, amount },
  };
}

const live = [priced("one-card", "GBP", 1000), priced("in-depth", "GBP", 10200)];

test("before an answer, the bundled string stands, which is what the export ships", () => {
  assert.equal(resolveReadingPrice(null, "in-depth", "$120"), "$120");
});

test("a live price replaces it, formatted in whatever the request resolved to", () => {
  assert.equal(resolveReadingPrice(live, "in-depth", "$120"), "£102");
});

test("the signature panel prices off its own key like every other card", () => {
  assert.equal(resolveReadingPrice(live, "one-card", "$12"), "£10");
});

test("a key the catalogue answered without keeps the bundled string", () => {
  // Unlike the homepage, where a withdrawn product removes its tile. Here the
  // card stays and the reading page it links to is what takes the offer down —
  // that page asks for the key itself and already answers `withdrawn`.
  assert.equal(resolveReadingPrice(live, "month-ahead", "$75"), "$75");
});

test("an empty catalogue is a fault rather than a shop with nothing in it", () => {
  assert.equal(resolveReadingPrice([], "in-depth", "$120"), "$120");
});

test("a price that is not a whole unit keeps its decimals", () => {
  assert.equal(resolveReadingPrice([priced("in-depth", "USD", 12050)], "in-depth", "$120"), "$120.50");
});

test("before an answer, the bundled name stands", () => {
  assert.equal(resolveReadingName(null, "in-depth", "In-Depth"), "In-Depth");
});

test("a live name replaces it", () => {
  assert.equal(resolveReadingName(live, "in-depth", "In-Depth"), "IN-DEPTH");
});

test("a key the catalogue answered without keeps the bundled name", () => {
  assert.equal(resolveReadingName(live, "month-ahead", "Month Ahead"), "Month Ahead");
});

test("an empty catalogue keeps the bundled name, same fault as the price", () => {
  assert.equal(resolveReadingName([], "in-depth", "In-Depth"), "In-Depth");
});
