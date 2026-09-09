import assert from "node:assert/strict";
import { test } from "node:test";

import { pickCopy } from "./copy.ts";

const en = { heading: "Readings", lead: ["one line", "and another"] };
const es = { heading: "Lecturas", lead: ["una linea", "y otra"] };

test("the locale being read is the copy that comes back", () => {
  assert.deepEqual(pickCopy(en, { es }, "es"), es);
  assert.deepEqual(pickCopy(en, { es }, "en"), en);
});

test("a locale with no file falls back to English rather than rendering nothing", () => {
  assert.deepEqual(pickCopy(en, { es }, "fr"), en);
});

/*
  The rule this pins is the one that keeps a page in one language. A
  field-by-field merge would answer "Lecturas" for the heading and the English
  lead beneath it; whole-file fallback answers the half-written file as it is,
  and `check:translations` is what says how far through it is.
*/
test("the fallback is the whole file, not a field-by-field merge", () => {
  const partial = { heading: "Lecturas" } as unknown as typeof en;

  assert.equal(pickCopy(en, { es: partial }, "es").lead, undefined);
});
