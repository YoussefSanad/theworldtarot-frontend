import assert from "node:assert/strict";
import { test } from "node:test";

import { footerNav, headerActions, newsletter, primaryNav, socialHeading, socialLinks } from "./site.ts";

/*
  The extraction's only claim is that nothing changed. These are the values as
  of 8 September 2026, written out longhand rather than derived, because a test
  that computes its expectation from the thing under test proves nothing.

  Run this BEFORE moving any string into JSON. It must pass then, and pass
  unchanged after. An expectation edited to make it green is the extraction
  having changed something, hidden.
*/

test("primary nav keeps its labels, its order, and its hrefs", () => {
  assert.deepEqual(
    primaryNav.map((item) => item.label),
    ["WORLD TAROT", "LIVING TAROT", "READINGS", "LIBRARY", "FAQ"],
  );

  const readings = primaryNav.find((item) => item.label === "READINGS");
  assert.ok(readings && "children" in readings);
  assert.deepEqual(
    readings.children.map((child) => [child.label, child.href]),
    [
      ["OVERVIEW", "/readings/"],
      ["1 CARD EXPERIENCE", "/readings/one-card"],
      ["3 CARD", "/readings/three-card/"],
      ["MONTH AHEAD", "/readings/month-ahead/"],
      ["IN DEPTH", "/readings/in-depth/"],
    ],
  );
});

test("the masthead's call to action still points at the readings index", () => {
  assert.equal(headerActions.cta.label, "GET MY READING");
  assert.equal(headerActions.cta.href, "/readings/");
  assert.equal(headerActions.account.label, "Sign in");
  assert.equal(headerActions.signOut.label, "Sign out");
  assert.equal(headerActions.bag.label, "Your bag");
});

test("the footer keeps all nine links, in order", () => {
  assert.deepEqual(
    footerNav.map((link) => [link.label, link.href]),
    [
      ["World Tarot", "/world-tarot/"],
      ["Living Tarot", "/living-tarot"],
      ["Readings", "/readings/"],
      ["Library", "/library/"],
      ["FAQ", "/faq"],
      ["Contact", "/contact"],
      ["Terms & Conditions", "/terms"],
      ["Privacy Policy", "/privacy"],
      ["Refund Policy", "/refunds"],
    ],
  );
});

test("the newsletter keeps every string a visitor can be shown", () => {
  assert.equal(newsletter.heading, "STAY CONNECTED:");
  assert.deepEqual(newsletter.blurb, [
    "Receive occasional reflections and",
    "readings from sacred places around the world.",
  ]);
  assert.equal(newsletter.submitLabel, "stay connected");
  assert.equal(newsletter.sendingLabel, "sending…");
  assert.equal(newsletter.sentLabel, "thank you");
  assert.deepEqual(newsletter.success, ["Thank you — we have your address."]);
  assert.equal(newsletter.errors.address, "That address was not accepted. Please check it and try again.");
  assert.equal(
    newsletter.errors["rate-limited"],
    "That was a few tries in quick succession. Please give it a minute.",
  );
  assert.equal(newsletter.errors.unknown, "We could not reach the list just now. Please try again.");
});

/*
  Written into `SiteFooter` and `NewsletterForm` until 11 September 2026, so a
  Spanish footer headed its social links and labelled both fields in English.
  The labels show at `lg` and above, beside fields whose placeholders were
  already translated.
*/
test("the footer's field labels and social heading are copy", () => {
  assert.equal(newsletter.firstNameLabel, "FIRST NAME:");
  assert.equal(newsletter.emailLabel, "EMAIL:");
  assert.equal(socialHeading, "FOLLOW THE JOURNEY:");
});

/*
  An href, an icon name and a social URL are structure, not copy, and must never
  reach a translator's file. This is the guard for the whole extraction, not
  just this module: if one crosses over, it crosses here first, because `site.ts`
  is the file where labels and addresses sit closest together.
*/
test("an href never becomes a translatable string", () => {
  for (const link of footerNav) {
    assert.ok(link.href.startsWith("/"), `${link.href} is not a path`);
  }

  for (const social of socialLinks) {
    assert.ok(social.href.startsWith("https://"), `${social.href} is not a URL`);
    assert.ok(social.icon.length > 0, "a social icon lost its name");
  }
});
