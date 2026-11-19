import assert from "node:assert/strict";
import { test } from "node:test";

import { isNavActive, navAriaCurrent, normalisePath } from "./nav-active.ts";
import { majorArcana, suits, suitPath, cardPath } from "../content/library.ts";
import { primaryNav } from "../content/site.ts";

test("normalisePath adds the trailing slash and drops query and hash", () => {
  assert.equal(normalisePath("/faq"), "/faq/");
  assert.equal(normalisePath("/faq/"), "/faq/");
  assert.equal(normalisePath("/readings/one-card"), "/readings/one-card/");
  assert.equal(normalisePath("/library/?tab=1#top"), "/library/");
});

test("a top-level item is active for its whole section", () => {
  assert.equal(isNavActive("/readings/", "/readings/"), true);
  assert.equal(isNavActive("/readings/three-card/", "/readings/"), true);
  assert.equal(isNavActive("/library/", "/library/"), true);
  for (const suit of suits) {
    assert.equal(isNavActive(suit.href, "/library/"), true, suit.slug);
  }
  assert.equal(isNavActive(cardPath(majorArcana[0]), "/library/"), true);
});

test("a child row is active only on its exact page", () => {
  assert.equal(isNavActive("/library/", "/library/", { exact: true }), true);
  for (const suit of suits) {
    assert.equal(isNavActive(suit.href, "/library/", { exact: true }), false, suit.slug);
    assert.equal(isNavActive(suit.href, suit.href, { exact: true }), true, suit.slug);
  }
  assert.equal(isNavActive("/readings/three-card/", "/readings/in-depth/", { exact: true }), false);
});

test("slashes, query strings and hashes do not change the answer", () => {
  assert.equal(isNavActive("/faq/", "/faq"), true);
  assert.equal(isNavActive("/faq", "/faq/"), true);
  assert.equal(isNavActive("/readings/one-card/", "/readings/one-card", { exact: true }), true);
  assert.equal(isNavActive("/library/?x=1", "/library/", { exact: true }), true);
});

test("matching is by whole path segment", () => {
  assert.equal(isNavActive("/libraryfoo/", "/library/"), false);
  assert.equal(isNavActive("/faqs/", "/faq"), false);
});

test("the root only matches itself", () => {
  assert.equal(isNavActive("/", "/"), true);
  assert.equal(isNavActive("/library/", "/"), false);
});

test("pages outside the nav mark nothing", () => {
  const hrefs = primaryNav.flatMap((item) => [
    item.href,
    ..."children" in item ? item.children.map((child) => child.href) : [],
  ]);
  const outside = ["/", "/login/", "/checkout/", "/checkout/success/", "/redeem/", "/set-password/", "/reset-password/"];

  for (const path of outside) {
    for (const href of hrefs) {
      assert.equal(isNavActive(path, href), false, `${path} vs ${href}`);
    }
  }
});

test("a null pathname marks nothing", () => {
  assert.equal(isNavActive(null, "/library/"), false);
  assert.equal(isNavActive(undefined, "/library/"), false);
});

test("aria-current is page on the page itself and true for a section inside it", () => {
  assert.equal(navAriaCurrent("/readings/", "/readings/"), "page");
  assert.equal(navAriaCurrent("/readings/three-card/", "/readings/"), "true");
  assert.equal(navAriaCurrent("/readings/three-card/", "/readings/three-card/", { exact: true }), "page");
  assert.equal(navAriaCurrent("/login/", "/readings/"), undefined);
});

test("every suit page is the same path its nav row points at", () => {
  for (const suit of suits) {
    assert.equal(suit.href, suitPath(suit));
  }
});
