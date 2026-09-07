import assert from "node:assert/strict";
import { test } from "node:test";

import { buildMetadata, canonicalFor, localePath, pageTitle, siteUrl, SITE_NAME } from "./seo.ts";

test("the site name leads on the home page and trails everywhere else", () => {
  assert.equal(pageTitle("/", "Enter The Living Tarot"), `${SITE_NAME} — Enter The Living Tarot`);
  assert.equal(pageTitle("/readings/", "Readings"), `Readings — ${SITE_NAME}`);
});

test("a canonical is absolute, and keeps the trailing slash the export is built on", () => {
  assert.equal(canonicalFor("/readings/"), `${siteUrl()}/readings/`);
  assert.equal(canonicalFor("/"), `${siteUrl()}/`);
});

test("the default locale keeps the bare path, which is the whole of ADR 0004", () => {
  assert.equal(localePath("/readings/", "en"), "/readings/");
  assert.equal(localePath("/", "en"), "/");
});

test("any other locale takes a prefix, so adding one is addition rather than a move", () => {
  assert.equal(localePath("/readings/", "es"), "/es/readings/");
  assert.equal(localePath("/", "es"), "/es/");
});

test("an indexable page carries a canonical and an Open Graph URL that agree", () => {
  const metadata = buildMetadata({ path: "/readings/", title: "Readings", description: "Choose a reading." });

  assert.equal(metadata.alternates?.canonical, `${siteUrl()}/readings/`);
  assert.equal(metadata.openGraph?.url, `${siteUrl()}/readings/`);
  assert.equal(metadata.openGraph?.title, `Readings — ${SITE_NAME}`);
  assert.equal(metadata.description, "Choose a reading.");
});

test("a page that opts out of the index says so, and still canonicalises", () => {
  const metadata = buildMetadata({ path: "/login/", title: "Sign In", index: false });

  assert.deepEqual(metadata.robots, { index: false, follow: false });
  assert.equal(metadata.alternates?.canonical, `${siteUrl()}/login/`);
});

test("an indexable page says nothing about robots, rather than saying yes", () => {
  assert.equal(buildMetadata({ path: "/readings/", title: "Readings" }).robots, undefined);
});

test("one built locale offers no alternates, because a page is not an alternate of itself", () => {
  assert.equal(buildMetadata({ path: "/readings/", title: "Readings" }).alternates?.languages, undefined);
});

test("a path without its trailing slash is a mistake worth refusing", () => {
  assert.throws(() => canonicalFor("/readings"), /trailing slash/);
});
