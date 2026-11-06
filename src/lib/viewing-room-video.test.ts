import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { fetchVideoUrl, hasExpired, readPlaybackFailure } from "./viewing-room-video.ts";

const at = (iso: string) => ({ cardId: 1, url: "https://example.test/x.m3u8", expiresAt: iso });

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

/*
  The wired seam, against a stubbed `fetch`, following `api.test.ts`'s harness.
  What is worth asserting here is not that `fetch` was called — it is the
  handling the contract makes load-bearing, all of which is invisible at the
  call site: the credentialed request, the no-store, and a refusal arriving as
  something `FilmPlayer` can read rather than as a bare Error.
*/
const BASE = "https://staging-api.theworldtarot.com";

let calls: { url: string; init: RequestInit }[] = [];
const realFetch = globalThis.fetch;

function stubFetch(response: Response): void {
  globalThis.fetch = ((url: string, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return Promise.resolve(response);
  }) as typeof fetch;
}

const PLAYBACK = {
  card_id: 17,
  url: "https://vz-test.b-cdn.net/bcdn_token=abc/playlist.m3u8",
  expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = BASE;
});

after(() => {
  globalThis.fetch = realFetch;
});

test("a signed URL comes back mapped out of the wire's snake_case", async () => {
  stubFetch(json(PLAYBACK));

  const playback = await fetchVideoUrl(17, {});

  assert.equal(playback.cardId, 17);
  assert.equal(playback.url, PLAYBACK.url);
  assert.equal(playback.expiresAt, PLAYBACK.expires_at);
  assert.equal(hasExpired(playback, new Date()), false, "a fresh URL is not born expired");
});

/*
  The website is the cookie flow, so the session rides on this request and the
  backend decides access from it. Without the cookie every call is a 401 and
  the room is locked for the members who paid for it — which makes this the one
  assertion here whose failure is silent in development, where nobody is signed
  in anyway.
*/
test("the request carries the session and refuses to be cached", async () => {
  stubFetch(json(PLAYBACK));

  await fetchVideoUrl(17, {});

  assert.equal(calls[0].init.credentials, "include", "without the cookie a member gets a 401");
  assert.equal(calls[0].init.cache, "no-store", "a cached credential outlives its own expiry");
});

test("the card id and the locale are both in the path", async () => {
  stubFetch(json(PLAYBACK));

  await fetchVideoUrl(17, { locale: "es" });

  assert.equal(calls[0].url, `${BASE}/api/v1/es/cards/17/video`);
});

/*
  The refusal has to arrive carrying `playbackFailure`, because that is the
  property `FilmPlayer.readFailure` reads and nothing else. A plain Error gets
  there as "something went wrong" and the room draws a dead player instead of
  the panel that would let the visitor fix it — sign in, or buy the pass.
*/
test("a refusal is thrown in the shape the player reads", async () => {
  for (const [status, failure] of [
    [401, "signed-out"],
    [403, "no-pass"],
    [404, "not-ready"],
    [429, "unknown"],
  ] as const) {
    stubFetch(json({ message: "no" }, status));

    await assert.rejects(
      () => fetchVideoUrl(17, {}),
      (error: unknown) => {
        assert.equal((error as { playbackFailure?: string }).playbackFailure, failure);
        return true;
      },
      `${status} should arrive as ${failure}`,
    );
  }
});

test("the seam honours an abort signal, as the race guard needs it to", async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(() => fetchVideoUrl(1, { signal: controller.signal }));
});
