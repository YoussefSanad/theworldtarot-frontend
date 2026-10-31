> **Written 30 October 2026. Status: built, Round 2 shipped 31 October 2026.**

# Viewing Room runes

## Goal

Add a full-viewport-width field of 56 faint, pulsing Elder Futhark runes around the Viewing Room's
film player. Runes sit in the side gutters and along the card's top edge, on black and clear of the
lit floor. Nothing straddles the card's bottom edge. The hand-drawn inline SVG strokes use a static,
deterministic placement table, so every visit looks the same and there is no hydration mismatch.
They pulse with 5 to 10 second CSS opacity animations and keep a static glow. Under
`prefers-reduced-motion` they stay still at mid opacity. Presentation only: no API, schema, auth or
content change.

## Out of scope

- The `#000` base and `viewing-room-bg.webp` (`.page-atmosphere-viewing-room`): unchanged. Any
  change to the artwork goes through the client and the Figma frame.
- Runes on other pages, behind the carousel band or around the paywall panel: a follow-up plan if
  the client asks.
- Canvas, a rune font, Figma-exported artwork, or randomised or drifting placement: rejected by
  the user (Option A chosen).
- `FilmPlayer`'s internals, including the stale "70dvh" comment above its width cap: leave as is.

## Acceptance criteria

All browser criteria are asserted in the "Runes" section of `scripts/check-viewing-room.mjs`
(`npm run build && npm run check:viewing-room`), as a member (`MEMBER`) unless stated otherwise.

1. **Runes render.** `[data-rune-field]` holds exactly 56 `svg` children at every width in
   `[360, 390, 430, 768, 1024, 1280, 1920]`.
2. **They pulse.** With motion allowed, every rune's computed `animation-name` is `rune-pulse`,
   every duration is 5 to 10 s, there are at least 4 distinct computed durations, and two `opacity`
   reads of the same rune 1.2 s apart differ for at least one rune.
3. **They fill the viewport and stay above the floor.** The field's box starts within 2 px of the
   viewport's left edge and is within 2 px of its width. Every rune box is above the floor line,
   conservatively placed at artwork row 1098 of 2132 at the centre. No rune box crosses the
   player's bottom edge.
4. **They sit outside the card on desktop.** At 1280x900 and 1920x1080, at least 8 rune boxes lie
   wholly to the left of the player and at least 8 wholly to the right, all inside the viewport.
   At least 3 are in each far side of the viewport (outer 15%). At least 2 cross the player's top
   edge.
5. **They sit above the card on mobile.** At 360x800 and 390x844, at least 3 runes cross the
   player's top edge, with their centres inside the viewport horizontally.
