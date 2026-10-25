import assert from "node:assert/strict";
import { test } from "node:test";

import { viewingRoom } from "./viewing-room.ts";

/*
  The deck used to be asserted here, because it used to live here: twenty-two
  cards derived from `content/library.ts` with three marked unplayable by hand.
  It is the backend's now, and those assertions moved with it to
  `lib/viewing-room-deck.test.ts` — what is left in this file is the copy,
  which is still the client's and still ours to keep right.
*/

test("the copy is the client's, including the corrected artefacts", () => {
  assert.equal(viewingRoom.title, "The Living Tarot");
  assert.equal(viewingRoom.panel.price, "$29 — One-time payment");
  assert.equal(viewingRoom.closing.action, "GET A READING");
  assert.ok(!viewingRoom.closing.action.includes("  "), "the double space is corrected");
});

test("the panel carries the three benefits the frame draws", () => {
  assert.equal(viewingRoom.panel.benefits.length, 3);
  assert.deepEqual(
    viewingRoom.panel.benefits.map((benefit) => benefit.lines.join(" ")),
    ["ALL 22 MAJOR ARCANA", "LIFETIME ACCESS", "MOTION, LIGHT & SOUND"],
  );
});

/*
  The closing line is two parts rather than one string with a tilde in it: the
  client's `~` is where her layout breaks, not a character anybody reads.
*/
test("the closing line is two parts and carries no stray tilde", () => {
  assert.equal(viewingRoom.closing.lines.length, 2);
  for (const line of viewingRoom.closing.lines) {
    assert.ok(!line.includes("~"), `"${line}" still carries the layout artefact`);
  }
});
