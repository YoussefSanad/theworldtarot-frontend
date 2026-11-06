import assert from "node:assert/strict";
import { test } from "node:test";

import { lookForGap } from "./look-for-gap.ts";

test("the gap clears the label plus breathing room", () => {
  assert.equal(lookForGap("LOOK FOR:"), "12ch");
});

test("a longer label gets a wider gap", () => {
  /*
    The rule's cut is sized in `ch` against the label's own font, so the number
    is the label's length plus clearance. A label longer than "LOOK FOR:" would
    sit on the line at a fixed 12ch.
  */
  assert.equal(lookForGap("KEY THEMES TO WATCH"), "22ch");
});

test("the gap never narrows below the default", () => {
  assert.equal(lookForGap("SEE:"), "12ch");
});
