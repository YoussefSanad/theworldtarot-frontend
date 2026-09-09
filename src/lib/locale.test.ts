import assert from "node:assert/strict";
import { test } from "node:test";

import { apiLocale, currentLocale, DEFAULT_LOCALE } from "./locale.ts";

test("the backend is asked in English however the site is being read", () => {
  assert.equal(apiLocale(), DEFAULT_LOCALE);
});

/*
  The two answer the same string today and are still two questions. This pins
  the distinction rather than the coincidence: the day `currentLocale()` starts
  returning "es", nothing here should follow it, because `/api/v1/es/products`
  answers 404 rather than English and an empty catalogue would show bundled
  price strings where live money belongs.
*/
test("what the visitor reads and what the backend is asked are separate questions", () => {
  assert.equal(currentLocale(), DEFAULT_LOCALE);
  assert.equal(apiLocale(), DEFAULT_LOCALE);
});
