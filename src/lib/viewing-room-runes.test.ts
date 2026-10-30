import assert from "node:assert/strict";
import { test } from "node:test";

import {
  RUNE_GLYPHS,
  RUNE_OVERHANG,
  RUNE_PLACEMENTS,
  RUNE_VIEWBOX,
  cardRectInField,
  type RuneName,
  type RunePlacement,
} from "./viewing-room-runes.ts";

const NAMES: readonly RuneName[] = [
  "fehu", "uruz", "thurisaz", "ansuz", "raidho", "kaunan", "gebo", "wunjo",
  "hagalaz", "naudiz", "isa", "jera", "eihwaz", "perthro", "algiz", "sowilo",
  "tiwaz", "berkano", "ehwaz", "mannaz", "laguz", "ingwaz", "dagaz", "othala",
];

const NUM = "\\d+(?:\\.\\d+)?";
const PATH = new RegExp(`^(?:M|L) ${NUM} ${NUM}(?: (?:M|L) ${NUM} ${NUM})*$`);

const GUTTER_MARGIN = 2;
const EDGE_REACH = 4;

type Rect = ReturnType<typeof cardRectInField>;

const isGutter = (p: RunePlacement, c: Rect) =>
  p.x < c.left - GUTTER_MARGIN || p.x > c.right + GUTTER_MARGIN;
const isTopEdge = (p: RunePlacement, c: Rect) => Math.abs(p.y - c.top) <= EDGE_REACH;
const isBottomEdge = (p: RunePlacement, c: Rect) => Math.abs(p.y - c.bottom) <= EDGE_REACH;

/** Indices of entries that are neither gutter nor edge runes (wholly behind the card). */
function behindCard(table: readonly RunePlacement[]): number[] {
  const c = cardRectInField();
  const bad: number[] = [];
  table.forEach((p, i) => {
    if (!isGutter(p, c) && !isTopEdge(p, c) && !isBottomEdge(p, c)) bad.push(i);
  });
  return bad;
}

test("the viewBox is 12 by 20", () => {
  assert.deepEqual({ ...RUNE_VIEWBOX }, { width: 12, height: 20 });
});

test("the overhang is 0.45 across and 0.05 down", () => {
  assert.deepEqual({ ...RUNE_OVERHANG }, { x: 0.45, y: 0.05 });
});

test("there is a glyph for exactly the 24 runes", () => {
  assert.deepEqual(Object.keys(RUNE_GLYPHS).sort(), [...NAMES].sort());
});

for (const name of NAMES) {
  test(`glyph ${name} is straight strokes inside 12 by 20`, () => {
    const d = RUNE_GLYPHS[name];
    assert.equal(typeof d, "string", `${name} has no path`);
    assert.match(d, PATH, `${name} path is malformed: ${d}`);
    const nums = d.replace(/[ML]/g, "").trim().split(/\s+/).map(Number);
    nums.forEach((n, i) => {
      const [max, axis] = i % 2 === 0 ? [RUNE_VIEWBOX.width, "x"] : [RUNE_VIEWBOX.height, "y"];
      assert.ok(n >= 0 && n <= max, `${name} ${axis} ${n} is outside 0..${max}`);
    });
  });
}

test("the table has 24 to 32 entries", () => {
  assert.ok(RUNE_PLACEMENTS.length >= 24 && RUNE_PLACEMENTS.length <= 32);
});

test("every placement field is in range", () => {
  RUNE_PLACEMENTS.forEach((p, i) => {
    const at = `entry ${i} (${p.rune})`;
    assert.ok(NAMES.includes(p.rune), `${at}: unknown rune`);
    assert.ok(p.x >= 0 && p.x <= 100, `${at}: x ${p.x}`);
    assert.ok(p.y >= 0 && p.y <= 100, `${at}: y ${p.y}`);
    assert.ok(p.scale >= 0.6 && p.scale <= 1.4, `${at}: scale ${p.scale}`);
    assert.ok(p.rotate >= -25 && p.rotate <= 25, `${at}: rotate ${p.rotate}`);
    assert.ok(p.duration >= 3 && p.duration <= 7, `${at}: duration ${p.duration}`);
    assert.ok(p.delay <= 0 && p.delay > -p.duration, `${at}: delay ${p.delay}`);
  });
});

test("cardRectInField matches the current overhang", () => {
  const c = cardRectInField();
  assert.equal(c.left.toFixed(2), "23.68");
  assert.equal(c.right.toFixed(2), "76.32");
  assert.equal(c.top.toFixed(2), "4.55");
  assert.equal(c.bottom.toFixed(2), "95.45");
});

test("no rune sits wholly behind the card", () => {
  assert.deepEqual(behindCard(RUNE_PLACEMENTS), []);
});

test("at least 5 gutter runes each side, inside x 6..94", () => {
  const c = cardRectInField();
  const left = RUNE_PLACEMENTS.filter((p) => p.x < c.left - GUTTER_MARGIN);
  const right = RUNE_PLACEMENTS.filter((p) => p.x > c.right + GUTTER_MARGIN);
  assert.ok(left.length >= 5, `left gutter has ${left.length}`);
  assert.ok(right.length >= 5, `right gutter has ${right.length}`);
  for (const p of [...left, ...right]) {
    assert.ok(p.x >= 6 && p.x <= 94, `${p.rune} gutter x ${p.x} hugs the field edge`);
  }
});

test("at least 4 edge runes on top and 4 on the bottom, within the card span", () => {
  const c = cardRectInField();
  const inSpan = (p: RunePlacement) => p.x >= c.left && p.x <= c.right;
  const top = RUNE_PLACEMENTS.filter((p) => isTopEdge(p, c) && inSpan(p));
  const bottom = RUNE_PLACEMENTS.filter((p) => isBottomEdge(p, c) && inSpan(p));
  assert.ok(top.length >= 4, `top edge has ${top.length}`);
  assert.ok(bottom.length >= 4, `bottom edge has ${bottom.length}`);
});

test("no two centres are closer than 6 field-percent", () => {
  for (let i = 0; i < RUNE_PLACEMENTS.length; i++) {
    for (let j = i + 1; j < RUNE_PLACEMENTS.length; j++) {
      const a = RUNE_PLACEMENTS[i];
      const b = RUNE_PLACEMENTS[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      assert.ok(dist >= 6, `entries ${i} (${a.rune}) and ${j} (${b.rune}) are ${dist.toFixed(2)} apart`);
    }
  }
});

test("at least 16 distinct runes and 5 distinct durations", () => {
  assert.ok(new Set(RUNE_PLACEMENTS.map((p) => p.rune)).size >= 16);
  assert.ok(new Set(RUNE_PLACEMENTS.map((p) => p.duration)).size >= 5);
});

test("every delay is negative so runes start mid-cycle", () => {
  for (const p of RUNE_PLACEMENTS) assert.ok(p.delay < 0, `${p.rune} delay ${p.delay}`);
});

test("failure path: a rune moved behind the card is caught by the classifier", () => {
  const c = cardRectInField();
  const centreX = (c.left + c.right) / 2;
  const centreY = (c.top + c.bottom) / 2;
  const broken = RUNE_PLACEMENTS.map((p) => ({ ...p }));
  broken[0] = { ...broken[0], x: centreX, y: centreY };
  assert.deepEqual(behindCard(broken), [0]);
  assert.deepEqual(behindCard(RUNE_PLACEMENTS), []);
});
