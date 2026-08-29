import assert from "node:assert/strict";
import { test } from "node:test";

import { questionIn } from "./question.ts";

/**
 * Only the guard branch is exercised here, and deliberately.
 *
 * The path that matters — `closest("form")` from the wallet row's own node, and
 * `FormData` off the form it finds — is DOM the way `sessionStorage` is
 * storage: faking it here would be asserting against the fake. It is proved in
 * a real browser instead, by `check:panel`, which fills the question and reads
 * it back along exactly that path. See "a wallet press would read the same
 * question off the same form" there.
 *
 * What is left is the answer this function gives when there is no form to read,
 * which needs no DOM to state and is the answer an order depends on: `question`
 * is optional on every product, and in gift mode there is no question field in
 * the DOM at all.
 */

test("no node is an empty question, not a crash", () => {
  // `event.currentTarget` after a React event has been pooled, or a ref that
  // has not attached yet. Both are ordinary, and neither is a reason to refuse
  // a press.
  assert.equal(questionIn(null), "");
  assert.equal(questionIn(undefined), "");
});

test("a node outside any form is an empty question", () => {
  // The shape of the bug this guard exists for: a row lifted out of the order
  // form by a refactor. It answers empty rather than throwing, because an
  // order with no question is valid — which is why `check:panel` asserts the
  // question arrives rather than trusting this to fail loudly.
  const orphan = { closest: () => null } as unknown as Element;

  assert.equal(questionIn(orphan), "");
});
