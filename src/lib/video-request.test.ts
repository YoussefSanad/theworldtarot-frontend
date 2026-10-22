import assert from "node:assert/strict";
import { test } from "node:test";

import { createRequestGuard } from "./video-request.ts";

test("a single request is current", () => {
  const guard = createRequestGuard();
  const first = guard.begin("1");

  assert.equal(first.isCurrent(), true);
  assert.equal(first.signal.aborted, false);
});

test("beginning a second request retires the first", () => {
  const guard = createRequestGuard();
  const first = guard.begin("1");
  const second = guard.begin("2");

  assert.equal(first.isCurrent(), false, "a stale response must be droppable");
  assert.equal(first.signal.aborted, true, "and the request itself aborted");
  assert.equal(second.isCurrent(), true);
});

/*
  Review Focus #2. Four selections in a row, which is what a visitor dragging
  across the carousel actually does. Only the last may play, and an earlier
  response arriving late must not resurrect itself.
*/
test("rapid switching leaves exactly one survivor", () => {
  const guard = createRequestGuard();
  const requests = ["1", "2", "3", "4"].map((id) => guard.begin(id));

  const current = requests.filter((request) => request.isCurrent());
  assert.equal(current.length, 1);
  assert.equal(current[0], requests[3]);

  for (const stale of requests.slice(0, 3)) {
    assert.equal(stale.signal.aborted, true);
  }
});

test("aborting retires everything, so nothing plays after a teardown", () => {
  const guard = createRequestGuard();
  const request = guard.begin("1");

  guard.abort();

  assert.equal(request.isCurrent(), false);
  assert.equal(request.signal.aborted, true);
});

test("the same card selected twice still retires the first attempt", () => {
  const guard = createRequestGuard();
  const first = guard.begin("1");
  const second = guard.begin("1");

  assert.equal(first.isCurrent(), false, "identity is the attempt, not the card id");
  assert.equal(second.isCurrent(), true);
});

/*
  The guard is useless if a caller cannot tell, after awaiting, that it was
  overtaken. This is the shape the player actually uses: await, then ask.
*/
test("a response that resolves after being overtaken is droppable", async () => {
  const guard = createRequestGuard();
  const slow = guard.begin("1");

  const arrived = Promise.resolve("the first card's url").then((url) => ({
    url,
    stillWanted: slow.isCurrent(),
  }));

  guard.begin("2");
  const result = await arrived;

  assert.equal(result.stillWanted, false, "the player must drop this, not play it");
});

test("aborting twice is harmless, as a teardown after a teardown is", () => {
  const guard = createRequestGuard();
  guard.begin("1");

  guard.abort();
  guard.abort();

  assert.equal(guard.begin("2").isCurrent(), true, "the guard still works afterwards");
});
