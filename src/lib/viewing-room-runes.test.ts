import assert from "node:assert/strict";
import { test } from "node:test";

import {
  RUNE_FIELD_EXTENT,
  RUNE_GLYPHS,
  RUNE_PLACEMENTS,
  RUNE_VIEWBOX,
  cardEdgesInField,
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

// Conservative desktop card span (29..71% of viewport width): the "behind the card" band.
const GUTTER_LEFT = 26;
const GUTTER_RIGHT = 74;
const TOP_REACH = 3;
const BOTTOM_REACH = 4;

const isGutter = (p: RunePlacement) => p.x <= GUTTER_LEFT || p.x >= GUTTER_RIGHT;
const isTopEdge = (p: RunePlacement) => Math.abs(p.y - cardEdgesInField().top) <= TOP_REACH;
const isBottomEdge = (p: RunePlacement) => Math.abs(p.y - cardEdgesInField().bottom) <= BOTTOM_REACH;

/** Indices of entries that are neither gutter nor top-edge runes (wholly behind the card). */
function behindCard(table: readonly RunePlacement[]): number[] {
  const bad: number[] = [];
  table.forEach((p, i) => {
    if (!isGutter(p) && !isTopEdge(p)) bad.push(i);
  });
  return bad;
}

/** Indices of entries whose duration is outside 5..10 or whose delay is not in (-duration, 0). */
function badTiming(table: readonly RunePlacement[]): number[] {
  const bad: number[] = [];
  table.forEach((p, i) => {
    const durationOk = p.duration >= 5 && p.duration <= 10;
    const delayOk = p.delay < 0 && Math.abs(p.delay) < p.duration;
    if (!durationOk || !delayOk) bad.push(i);
  });
  return bad;
}

test("the viewBox is 12 by 20", () => {
  assert.deepEqual({ ...RUNE_VIEWBOX }, { width: 12, height: 20 });
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

test("the field starts 0.05 card-heights above the card and ends 0.08 above its bottom", () => {
  assert.deepEqual({ ...RUNE_FIELD_EXTENT }, { above: 0.05, inset: 0.08 });
});

test("cardEdgesInField puts the top near 5.15 and the bottom beyond the field at 108.25", () => {
  const e = cardEdgesInField();
  assert.equal(e.top.toFixed(2), "5.15");
  assert.equal(e.bottom.toFixed(2), "108.25");
  assert.ok(e.bottom > 100);
});

test("the table has exactly 56 entries", () => {
  assert.equal(RUNE_PLACEMENTS.length, 56);
});

test("every placement field is in range", () => {
  RUNE_PLACEMENTS.forEach((p, i) => {
    const at = `entry ${i} (${p.rune})`;
    assert.ok(NAMES.includes(p.rune), `${at}: unknown rune`);
    assert.ok(p.x >= 3 && p.x <= 97, `${at}: x ${p.x}`);
    assert.ok(p.y >= 2 && p.y <= 90, `${at}: y ${p.y}`);
    assert.ok(p.scale >= 0.6 && p.scale <= 1.4, `${at}: scale ${p.scale}`);
    assert.ok(p.rotate >= -25 && p.rotate <= 25, `${at}: rotate ${p.rotate}`);
  });
});

test("every duration is 5..10 and every delay is negative and shorter than its duration", () => {
  assert.deepEqual(badTiming(RUNE_PLACEMENTS), []);
});

test("at least 5 distinct durations", () => {
  assert.ok(new Set(RUNE_PLACEMENTS.map((p) => p.duration)).size >= 5);
});

test("all 24 rune names appear at least once", () => {
  const used = new Set(RUNE_PLACEMENTS.map((p) => p.rune));
  assert.ok(used.size >= 16);
  for (const n of NAMES) assert.ok(used.has(n), `${n} is never used`);
});

test("at least 8 gutter runes on each side", () => {
  const left = RUNE_PLACEMENTS.filter((p) => p.x <= GUTTER_LEFT);
  const right = RUNE_PLACEMENTS.filter((p) => p.x >= GUTTER_RIGHT);
  assert.ok(left.length >= 8, `left gutter has ${left.length}`);
  assert.ok(right.length >= 8, `right gutter has ${right.length}`);
});

test("at least 6 top-edge runes straddle the card top within x 15..85", () => {
  const top = RUNE_PLACEMENTS.filter((p) => isTopEdge(p) && p.x >= 15 && p.x <= 85);
  assert.ok(top.length >= 6, `top edge has ${top.length}`);
});

test("no rune sits wholly behind the card", () => {
  assert.deepEqual(behindCard(RUNE_PLACEMENTS), []);
});

test("nothing straddles the card's bottom edge", () => {
  const offenders = RUNE_PLACEMENTS.flatMap((p, i) => (isBottomEdge(p) ? [i] : []));
  assert.deepEqual(offenders, []);
});

test("no two centres are closer than 5 field-percent", () => {
  for (let i = 0; i < RUNE_PLACEMENTS.length; i++) {
    for (let j = i + 1; j < RUNE_PLACEMENTS.length; j++) {
      const a = RUNE_PLACEMENTS[i];
      const b = RUNE_PLACEMENTS[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      assert.ok(dist >= 5, `entries ${i} (${a.rune}) and ${j} (${b.rune}) are ${dist.toFixed(2)} apart`);
    }
  }
});

test("failure path: a rune moved behind the card is caught by the classifier", () => {
  const broken = RUNE_PLACEMENTS.map((p) => ({ ...p }));
  broken[0] = { ...broken[0], x: 50, y: 50 };
  assert.deepEqual(behindCard(broken), [0]);
  assert.deepEqual(behindCard(RUNE_PLACEMENTS), []);
});

test("failure path: a duration of 4 is caught by the timing check", () => {
  const broken = RUNE_PLACEMENTS.map((p) => ({ ...p }));
  broken[3] = { ...broken[3], duration: 4, delay: -1 };
  assert.deepEqual(badTiming(broken), [3]);
});

test("failure path: a delay equal to minus the duration is caught by the timing check", () => {
  const broken = RUNE_PLACEMENTS.map((p) => ({ ...p }));
  broken[5] = { ...broken[5], delay: -broken[5].duration };
  assert.deepEqual(badTiming(broken), [5]);
});

test("failure path: a delay of 0 is caught by the timing check", () => {
  const broken = RUNE_PLACEMENTS.map((p) => ({ ...p }));
  broken[2] = { ...broken[2], delay: 0 };
  assert.deepEqual(badTiming(broken), [2]);
});
