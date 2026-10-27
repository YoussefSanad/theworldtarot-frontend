import assert from "node:assert/strict";
import { test } from "node:test";

import { afterClaimDestination } from "./return-path.ts";

test("a claim with a safe next goes there, query and hash intact", () => {
  assert.equal(afterClaimDestination("claim", "/viewing-room/"), "/viewing-room/");
  assert.equal(afterClaimDestination("claim", "/readings/?x=1#top"), "/readings/?x=1#top");
});

test("a claim with no next does not auto sign in", () => {
  assert.equal(afterClaimDestination("claim", null), null);
  assert.equal(afterClaimDestination("claim", undefined), null);
  assert.equal(afterClaimDestination("claim", ""), null);
});

test("a reset never auto signs in, even with a safe next", () => {
  assert.equal(afterClaimDestination("reset", "/viewing-room/"), null);
  assert.equal(afterClaimDestination("reset", null), null);
});

for (const unsafe of [
  "//evil.com",
  "/.//evil.com",
  "https://evil.com",
  "javascript:alert(1)",
  "/\\evil.com",
  "/login",
  "/login/",
  "/set-password/",
  "/reset-password/",
  "/viewing-room/?token=abc",
  "/viewing-room/?email=jane@example.com",
]) {
  test(`an unsafe next is never followed: ${unsafe}`, () => {
    assert.equal(afterClaimDestination("claim", unsafe), null);
  });
}
