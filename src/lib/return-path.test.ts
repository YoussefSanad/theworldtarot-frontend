import assert from "node:assert/strict";
import { test } from "node:test";

import { safeReturnPath } from "./return-path.ts";

test("same-origin relative paths are returned unchanged", () => {
  for (const path of [
    "/viewing-room/",
    "/readings/",
    "/readings/month-ahead/?x=1#top",
    "/",
  ]) {
    assert.equal(safeReturnPath(path), path);
  }
});

test("a literal percent-encoded slash inside a rooted path is just a path", () => {
  assert.equal(safeReturnPath("/%2f%2fhost"), "/%2f%2fhost");
});

test("null, undefined and empty are rejected", () => {
  assert.equal(safeReturnPath(null), null);
  assert.equal(safeReturnPath(undefined), null);
  assert.equal(safeReturnPath(""), null);
});

test("absolute URLs are rejected", () => {
  for (const raw of [
    "https://evil.com",
    "https://evil.com/viewing-room/",
    "http://evil.com",
    "HTTPS://evil.com",
    "http:",
    "http:/evil.com",
  ]) {
    assert.equal(safeReturnPath(raw), null, raw);
  }
});

test("protocol-relative and backslash hosts are rejected", () => {
  for (const raw of ["//evil.com", "//evil.com/readings/", "///evil.com", "/\\evil.com", "\\\\evil.com", "\\evil.com"]) {
    assert.equal(safeReturnPath(raw), null, raw);
  }
});

test("javascript: and data: schemes are rejected in any case", () => {
  for (const raw of [
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "DATA:text/html,x",
  ]) {
    assert.equal(safeReturnPath(raw), null, raw);
  }
});

test("paths without a leading slash are rejected", () => {
  for (const raw of ["viewing-room/", "readings", "evil.com", "?x=1", "#top", "%2F%2Fevil.com", "%2Fviewing-room%2F"]) {
    assert.equal(safeReturnPath(raw), null, raw);
  }
});

test("whitespace and control characters are rejected, including ones browsers strip into //host", () => {
  for (const raw of [
    " /viewing-room/",
    "/viewing-room/ ",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "\t//evil.com",
    "\n//evil.com",
    "/\t\\evil.com",
    "/viewing\troom/",
    "/viewing-room/\n",
    "/a\u0000b",
    "/a\u007fb",
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
  ]) {
    assert.equal(safeReturnPath(raw), null, JSON.stringify(raw));
  }
});

test("input longer than 512 characters is rejected, 512 is the last accepted length", () => {
  const ok = "/" + "a".repeat(511);
  const tooLong = "/" + "a".repeat(512);
  assert.equal(ok.length, 512);
  assert.equal(safeReturnPath(ok), ok);
  assert.equal(safeReturnPath(tooLong), null);
});

test("inputs that URL-normalise into a protocol-relative path are rejected", () => {
  for (const raw of [
    "/.//evil.com/",
    "/..//evil.com",
    "/a/..//evil.com",
    "/%2e//evil.com",
    "/%2E%2E//evil.com",
  ]) {
    assert.equal(safeReturnPath(raw), null, raw);
  }
});

test("accepted paths are returned in normalised form", () => {
  assert.equal(safeReturnPath("/a/../viewing-room/"), "/viewing-room/");
  assert.equal(safeReturnPath("/a/./b/?x=1#top"), "/a/b/?x=1#top");
});

test("Unicode whitespace and C1 controls are rejected", () => {
  for (const raw of ["/\u00a0x", "/x\u2028", "/\u3000x", "/\ufeffx", "/\u0085x", "/\u009fx"]) {
    assert.equal(safeReturnPath(raw), null, JSON.stringify(raw));
  }
});

test("login and set-password are rejected as targets to avoid redirect loops", () => {
  for (const raw of [
    "/login/",
    "/login",
    "/login/?next=/viewing-room/",
    "/login/#top",
    "/set-password/",
    "/set-password",
    "/set-password/?token=abc",
    "/set-password/#x",
  ]) {
    assert.equal(safeReturnPath(raw), null, raw);
  }
  assert.equal(safeReturnPath("/login-help/"), "/login-help/");
});

test("every form of /login, /set-password and /reset-password is rejected", () => {
  for (const raw of [
    "/reset-password/",
    "/reset-password/?token=x&email=a%40b",
    "/reset-password",
    "/set-password/index.html",
    "/set-password/index.html?token=x",
    "/login/index.html",
    "/login//",
    "/Login/",
    "/LOGIN/",
    "/SET-PASSWORD/",
    "/%6cogin/",
    "/%6Cogin/",
    "/%72eset-password/",
    "/login/../login/",
    "/login/index.txt",
    "/login.html",
  ]) {
    assert.equal(safeReturnPath(raw), null, raw);
  }
});

test("paths whose query carries a token or email param are rejected", () => {
  for (const raw of ["/viewing-room/?token=x", "/viewing-room/?a=1&email=x"]) {
    assert.equal(safeReturnPath(raw), null, raw);
  }
});

test("genuinely different lookalike pages are still accepted", () => {
  for (const raw of ["/login-help/", "/loginx/", "/readings/login/", "/viewing-room/?x=1"]) {
    assert.equal(safeReturnPath(raw), raw, raw);
  }
});