6. **No clash with the page's text.** At every width in criterion 1, no rune box intersects the
   `header` box (title and subtitle) or the carousel band (the full-width band that follows the
   player's `Container`).
7. **Never above the paywall.** Signed out (`meStatus: 401`) at 1280 and 360: remove the rune
    field's `inert` attribute, then set `pointer-events: auto` on the runes with a test-only style
    tag. `document.elementFromPoint` at every rune centre inside the viewport must return something
    that is not inside `[data-rune-field]`. A positive control raises `[data-rune-stage]` to
    z-index 40, above the veil (`z-20`) and `PaywallModal`'s fixed `z-30` wrapper.
8. **No horizontal scroll.** At every width in criterion 1,
   `documentElement.scrollWidth <= documentElement.clientWidth`.
9. **Reduced motion is static.** In a context with `reducedMotion: "reduce"`, every rune's
   computed `animation-name` is `none` and its computed `opacity` is `0.35`.
10. **Hidden from assistive tech and the pointer.** `[data-rune-field]` has `aria-hidden="true"`
   and computed `pointer-events: none`, and contains no focusable element.
11. **The player is unchanged.** The existing "the player is the card's shape" assertions still
     pass, and the stage's width equals the player's width to within 1 px at every width.
12. **Deterministic.** The rune markup in `out/viewing-room/index.html` (the static export) is
     byte-identical across two builds, and the browser console shows no hydration warning on load.
13. `npm test`, `npm run lint` and `npm run build` pass. The unit tests are in
    `src/lib/viewing-room-runes.test.ts`.

## Contract changes

None. No API, schema, event or backend contract changes. The only new shared type is internal to
this repo (below).

## Spec

**Files**

| File | Change |
|---|---|
| `src/lib/viewing-room-runes.ts` | Glyph paths, the 56-entry placement table, field extent constants and `cardEdgesInField()`. Pure TS, no React, so `npm test` can import it. |
| `src/lib/viewing-room-runes.test.ts` | New. Table invariants. |
| `src/components/viewing-room/RuneField.tsx` | New. Renders the table. |
| `src/app/globals.css` | `@keyframes rune-pulse`, `.rune-field__rune`, and a reduced-motion block, placed after `.pulse-glow:hover`. |
| `src/components/viewing-room/ViewingRoom.tsx` | Card-sized stage around the player, and `overflow-x-clip` on the `data-viewing-room` root. |
| `scripts/check-viewing-room.mjs` | Updated "Runes" section. |

**Module shape (`src/lib/viewing-room-runes.ts`)**

```ts
export type RuneName =
  | "fehu" | "uruz" | "thurisaz" | "ansuz" | "raidho" | "kaunan" | "gebo" | "wunjo"
  | "hagalaz" | "naudiz" | "isa" | "jera" | "eihwaz" | "perthro" | "algiz" | "sowilo"
  | "tiwaz" | "berkano" | "ehwaz" | "mannaz" | "laguz" | "ingwaz" | "dagaz" | "othala";

/** viewBox "0 0 12 20". Straight strokes only: absolute M and L commands. */
export const RUNE_VIEWBOX = { width: 12, height: 20 } as const;
export const RUNE_GLYPHS: Readonly<Record<RuneName, string>>;

export type RunePlacement = {
  rune: RuneName;
  x: number;        // centre, % of field width, 3..97
  y: number;        // centre, % of field height, 2..90
  scale: number;    // 0.6..1.4, multiplies --rune-base
  rotate: number;   // degrees, -25..25
  delay: number;    // seconds, negative, |delay| < duration
  duration: number; // seconds, 5..10
};
export const RUNE_PLACEMENTS: readonly RunePlacement[]; // exactly 56 entries

/** Field extent above the card and inset from its bottom, in card heights. */
export const RUNE_FIELD_EXTENT = { above: 0.05, inset: 0.08 } as const;

/** The card's vertical edges in field percentages. */
export function cardEdgesInField(): { top: number; bottom: number };
```

The field is 100vw wide, centred on the viewport. It begins 5% of the card height above the card
top and ends 8% of the card height above its bottom. `cardEdgesInField()` reports the top and
bottom in field percentages; the card's horizontal span is viewport-dependent. Rune centres have
`y <= 90` so they stay on black and above the floor.

**Layout**

- **Stage.** The `relative mt-[…] w-full` block that holds the player gets a child
  `<div data-rune-stage className="relative isolate mx-auto w-full max-w-[min(100%,clamp(300px,42vw,640px),calc(86dvh*509/842))]">`,
  which wraps `<RuneField />` followed by the existing `FilmPlayer` / `PlayerPlaceholder` ternary.
  This is the third copy of the width cap, kept as a copy for the reason `PlayerPlaceholder`'s
  doc gives. Criterion 11 catches drift between the copies.
- **Field.** `RuneField` renders `<div aria-hidden data-rune-field className="rune-field pointer-events-none absolute -z-10">`
  with `left: 50%`, `width: 100vw`, `translate: -50% 0`, `top: -5%` and `bottom: 8%`. The
  vertical insets come from `RUNE_FIELD_EXTENT`; the horizontal span is the viewport, not a card
  overhang. Because the stage is `isolate`, `-z-10` keeps the field under the player without
  touching `FilmPlayer`, and the field cannot escape above the paywall veil (`fixed z-20`).
- **Rune.** Each rune is its own
  `<svg viewBox="0 0 12 20" className="rune-field__rune absolute">` with style `left: x%`,
  `top: y%`, `width: calc(var(--rune-base) * scale)`, `aspect-ratio: 12/20`,
  `translate: -50% -50%`, `rotate`, `--delay` and `--dur`. Inside is one
  `<path d=… fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />`.
  Key: index. A separate `svg` per rune keeps each opacity animation composited, which `<g>`
  children of a single SVG are not in every engine.
- **Clip.** Add `overflow-x-clip` to the `data-viewing-room` root (full-bleed, so nothing visible
  changes). Use `clip`, not `hidden`: `clip` does not turn the root into a scroll container or
  force `overflow-y`. Do not add a clip to `.page-atmosphere-viewing-room` (see its `--room-drop`
  comment).

**CSS (`globals.css`, after `.pulse-glow:hover`, in the same layer)**

```css
@keyframes rune-pulse {
  0%, 100% { opacity: 0.12; }
  50% { opacity: 0.7; }
}

.rune-field { --rune-base: clamp(14px, 1.6vw, 28px); }

.rune-field__rune {
  color: var(--color-champagne);
  filter: drop-shadow(0 0 4px rgba(223, 200, 148, 0.55)); /* static */
  opacity: 0.35;
  animation: rune-pulse var(--dur, 5s) var(--ease-veil) var(--delay, 0s) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .rune-field__rune { animation: none; opacity: 0.35; }
}
```

The global reduced-motion rule at the foot of the file only shortens animations to 0.01 ms. The
explicit `animation: none` above makes the static state deliberate and testable (criterion 9).
`--color-champagne` (`#fff3d7`) and `--ease-veil` are existing tokens.

**Placement rules (enforced by the unit test)**

- Table length is exactly 56. Coordinates are x 3..97 and y 2..90; scale is 0.6..1.4 and rotation
  is -25..25 degrees. Durations are 5..10 seconds with at least 5 distinct values; delays are
  negative and shorter than their duration.
- At least 8 gutter runes per side have x <= 26 or x >= 74. At least 6 top-edge runes are within
  3 field-percent of the card top and have x in 15..85. No rune is wholly hidden behind the card.
  Nothing straddles the card's bottom edge (within 4 field-percent of its bottom).
- All 24 rune names appear. No two rune centres are closer than 5 field-percent (Euclidean
  distance on x and y). The centres' y limit of 90 keeps the runes clear of the lit floor.

## Round 1 steps (shipped 30 October 2026)

These record the initial implementation. Round 2 below supersedes Round 1's count, duration,
field geometry, placement rules and browser criteria; the details here describe the initial state.

### 1. Rune data module and its tests: shipped, 30 October 2026

- **Build:** `src/lib/viewing-room-runes.ts` with all 24 glyph paths and the initial 24 to 32 entry
  placement table.
- **Tests** (`src/lib/viewing-room-runes.test.ts`, `node:test` + `node:assert/strict`, importing
  `./viewing-room-runes.ts`):
  - Each glyph `d` matches `^(M|L) num num( (M|L) num num)*$`, with every coordinate inside
    0..12 by 0..20. One case per glyph, so a bad glyph names itself.
  - Initially, the table length was 24 to 32, durations were 3..7, and positions used
    `cardRectInField()` and the Round 1 placement rules.
  - **Failure path:** a test-local copy of the table with one entry moved behind the card fails
    the classifier. This proves the rule bites and is not vacuous.
- **Verify:** `npm test`, `npm run lint`.
- **Risk:** glyphs drawn wrong. Each is 2 to 5 strokes. Compare against a reference chart, for
  example Wikipedia's "Elder Futhark", during step 2's visual check.
- **Repo:** theworldtarot-frontend.

### 2. `RuneField` component and its CSS: shipped, 30 October 2026

- **Build:** `src/components/viewing-room/RuneField.tsx` (no `"use client"` needed: no state or
  effects, and it renders inside a client tree either way), plus the CSS block above in
  `globals.css`. Add the `rune-field` class on the field root for `--rune-base`.
- **Tests:** `npm run lint`, `npm run build`. There is nothing to observe in a browser yet, by
  design. Keeping the styles in the same commit as the component that uses them means neither
  lands orphaned.
- **Risk:** inline `translate` and `rotate` style properties need current browsers, which this
  site already targets. Fallback: a combined `transform` string.
- **Repo:** theworldtarot-frontend.

### 3. Mount the field around the player: shipped, 30 October 2026

- **Build:** in `ViewingRoom.tsx`, add the `data-rune-stage` wrapper with `<RuneField />` first,
  and add `overflow-x-clip` to the `data-viewing-room` root's `cn(...)`. Add a short comment that
  the stage copies the player's width cap.
- **Tests:** `npm run build && npm run check:viewing-room`, where every existing assertion still
  passes (card shape at 7 widths, 360 px no horizontal scroll, paywall states, deck states). Then
  look at the page by hand: `npm run dev`, `/viewing-room?state=member` at 1280 and 360,
  `?state=signed-out` with the veil over the runes, and the deck-loading placeholder with the
  runes around it.
- **Round 1 risk:** the initial vertical overhang could reach the header or carousel band on a
  short or narrow viewport. Round 2's floor and overlap assertions now check the full-bleed field;
  the old `RUNE_OVERHANG.y` adjustment no longer applies.
- **Risk:** `isolate` on the stage changes nothing inside `FilmPlayer`, which uses no blend
  modes. Confirm the play and replay controls still sit above everything.
- **Repo:** theworldtarot-frontend.

### 4. Browser assertions for the runes: shipped, 30 October 2026

- **Build:** a `console.log("\nRunes:")` section in `scripts/check-viewing-room.mjs`, reusing
  `openRoom`, `answerFor` and `expect`. In Round 1 it covered the widths loop, desktop and phone
  edge counts, the header and band intersection, the signed-out `elementFromPoint` probe
  with an injected `pointer-events: auto` style, the `reducedMotion: "reduce"` context, the
  `aria-hidden` and focusable checks, and the stage width against the player width.
- **Tests:** the initial browser section was written after implementation; Round 2 additions are
  listed below. The outcomes for the clipping and stacking checks are in Build notes below.
- **Risk:** flaky opacity sampling (criterion 2). Read after `waitForTimeout(600)`, then again
  1.2 s later, across all runes. With at least 5 durations, at least one value always changes.
- **Repo:** theworldtarot-frontend.

### 5. Mark the plan built: shipped, 30 October 2026

- **Build:** set this banner to "built" with the date, and add one line under *What phase two
  was* in `docs/plans/viewing-room.md` pointing to this plan.
- **Tests:** none (docs).
- **Repo:** theworldtarot-frontend.

## Round 2 (built, 31 October 2026)

### 1. Data and unit rules: shipped, 31 October 2026

- **Build:** replaced the 24 to 32 placements with exactly 56 as requested, and changed durations
  from 3..7 to 5..10 seconds. Replaced `RUNE_OVERHANG` and `cardRectInField()` with
  `RUNE_FIELD_EXTENT = { above: 0.05, inset: 0.08 }` and `cardEdgesInField()`.
- **Rules:** x 3..97, y 2..90, scale 0.6..1.4, rotation -25..25, at least 5 distinct durations,
  and negative delays shorter than their duration. Require at least 8 gutter runes per side
  (x <= 26 or x >= 74), at least 6 top-edge runes within 3 field-percent of the card top at x
  15..85, no rune wholly behind the card, and no rune within 4 field-percent of the card's bottom.
  All 24 rune names appear, and rune centres remain at least 5 field-percent apart.
- **Why:** the 5 field-percent spacing threshold is tighter than Round 1's 6 to fit 56 runes;
  the revised placement rules keep the denser table on the gutters and top edge.

### 2. Full-bleed field and floor clearance: shipped, 31 October 2026

- **Build:** the field spans 100vw, centred on the viewport, rather than the card width plus or
  minus 45%. Its top is 5% of a card height above the card top, and its bottom is 8% of a card
  height above the card bottom. No rune straddles or sits at the card's bottom edge.
- **Clearance:** runes stay on black and clear of the lit floor. The conservative floor edge is
  artwork row 1098 of 2132 at the centre; every rune centre has y <= 90% of the field.
- **Deviation:** `ViewingRoom.tsx` and its existing card-sized stage did not need changes. The
  full-bleed geometry is implemented in `RuneField.tsx` relative to that stage.

### 3. Browser checks: shipped, 31 October 2026

- **Build:** updated `scripts/check-viewing-room.mjs` to assert exactly 56 runes, a field spanning
  the viewport, every rune above the floor, zero bottom-edge crossings, and 5 to 10 second
  durations. Desktop checks require at least 8 runes on each side and at least 3 in each far 15%
  of the viewport. The top-edge checks require at least 2 desktop crossings and at least 3 phone
  crossings. Existing paywall, reduced-motion, accessibility, overlap, determinism and player
  checks remain.

## Build notes

- The step 4 browser section was written after implementation, not before.
- Removing root `overflow-x-clip` caused no assertion failure: `html` and `body` already clip
  horizontally, so criterion 8 cannot discriminate it; the class stays as belt-and-braces. Removing
  `-z-10` also fails nothing, as predicted: the player follows RuneField in DOM order.
- The paywall probe removes `inert`; its positive control raises `[data-rune-stage]` to z-index
  40, above the veil (`z-20`) and `PaywallModal`'s fixed `z-30` wrapper.
- The deterministic check compares rune-field markup across two builds (byte-identical), since whole-page
  HTML differs by build hashes. No hydration warning appeared in the console.
- Local build verification needs `NEXT_PUBLIC_API_BASE_URL=http://localhost:9 ALLOW_LOCAL_API_BUILD=1 npm run build`.
- Client review remains open: peak brightness (0.7, with keyframes from 0.12 to 0.7 and reduced
  motion resting at 0.35) and rune size have not been judged. Density is set to 56 for Round 2.

### Sub-decisions made here

- Placement and glyph data live in `src/lib/`, because the test glob is `src/**/*.test.ts` and
  cannot render TSX.
- The browser checks go in the existing `check:viewing-room` script rather than a new
  `check:runes`. It already fakes the API, loops the same widths and checks horizontal scroll at
  360.
- ~~A card-sized stage with percentage overhangs, rather than negative insets on the full-width
  block. The full-width block is the container's width, so its insets would not track the card.~~
  Reversed 31 October 2026: the field now spans 100vw, with vertical extent tied to card height.
- `-z-10` inside an `isolate` stage, rather than `z-0` plus `z-10` on `FilmPlayer`. This keeps
  `FilmPlayer` untouched.
- Rune size is `clamp(14px, 1.6vw, 28px)` × scale, not a percentage of the field. A percentage
  made phone runes about 14 px or smaller.
- Opacity is 0.12 ↔ 0.7 pulsing and 0.35 static. The colour is champagne with a static gold
  drop-shadow. All are tunable after review.

## Open questions

None block the build. Client review remains open on whether peak brightness (keyframes 0.12 to 0.7;
reduced-motion opacity 0.35) and rune size are right. Neither brightness nor size has been judged.
