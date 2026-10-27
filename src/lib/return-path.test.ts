import assert from "node:assert/strict";
import { test } from "node:test";

import { landingFor, readReturnPath } from "./return-path.ts";
import type { Customer } from "./session.ts";

function customer(hasViewingRoomAccess: boolean): Customer {
  return { id: 1, name: null, email: "jane@example.com", hasViewingRoomAccess };
}

test("keeps a path on this site", () => {
  assert.equal(readReturnPath("/viewing-room/"), "/viewing-room/");
});

test("keeps a path's own query string and fragment", () => {
  assert.equal(readReturnPath("/library/?card=3#notes"), "/library/?card=3#notes");
});

test("refuses an absolute URL, however friendly the host looks", () => {
  assert.equal(readReturnPath("https://theworldtarot.com/viewing-room/"), null);
  assert.equal(readReturnPath("http://elsewhere.example/"), null);
});

test("refuses a protocol-relative URL", () => {
  // The one that reads as a path and is not: `//elsewhere.example` is a host.
  assert.equal(readReturnPath("//elsewhere.example/viewing-room/"), null);
  assert.equal(readReturnPath("/\\elsewhere.example"), null);
});

test("refuses a scheme that is not a page at all", () => {
  assert.equal(readReturnPath("javascript:alert(1)"), null);
  assert.equal(readReturnPath("data:text/html,<script></script>"), null);
});

test("refuses a relative path, which is not ours to resolve", () => {
  assert.equal(readReturnPath("viewing-room/"), null);
  assert.equal(readReturnPath("../admin/"), null);
});

test("refuses an absent, empty or whitespace-only parameter", () => {
  assert.equal(readReturnPath(null), null);
  assert.equal(readReturnPath(""), null);
  assert.equal(readReturnPath("   "), null);
});

test("refuses a control character smuggled into the path", () => {
  // `\n` and friends let a crafted value break out of a header or an attribute.
  assert.equal(readReturnPath("/viewing-room/\nSet-Cookie: a=b"), null);
  assert.equal(readReturnPath("/viewing\troom/"), null);
});

test("refuses the sign in page itself, by path and not by equality", () => {
  assert.equal(readReturnPath("/login/"), null);
  assert.equal(readReturnPath("/login/?next=/login/"), null);
});

test("refuses the sign in page however the address is spelled", () => {
  /*
    `trailingSlash` is on, so `/login` is a redirect to `/login/` — the loop
    with one extra hop in it. Case is folded because a visitor typing `/Login/`
    means the page, and only the host knows whether its files are
    case-sensitive.
  */
  assert.equal(readReturnPath("/login"), null);
  assert.equal(readReturnPath("/LOGIN/"), null);
  assert.equal(readReturnPath("/Login"), null);
});

test("refuses a dot segment that normalises into a host", () => {
  /*
    `/..//evil.com` passes the leading-`//` guard — it starts `/.` — and then
    `new URL()` resolves it to `//evil.com`, which is a protocol-relative URL
    and so a different origin. The browser does this normalisation, not us, so
    a value has to be refused for what it *becomes*.
  */
  assert.equal(readReturnPath("/..//evil.com"), null);
  assert.equal(readReturnPath("/../..//evil.com"), null);
  assert.equal(readReturnPath("/a/..//evil.com"), null);
});

test("refuses every spelling of a dot segment, not just the literal one", () => {
  /*
    A code review found the first version of this guard — which matched a
    literal `..` segment — wide open, and verified all of these end up on
    another origin in a real browser. A single dot counts, because `/.//host`
    collapses to `//host` just as `/..//host` does, and percent-encoding hides
    either from any string match.

    This is why the guard below resolves the value instead of inspecting it:
    the list of ways to write "go up one level" is not knowable in advance, and
    every entry here is one somebody already thought of.
  */
  for (const vector of [
    "/.//evil.example/",
    "/%2e%2e//evil.example/",
    "/%2E%2E//evil.example/",
    "/.%2e//evil.example/",
    "/a/%2e%2e/%2e%2e//evil.example/",
    "/././/evil.example/",
    "/x/./..//evil.example/",
    "/%2e//evil.example/",
  ]) {
    assert.equal(readReturnPath(vector), null, `${vector} must not survive`);
  }
});

test("what it returns is always a path on this site", () => {
  /*
    The property that actually matters, stated once rather than chased vector
    by vector: whatever comes back, resolving it can only land on our own
    origin. A `pathname` beginning `//` is the failure this catches — handed to
    `router.push` it is read as a host, whatever origin it was resolved against.
  */
  const inputs = [
    "/viewing-room/", "/library/?card=3#notes", "/.//evil.example/",
    "/%2e%2e//evil.example/", "//evil.example", "/a/../b/", "/the-fool.v2/",
    "https://evil.example/", "javascript:alert(1)", "/login/", "   ", null,
  ];

  for (const input of inputs) {
    const kept = readReturnPath(input);
    if (kept === null) continue;

    const resolved = new URL(kept, "https://ours.invalid/login/");
    assert.equal(resolved.origin, "https://ours.invalid", `${kept} left the origin`);
    assert.ok(!resolved.pathname.startsWith("//"), `${kept} resolved to a host`);
  }
});

test("normalises a dot segment that stays on this site", () => {
  /*
    These are not attacks and are not refused: once resolved they are ordinary
    same-origin paths, and the caller is handed the address the browser would
    have gone to rather than the shorthand. An earlier version of this test
    expected `null` for both, which was over-strict — the danger was never the
    dots, it was a resolution that leaves the origin, and that is now tested
    for directly above.
  */
  assert.equal(readReturnPath("/login/../admin/"), "/admin/");
  assert.equal(readReturnPath("/a/../b/"), "/b/");
});

test("keeps a path that merely contains dots in a segment name", () => {
  assert.equal(readReturnPath("/library/the-fool.v2/"), "/library/the-fool.v2/");
  assert.equal(readReturnPath("/a..b/"), "/a..b/");
});

test("trims the surrounding whitespace a mail client can add", () => {
  assert.equal(readReturnPath("  /viewing-room/  "), "/viewing-room/");
});

test("sends a pass holder to the Viewing Room", () => {
  assert.equal(landingFor(customer(true)), "/viewing-room/");
});

test("sends everybody else home", () => {
  assert.equal(landingFor(customer(false)), "/");
});
