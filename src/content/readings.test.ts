import assert from "node:assert/strict";
import { test } from "node:test";

import { closing, gift, intro, readingAction, readings, signature, traditional } from "./readings.ts";

/*
  Values as of 8 September 2026, written longhand. Passed before any string
  moved into JSON and must pass unchanged after.
*/

test("the intro keeps both its pre-split blocks", () => {
  assert.equal(intro.heading, "Readings");
  assert.deepEqual(intro.tagline, ["step into the parlor.", "leave the ordinary behind."]);
  assert.equal(intro.body.length, 2);
  assert.ok(intro.body[0].endsWith("Or choose one of our"));
  assert.ok(intro.body[1].startsWith("traditional written readings"));
});

test("the signature panel keeps its copy, its key and its artwork", () => {
  assert.deepEqual(signature.eyebrow, ["The World Tarot", "Signature Experience"]);
  assert.equal(signature.title, "1 Card Reading");
  assert.deepEqual(signature.body, ["Ask your question.", "Reveal your card.", "Watch it come to life."]);
  assert.equal(signature.productKey, "one-card");
  assert.equal(signature.price, "$12");
  assert.equal(signature.href, "/readings/one-card");
  assert.ok(signature.image.width > 0);
});

/*
  `titleTail` is what the mobile card drops so its title holds one line, so an
  empty string and a missing key must stay distinguishable: Three Card has no
  tail, the other two do.
*/
test("each reading keeps its title, its tail, and the key its price is asked for by", () => {
  assert.deepEqual(
    readings.map((r) => [r.productKey, r.title, r.titleTail ?? "", r.price]),
    [
      ["three-card", "3 Card Reading", "", "$52"],
      ["month-ahead", "Month Ahead", " Reading", "$75"],
      ["in-depth", "In-Depth", " Reading", "$120"],
    ],
  );
});

test("every reading keeps its line counts, its link and its picture", () => {
  assert.deepEqual(
    readings.map((r) => r.body.length),
    [3, 3, 2],
  );

  for (const reading of readings) {
    assert.ok(reading.href.startsWith("/readings/"), `${reading.href} is not a reading path`);
    assert.ok(reading.image.width > 0, `${reading.id} lost its artwork`);
    assert.ok(reading.imageAlt.length > 10, `${reading.id} lost its alt text`);
  }
});

test("the gift band, the closing saying and the shared action survive", () => {
  assert.equal(readingAction, "BEGIN YOUR READING");
  assert.equal(gift.title, "Gift a Reading");
  assert.deepEqual(gift.subtitle, ["a gift", "of insight"]);
  assert.equal(gift.href, "/readings/gift");
  assert.deepEqual(closing.saying, ["The future whispers long", "before it arrives"]);
  assert.equal(closing.action.label, "BEGIN YOUR READING");
  assert.equal(closing.action.href, "/readings/one-card");
  assert.equal(traditional.heading, "Traditional Tarot Readings");
});
