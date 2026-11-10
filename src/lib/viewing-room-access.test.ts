import assert from "node:assert/strict";
import { test } from "node:test";

import { accessStateOf, roomIsInert, thumbnailLabel } from "./viewing-room-access.ts";
import type { Customer } from "./session.ts";

const customer = (hasViewingRoomAccess: boolean): Customer => ({
  id: 1,
  name: null,
  email: "jane@example.com",
  hasViewingRoomAccess,
});

test("undefined is still asking, which is not the same as signed out", () => {
  assert.equal(accessStateOf(undefined), "asking");
});

test("null is signed out", () => {
  assert.equal(accessStateOf(null), "signed-out");
});

test("a customer without the pass is no-pass, not signed out", () => {
  assert.equal(accessStateOf(customer(false)), "no-pass");
});

test("a pass holder is a member", () => {
  assert.equal(accessStateOf(customer(true)), "member");
});

/*
  Review Focus #1. `useSignedIn` publishes null when /me throws, so a broken
  API arrives here as "signed out" rather than as a permanent "asking". The
  veil must never be the final state: a visitor whose network died still gets
  a modal they can act on instead of a room that spins forever.
*/
test("a failed /me is signed out, never a permanent asking", () => {
  // What useSignedIn publishes when currentCustomer() rejects.
  assert.equal(accessStateOf(null), "signed-out");
  assert.notEqual(accessStateOf(null), "asking", "the veil must not become the final state");
});

test("only the member and the asking state leave the room usable", () => {
  assert.equal(roomIsInert("asking"), false, "the veil covers it; inert would fight the veil");
  assert.equal(roomIsInert("signed-out"), true);
  assert.equal(roomIsInert("no-pass"), true);
  assert.equal(roomIsInert("member"), false);
});

test("the two refused states are exactly the ones that lock the room", () => {
  for (const state of ["signed-out", "no-pass"] as const) {
    assert.equal(roomIsInert(state), true, `${state} must lock the room`);
  }
});

const deckCard = (inViewingRoom: boolean) => ({
  id: "the-fool",
  number: 0,
  numeral: "0",
  name: "The Fool",
  image: { src: "/fool.webp" },
  inViewingRoom,
});

test("a playable card is announced by name", () => {
  assert.equal(thumbnailLabel(deckCard(true)), "The Fool tarot card from The World Tarot");
});

/*
  Review Focus #4. A locked card is in the tab order — removing it would hide
  three of twenty-two from a keyboard — so it must say why it does nothing.
  A focusable control that announces only its name and then refuses to act is
  worse than one that is absent.
*/
test("a locked card says so in its own label", () => {
  const label = thumbnailLabel(deckCard(false));

  assert.ok(label.includes("The Fool"), "still names the card");
  assert.ok(/coming soon/i.test(label), "and says why it cannot be chosen");
});

test("the locked suffix is added to the alt text, not substituted for it", () => {
  const playable = thumbnailLabel(deckCard(true));
  const locked = thumbnailLabel(deckCard(false));

  assert.ok(locked.startsWith(playable), "the ticket's alt-text pattern survives the lock");
});
