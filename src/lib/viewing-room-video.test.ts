import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchVideoUrl, hasExpired, readPlaybackFailure } from "./viewing-room-video.ts";

const at = (iso: string) => ({ cardId: "1", url: "https://example.test/x.m3u8", expiresAt: iso });

test("a URL with time left has not expired", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  assert.equal(hasExpired(at("2026-10-22T12:20:00Z"), now), false);
});

/*
  Review Focus #3. A tab left open overnight: the held URL is long dead, and
  pressing play must fetch a fresh one BEFORE attaching, not attach a corpse
  and recover from the fatal error afterwards.
*/
test("a URL whose time has passed has expired", () => {
  const now = new Date("2026-10-22T13:00:00Z");
  assert.equal(hasExpired(at("2026-10-22T12:20:00Z"), now), true);
});

test("the boundary counts as expired, with a margin for the trip", () => {
  const now = new Date("2026-10-22T12:19:50Z");
  assert.equal(
    hasExpired(at("2026-10-22T12:20:00Z"), now),
    true,
    "ten seconds left is not enough to start a stream",
  );
});

test("a URL just outside the margin is still usable", () => {
  const now = new Date("2026-10-22T12:19:00Z");
  assert.equal(
    hasExpired(at("2026-10-22T12:20:00Z"), now),
    false,
    "a full minute is enough; renewing here would be a request for nothing",
  );
});

test("a malformed expiry is treated as expired rather than trusted", () => {
  assert.equal(hasExpired(at("not a date"), new Date()), true);
});

test("the backend's refusals map to the four the UI acts on", () => {
  assert.equal(readPlaybackFailure(401), "signed-out");
  assert.equal(readPlaybackFailure(403), "no-pass");
  assert.equal(readPlaybackFailure(404), "not-ready");
  assert.equal(readPlaybackFailure(500), "unknown");
});

/*
  403 and 404 are deliberately different answers and the contract is emphatic
  about it: 404 is "no film exists", 403 is "a film exists and you may not
  watch it". Collapsing them would tell a paying customer their card is
  unfinished.
*/
test("403 and 404 never collapse into one another", () => {
  assert.notEqual(readPlaybackFailure(403), readPlaybackFailure(404));
});

test("the stub answers a playable source for any card", async () => {
  const playback = await fetchVideoUrl("1", {});

  assert.equal(playback.cardId, "1");
  assert.ok(playback.url.length > 0);
  assert.equal(hasExpired(playback, new Date()), false, "a fresh stub is not born expired");
});

test("the seam honours an abort signal, as the race guard needs it to", async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(() => fetchVideoUrl("1", { signal: controller.signal }));
});
