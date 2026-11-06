import assert from "node:assert/strict";
import { test } from "node:test";

import { organizationJsonLd, readingJsonLd } from "./structured-data.ts";
import { canonicalFor, SITE_NAME } from "./seo.ts";

const reading = {
  path: "/readings/month-ahead/",
  name: "Month Ahead Reading",
  description: "One month, five cards, a clear path ahead.",
  price: "$75",
};

test("a reading is a Product with one Offer", () => {
  const data = readingJsonLd(reading);

  assert.equal(data["@type"], "Product");
  assert.equal(data.name, "Month Ahead Reading");
  assert.equal(data.offers["@type"], "Offer");
  assert.equal(data.url, canonicalFor("/readings/month-ahead/"));
});

test("the price is the number without its glyph, and the currency is named beside it", () => {
  const { offers } = readingJsonLd(reading);

  assert.equal(offers.price, "75");
  assert.equal(offers.priceCurrency, "USD");
});

test("a price with separators survives the strip", () => {
  assert.equal(readingJsonLd({ ...reading, price: "$1,250" }).offers.price, "1250");
});

test("a price that is not a price is refused rather than emitted as nonsense", () => {
  assert.throws(() => readingJsonLd({ ...reading, price: "Free" }), /price/i);
});

test("the organisation names the site and its own home page", () => {
  const data = organizationJsonLd();

  assert.equal(data["@type"], "Organization");
  assert.equal(data.name, SITE_NAME);
  assert.equal(data.url, canonicalFor("/"));
});
