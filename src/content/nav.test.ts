import assert from "node:assert/strict";
import { test } from "node:test";

import { majorArcanaNav, suits } from "./library.ts";
import { primaryNav } from "./site.ts";

const library = primaryNav.find((item) => item.label === "LIBRARY");

test("LIBRARY is a navigation group", () => {
  assert.ok(library && "children" in library, "LIBRARY has no dropdown");
});

test("LIBRARY's label still goes to the Library itself", () => {
  assert.equal(library?.href, "/library/");
});

test("the dropdown lists the grid and all four suits", () => {
  assert.ok(library && "children" in library);

  assert.deepEqual(
    library.children.map((child) => child.href),
    [majorArcanaNav.href, ...suits.map((suit) => suit.href)],
  );
});

test("the dropdown's first row is the grid, not a second LIBRARY", () => {
  /*
    The client asked for a redundant link to the Library in the dropdown.
    `site.ts` records that READINGS *dropped* its OVERVIEW child because the
    group's label already goes there, so this row is labelled for what it points
    at — the Major Arcana grid — rather than repeating the label above it.
  */
  assert.ok(library && "children" in library);
  assert.equal(library.children[0].label, "MAJOR ARCANA");
});

test("every dropdown row carries its trailing slash", () => {
  /*
    `trailingSlash: true` in next.config.mjs, so a built route linked without
    one costs a 308 on the way. Every row here points at a route that exists.
  */
  assert.ok(library && "children" in library);

  for (const child of library.children) {
    assert.match(child.href, /\/$/, `${child.label} is missing its trailing slash`);
  }
});
