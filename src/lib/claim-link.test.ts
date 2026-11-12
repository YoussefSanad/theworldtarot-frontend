import assert from "node:assert/strict";
import { test } from "node:test";

import { CLAIM_LINK_RETRY_DELAYS_MS, claimLinkFrom } from "./claim-link.ts";

/** The link exactly as `FrontendUrl::setPassword(..., ViewingRoomPass)` builds it. */
const BUILT = "https://theworldtarot.com/set-password/?token=abc123&email=jane%40example.com&next=%2Fviewing-room%2F";

test("a ready link becomes the same page and query on this site", () => {
  assert.deepEqual(claimLinkFrom({ set_password_link: "ready", set_password_url: BUILT }), {
    state: "ready",
    href: "/set-password/?token=abc123&email=jane%40example.com&next=%2Fviewing-room%2F",
  });
});

test("the query string arrives untouched, `next` included", () => {
  const link = claimLinkFrom({ set_password_link: "ready", set_password_url: BUILT });
  const query = new URL(link.state === "ready" ? link.href : "", "https://x.invalid").searchParams;

  assert.equal(query.get("token"), "abc123");
  assert.equal(query.get("email"), "jane@example.com");
  assert.equal(query.get("next"), "/viewing-room/");
});

test("not yet is told apart from never", () => {
  assert.deepEqual(claimLinkFrom({ set_password_link: "not_yet", set_password_url: null }), { state: "not_yet" });
  assert.deepEqual(claimLinkFrom({ set_password_link: "none", set_password_url: null }), { state: "none" });
});

test("a backend that predates the claim link answers none", () => {
  assert.deepEqual(claimLinkFrom({}), { state: "none" });
});

test("a state this build has never heard of is none", () => {
  assert.deepEqual(claimLinkFrom({ set_password_link: "almost", set_password_url: BUILT }), { state: "none" });
});

test("ready with anything short of a whole link is none, never a half-built one", () => {
  const broken = [
    null,
    "",
    42,
    "not a url at all ::",
    "https://theworldtarot.com/set-password/?email=jane%40example.com",
    "https://theworldtarot.com/set-password/?token=abc123",
    "https://theworldtarot.com/set-password/?token=&email=jane%40example.com",
    "https://theworldtarot.com/reset-password/?token=abc123&email=jane%40example.com",
    "https://theworldtarot.com/set-password?token=abc123&email=jane%40example.com",
  ];

  for (const url of broken) {
    assert.deepEqual(claimLinkFrom({ set_password_link: "ready", set_password_url: url }), { state: "none" }, String(url));
  }
});

test("a link built for another origin still opens this site's page", () => {
  const link = claimLinkFrom({
    set_password_link: "ready",
    set_password_url: "https://somewhere-else.example/set-password/?token=t&email=e%40x.com",
  });

  assert.deepEqual(link, { state: "ready", href: "/set-password/?token=t&email=e%40x.com" });
});

test("the background asking stops at thirty seconds and starts at one", () => {
  assert.equal(CLAIM_LINK_RETRY_DELAYS_MS[0], 1000);
  assert.equal(CLAIM_LINK_RETRY_DELAYS_MS.reduce((sum, delay) => sum + delay, 0), 30000);
});
