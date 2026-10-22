import assert from "node:assert/strict";
import { test } from "node:test";

import { viewingRoom, viewingRoomDeck } from "./viewing-room.ts";

test("the deck is the whole Major Arcana, in deck order", () => {
  assert.equal(viewingRoomDeck.length, 22);

  const numbers = viewingRoomDeck.map((card) => card.number);
  assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b));
  assert.equal(numbers[0], 0, "The Fool is 0");
  assert.equal(numbers[21], 21);
});

test("every card carries art, and the locked ones are marked", () => {
  for (const card of viewingRoomDeck) {
    assert.ok(card.image.src, `${card.name} has no art`);
    assert.equal(typeof card.inViewingRoom, "boolean");
  }

  const locked = viewingRoomDeck.filter((card) => !card.inViewingRoom);
  assert.ok(locked.length > 0, "some cards must be locked so coming-soon is reviewable");
  assert.ok(locked.length < viewingRoomDeck.length, "not all of them");
});

/*
  The deck is derived from `content/library.ts` rather than restated, so the
  names and numerals cannot drift from the Library's. These assertions are the
  derivation's contract: they fail if someone replaces it with a hand-written
  list that spells a card differently.
*/
test("names and numerals are the Library's, not a second spelling", () => {
  const fool = viewingRoomDeck[0];
  assert.equal(fool.name, "The Fool");
  assert.equal(fool.numeral, "0", "the Fool has no Roman numeral");

  const strength = viewingRoomDeck.find((card) => card.name === "Strength");
  assert.equal(strength?.number, 8, "the client's deck puts Strength at VIII");
  assert.equal(strength?.numeral, "VIII");

  assert.equal(viewingRoomDeck[21].name, "The World");
  assert.equal(viewingRoomDeck[21].numeral, "XXI");
});

test("every card has a stable id and they are all distinct", () => {
  const ids = viewingRoomDeck.map((card) => card.id);

  assert.equal(new Set(ids).size, 22, "a duplicate id would select two cards at once");
  for (const id of ids) assert.ok(id.length > 0);
});

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
