import assert from "node:assert/strict";
import { test } from "node:test";

import { PRIVATE_ROUTES, PUBLIC_ROUTES, sitemapEntries } from "./routes.ts";
import { canonicalFor } from "./seo.ts";

test("the six public routes are the ones a stranger can usefully land on", () => {
  assert.deepEqual(PUBLIC_ROUTES, [
    "/",
    "/readings/",
    "/readings/three-card/",
    "/readings/month-ahead/",
    "/readings/in-depth/",
    "/redeem/",
  ]);
});

test("redeem is public, because a gift code page is a page that works", () => {
  assert.ok(PUBLIC_ROUTES.includes("/redeem/"));
  assert.ok(!PRIVATE_ROUTES.includes("/redeem/"));
});

test("nothing is both public and private", () => {
  const overlap = PUBLIC_ROUTES.filter((route) => PRIVATE_ROUTES.includes(route));
  assert.deepEqual(overlap, []);
});

test("every route carries its trailing slash, or the canonical would name a 308", () => {
  for (const route of [...PUBLIC_ROUTES, ...PRIVATE_ROUTES]) {
    assert.ok(route.endsWith("/"), `${route} has no trailing slash`);
  }
});

test("the sitemap holds one absolute entry per public route", () => {
  const entries = sitemapEntries();

  assert.equal(entries.length, PUBLIC_ROUTES.length);
  assert.equal(entries[0].url, canonicalFor("/"));
  assert.equal(entries[1].url, canonicalFor("/readings/"));
});

test("one built locale declares no alternates, so no hreflang goes out unreciprocated", () => {
  for (const entry of sitemapEntries()) assert.equal(entry.alternates, undefined);
});
