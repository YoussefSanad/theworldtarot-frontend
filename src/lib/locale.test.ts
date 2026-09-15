import assert from "node:assert/strict";
import { test } from "node:test";

import {
  currentLocale,
  DEFAULT_LOCALE,
  forgetLocaleUnlessServed,
  isUnserved,
  OFFERED_LOCALES,
} from "./locale.ts";

/*
  **Nothing here asserts what `apiLocale()` answers, deliberately.** There is no
  window under `node --test`, so `currentLocale()` is always the default and any
  assertion about `apiLocale()` passes against the old pinned
  `return DEFAULT_LOCALE` as readily as against the unpinned one.
  ~~`apiLocale() === currentLocale()`~~ was asserted here on 9 September 2026
  and removed on the 10th for exactly that: it read as proof of the unpinning
  and could not fail. ~~`apiServesDisplayLocale() === true`~~ went the same day,
  being the same comparison under another name.
*/
test("the site is English until a visitor chooses otherwise", () => {
  assert.equal(currentLocale(), DEFAULT_LOCALE);
});

test("Spanish is a language a visitor may choose", () => {
  assert.ok(OFFERED_LOCALES.includes("es"));
});

/*
  `isUnserved` is the decision that stops a stored choice outliving a takedown,
  and it is pure so these can reach every branch of it.
*/
test("a stored language the backend did not name is one it no longer serves", () => {
  assert.equal(isUnserved("es", ["en"]), true);
});

test("an empty answer is silence, not a takedown, so nothing is forgotten", () => {
  assert.equal(isUnserved("es", []), false);
});

test("a stored language the backend still names is kept", () => {
  assert.equal(isUnserved("es", ["en", "es"]), false);
});

test("nothing stored is nothing to forget", () => {
  assert.equal(isUnserved(undefined, ["en"]), false);
});

/*
  The effectful half, and a smoke test only. With no window nothing was ever
  stored, so this takes the branch a server render takes. It cannot tell
  whether the early return held: without it, the missing `window` throws inside
  the `try` and the `catch` returns anyway. What it does with a choice stored,
  `removeItem` and `reload()`, is exercised by nothing in this repository:
  `check:panel` never touches `wt.locale`.
*/
test("reconciling a language nobody chose does nothing, and reaches for no window", () => {
  assert.doesNotThrow(() => forgetLocaleUnlessServed(["en"]));
});
