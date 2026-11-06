import assert from "node:assert/strict";
import { test } from "node:test";

import { viewingRoom } from "@/content/viewing-room";

import type { ApiProduct } from "./api.ts";
import { PASS, passPriceLineFrom, resolvePassPrice, resolvePassPriceLine } from "./pass-price.ts";

function priced(key: string, currency: string, amount: number): ApiProduct {
  return {
    key,
    type: "reading",
    name: key.toUpperCase(),
    short_description: "",
    allows_question: true,
    is_giftable: false,
    price: { currency, amount },
  };
}

const { price: BUNDLED, priceNote: NOTE } = viewingRoom.panel;

const live = [priced("one-card", "GBP", 1000), priced(PASS, "GBP", 2400)];

test("before an answer the bundled line stands, which is what the export ships", () => {
  assert.equal(resolvePassPriceLine(null, BUNDLED, NOTE), "$29 — One-time payment");
});

test("a live price replaces the number and keeps the client's suffix", () => {
  assert.equal(resolvePassPriceLine(live, BUNDLED, NOTE), "£24 — One-time payment");
});

/*
  The bug this file exists for: the panel said $29 while the checkout beside it
  charged the backend's price in the visitor's currency. Both now come from the
  same answer, so the line cannot name a price nobody is charged.
*/
test("the quoted currency is the one the request resolved to, not USD", () => {
  assert.ok(resolvePassPriceLine(live, BUNDLED, NOTE).startsWith("£"));
  assert.ok(!resolvePassPriceLine(live, BUNDLED, NOTE).includes("$"));
});

test("a changed price in the same currency is quoted as changed", () => {
  const raised = [priced(PASS, "USD", 3900)];
  assert.equal(resolvePassPriceLine(raised, BUNDLED, NOTE), "$39 — One-time payment");
});

test("a price that is not a whole unit keeps its decimals", () => {
  const odd = [priced(PASS, "USD", 2950)];
  assert.equal(resolvePassPriceLine(odd, BUNDLED, NOTE), "$29.50 — One-time payment");
});

test("a catalogue answered without the pass keeps the bundled line", () => {
  // The offer itself is taken down by `useProduct(PASS)` in `PaymentPanel`,
  // which asks for the key and answers `withdrawn`. This only decides the copy.
  assert.equal(resolvePassPriceLine([priced("one-card", "GBP", 1000)], BUNDLED, NOTE), "$29 — One-time payment");
});

test("an empty catalogue is a fault rather than a shop with nothing in it", () => {
  assert.equal(resolvePassPriceLine([], BUNDLED, NOTE), "$29 — One-time payment");
});

test("the key is the backend's, so a tile-shaped key does not match", () => {
  assert.equal(resolvePassPrice([priced("viewing-room", "GBP", 2400)]), null);
});

test("the money, when there is any, is the backend's own minor units", () => {
  assert.deepEqual(resolvePassPrice(live), { currency: "GBP", amount: 2400 });
});

/*
  Screen two formats from the `Money` its checkout is built from rather than
  from a second lookup, so the quoted price and the charged price are one value.
*/
test("money in hand builds the same line", () => {
  assert.equal(passPriceLineFrom({ currency: "GBP", amount: 2400 }, NOTE), "£24 — One-time payment");
});
