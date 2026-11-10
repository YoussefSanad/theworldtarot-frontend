import assert from "node:assert/strict";
import { test } from "node:test";

import type { ApiCard } from "./api.ts";
import { resolveDeck, toViewingRoomCard, toViewingRoomDeck } from "./viewing-room-deck.ts";

/**
 * A wire card. The listing carries the full copy, which is what lets the room
 * render everything from one request — so the fixture carries it too, rather
 * than only the fields the room happens to read today.
 */
const wire = (card: Partial<ApiCard> & { id: number; number: number }): ApiCard => ({
  name: "The Fool",
  short_description: "A beginning.",
  long_description: "The longer meaning of the card.",
  image: "https://media.theworldtarot.com/cards/the-fool.jpg",
  in_viewing_room: true,
  ...card,
});

test("a wire card maps to the shape the room draws", () => {
  const card = toViewingRoomCard(
    wire({ id: 42, number: 17, name: "The Star", image: "https://media.test/star.jpg" }),
  );

  assert.equal(card.id, 42, "the backend's integer, which /cards/{id}/video needs");
  assert.equal(card.number, 17);
  assert.equal(card.numeral, "XVII");
  assert.equal(card.name, "The Star");
  assert.equal(card.image.src, "https://media.test/star.jpg");
  assert.equal(card.inViewingRoom, true);
});

/*
  The roundel draws the numeral and the API sends an integer, so the lookup is
  the one piece of this mapping that can be quietly wrong — and wrong by one
  for every card after the mistake, which is the kind of thing that reads as
  "the deck looks odd" rather than as a bug.
*/
test("the numeral comes off the card's number, and the Fool has none", () => {
  assert.equal(toViewingRoomCard(wire({ id: 1, number: 0 })).numeral, "0");
  assert.equal(toViewingRoomCard(wire({ id: 9, number: 8 })).numeral, "VIII");
  assert.equal(toViewingRoomCard(wire({ id: 22, number: 21 })).numeral, "XXI");
});

test("a number past the Major Arcana falls back to itself rather than throwing", () => {
  const card = toViewingRoomCard(wire({ id: 99, number: 22 }));

  assert.equal(card.numeral, "22", "a room that renders beats a room that refuses to");
});

/*
  `in_viewing_room` is the one fact this page adds to the Library's view of a
  card, and it must survive the mapping as itself: a card whose film is not
  ready is drawn as coming soon, and flipping this would advertise a film that
  404s on play.
*/
test("an unready film arrives as a locked card, not a missing one", () => {
  const locked = toViewingRoomCard(wire({ id: 13, number: 12, in_viewing_room: false }));

  assert.equal(locked.inViewingRoom, false);
  assert.equal(locked.name, "The Fool", "it is still a card, with all its copy");
});

test("the deck comes out in deck order whatever order it arrived in", () => {
  const deck = toViewingRoomDeck([
    wire({ id: 3, number: 2 }),
    wire({ id: 1, number: 0 }),
    wire({ id: 2, number: 1 }),
  ]);

  assert.deepEqual(
    deck.map((card) => card.number),
    [0, 1, 2],
    "the carousel's whole affordance is moving through the deck in sequence",
  );
});

test("an empty listing maps to an empty deck rather than failing", () => {
  assert.deepEqual(toViewingRoomDeck([]), []);
});

/*
  The four states, which are the reason this is a union rather than a list and
  a couple of booleans. The distinctions that matter:

  - loading and unreachable are both "no cards", and only one is worth waiting
    through
  - empty and unreachable are both "nothing to show", and only one is the
    backend's considered answer — so only one of them offers a retry
*/
test("no answer yet is loading, which is not a failure", () => {
  assert.deepEqual(resolveDeck(undefined, false), { status: "loading" });
});

test("a thrown request with nothing in hand is unreachable", () => {
  assert.deepEqual(resolveDeck(undefined, true), { status: "unreachable" });
});

test("an answer with no cards is empty, not broken", () => {
  assert.deepEqual(
    resolveDeck([], false),
    { status: "empty" },
    "a freshly seeded site reaches this, and it is a real state",
  );
});

test("cards in hand are live, and they travel on the live arm alone", () => {
  const cards = toViewingRoomDeck([wire({ id: 1, number: 0 })]);
  const state = resolveDeck(cards, false);

  assert.equal(state.status, "live");
  assert.equal(state.status === "live" && state.cards.length, 1);
});

/*
  A failure only decides anything when there is nothing to keep — the rule
  `lib/product.ts` states for a price and `lib/catalogue.ts` for the
  catalogue. A retry that fails should not take the deck off the page that was
  already on it.
*/
test("a deck already in hand outranks a later failure", () => {
  const cards = toViewingRoomDeck([wire({ id: 1, number: 0 })]);

  assert.equal(resolveDeck(cards, true).status, "live");
});
