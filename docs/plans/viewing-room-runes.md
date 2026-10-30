> **Written 30 October 2026. Status: built, 30 October 2026.**

# Viewing Room runes

## Goal

Add a field of faint, pulsing Elder Futhark runes in the dark around the Viewing Room's film
player. Some sit in the side gutters, and some straddle the card's top and bottom edges so they
look as if they come out from behind it. The runes are hand-drawn inline SVG strokes in a static,
deterministic placement table, so every visit looks the same and there is no hydration mismatch.
They pulse with a CSS opacity keyframe and keep a static glow. Under `prefers-reduced-motion` they
stay still at mid opacity. Presentation only: no API, schema, auth or content change.

## Out of scope

- The `#000` base and `viewing-room-bg.webp` (`.page-atmosphere-viewing-room`): unchanged. Any
  change to the artwork goes through the client and the Figma frame.
- Runes on other pages, behind the carousel band or around the paywall panel: a follow-up plan if
  the client asks.
- Canvas, a rune font, Figma-exported artwork, or randomised or drifting placement: rejected by
  the user (Option A chosen).
- `FilmPlayer`'s internals, including the stale "70dvh" comment above its width cap: leave as is.

## Acceptance criteria

All browser criteria are asserted in a new section of `scripts/check-viewing-room.mjs`
(`npm run build && npm run check:viewing-room`), as a member (`MEMBER`) unless stated otherwise.

1. **Runes render.** `[data-rune-field]` holds 24 to 32 `svg` children at every width in
   `[360, 390, 430, 768, 1024, 1280, 1920]`.
2. **They pulse.** With motion allowed, every rune's computed `animation-name` is `rune-pulse`,
   there are at least 4 distinct computed `animation-duration` values, and two `opacity` reads of
   the same rune 1.2 s apart differ for at least one rune.
3. **Some sit outside the card on desktop.** At 1280x900 and 1920x1080, at least 3 rune boxes
   lie wholly to the left of the player box and at least 3 wholly to the right, all inside the
   viewport. At least 2 rune boxes cross the player's top edge and at least 2 cross its bottom
   edge.
4. **Some sit outside the card on mobile.** At 360x800 and 390x844, at least 3 runes have a box
   that crosses the player's top or bottom edge, with its centre inside the viewport horizontally.
5. **No clash with the page's text.** At every width in criterion 1, no rune box intersects the
   `header` box (title and subtitle) or the carousel band (the full-width band that follows the
   player's `Container`).
6. **Never above the paywall.** Signed out (`meStatus: 401`) at 1280 and 360: remove the rune
    field's `inert` attribute, then set `pointer-events: auto` on the runes with a test-only style
    tag. `document.elementFromPoint` at every rune centre inside the viewport must return something
    that is not inside `[data-rune-field]`. A positive control raises `[data-rune-stage]` to
    z-index 40, above the veil (`z-20`) and `PaywallModal`'s fixed `z-30` wrapper.
7. **No horizontal scroll.** At every width in criterion 1,
   `documentElement.scrollWidth <= documentElement.clientWidth`.
8. **Reduced motion is static.** In a context with `reducedMotion: "reduce"`, every rune's
   computed `animation-name` is `none` and its computed `opacity` is `0.35`.
9. **Hidden from assistive tech and the pointer.** `[data-rune-field]` has `aria-hidden="true"`
   and computed `pointer-events: none`, and contains no focusable element.
10. **The player is unchanged.** The existing "the player is the card's shape" assertions still
    pass, and the new stage's width equals the player's width to within 1 px at every width.
11. **Deterministic.** The rune markup in `out/viewing-room/index.html` (the static export) is
    byte-identical across two builds, and the browser console shows no hydration warning on load.
12. `npm test`, `npm run lint` and `npm run build` pass. The new unit tests are in
    `src/lib/viewing-room-runes.test.ts`.

## Contract changes

None. No API, schema, event or backend contract changes. The only new shared type is internal to
this repo (below).

## Spec

**Files**

| File | Change |
|---|---|
| `src/lib/viewing-room-runes.ts` | New. Glyph paths, placement table, overhang constants, `cardRectInField()`. Pure TS, no React, so `npm test` can import it. |
| `src/lib/viewing-room-runes.test.ts` | New. Table invariants. |
| `src/components/viewing-room/RuneField.tsx` | New. Renders the table. |
| `src/app/globals.css` | `@keyframes rune-pulse`, `.rune-field__rune`, and a reduced-motion block, placed after `.pulse-glow:hover`. |
| `src/components/viewing-room/ViewingRoom.tsx` | A card-sized stage around the player, and `overflow-x-clip` on the `data-viewing-room` root. |
| `scripts/check-viewing-room.mjs` | New "Runes" section. |

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
  x: number;        // centre, % of field width, 0..100
  y: number;        // centre, % of field height, 0..100
  scale: number;    // 0.6..1.4, multiplies --rune-base
  rotate: number;   // degrees, -25..25
  delay: number;    // seconds, negative, |delay| < duration
  duration: number; // seconds, 3..7
};
export const RUNE_PLACEMENTS: readonly RunePlacement[]; // 24..32 entries

/** How far the field extends past the card, as fractions of the card's own box. */
export const RUNE_OVERHANG = { x: 0.45, y: 0.05 } as const;

/** The card's rectangle in field percentages, derived from RUNE_OVERHANG. */
export function cardRectInField(): { left: number; right: number; top: number; bottom: number };
```

With the overhang above, the card spans x 23.7 to 76.3 and y 4.5 to 95.5 in field percentages.

**Layout**

- **Stage.** The `relative mt-[…] w-full` block that holds the player gets a child
  `<div data-rune-stage className="relative isolate mx-auto w-full max-w-[min(100%,clamp(300px,42vw,640px),calc(86dvh*509/842))]">`,
  which wraps `<RuneField />` followed by the existing `FilmPlayer` / `PlayerPlaceholder` ternary.
  This is the third copy of the width cap, kept as a copy for the reason `PlayerPlaceholder`'s
  doc gives. Criterion 10 catches drift between the copies.
- **Field.** `RuneField` renders `<div aria-hidden data-rune-field className="pointer-events-none absolute -z-10">`
  with an inline style setting `left` and `right` to `-45%` and `top` and `bottom` to `-5%`,
  computed from `RUNE_OVERHANG` so the numbers live in one place. Because the stage is
  `isolate`, `-z-10` keeps the field under the player without touching `FilmPlayer`, and the
  field cannot escape above the paywall veil (`fixed z-20`).
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
explicit `animation: none` above makes the static state deliberate and testable (criterion 8).
`--color-champagne` (`#fff3d7`) and `--ease-veil` are existing tokens.

**Placement rules (enforced by the unit test)**

- Every entry is either a gutter rune (centre x < card left − 2, or x > card right + 2) or an edge
  rune (centre y within 4 of the card's top or bottom edge, so it straddles the edge). None sits
  wholly behind the card, where it would be invisible.
- Gutter runes: at least 5 on each side. Keep them at x ≥ 6 and x ≤ 94, so the inside half of
  the gutter on a 1280 screen is used and nothing hugs the field edge.
- Edge runes: at least 4 at the top and 4 at the bottom with x inside the card span. These are
  the ones a phone sees, because on a phone the gutters fall off-screen and are clipped.
- No two centres closer than 6 field-percent apart (Euclidean distance on x and y).
- At least 16 distinct rune names. Durations take at least 5 distinct values. Delays are negative,
  so the runes start mid-cycle rather than fading in together on load.

## Steps

### 1. Rune data module and its tests — shipped, 30 October 2026

- **Build:** `src/lib/viewing-room-runes.ts` as specified, with all 24 glyph paths and a 24 to 32
  entry placement table that follows the rules above.
- **Tests** (`src/lib/viewing-room-runes.test.ts`, `node:test` + `node:assert/strict`, importing
  `./viewing-room-runes.ts`):
  - Each glyph `d` matches `^(M|L) num num( (M|L) num num)*$`, with every coordinate inside
    0..12 by 0..20. One case per glyph, so a bad glyph names itself.
  - The table length is 24 to 32. Every field is in range (x, y 0..100; scale 0.6..1.4;
    rotate −25..25; duration 3..7; −duration < delay ≤ 0).
  - The gutter, edge, spacing and variety rules above, using `cardRectInField()`.
  - `cardRectInField()` returns 23.68 / 76.32 / 4.55 / 95.45 (to 2 dp) for the current overhang.
  - **Failure path:** a test-local copy of the table with one entry moved behind the card fails
    the classifier. This proves the rule bites and is not vacuous.
- **Verify:** `npm test`, `npm run lint`.
- **Risk:** glyphs drawn wrong. Each is 2 to 5 strokes. Compare against a reference chart, for
  example Wikipedia's "Elder Futhark", during step 2's visual check.
- **Repo:** theworldtarot-frontend.

### 2. `RuneField` component and its CSS — shipped, 30 October 2026

- **Build:** `src/components/viewing-room/RuneField.tsx` (no `"use client"` needed: no state or
  effects, and it renders inside a client tree either way), plus the CSS block above in
  `globals.css`. Add the `rune-field` class on the field root for `--rune-base`.
- **Tests:** `npm run lint`, `npm run build`. There is nothing to observe in a browser yet, by
  design. Keeping the styles in the same commit as the component that uses them means neither
  lands orphaned.
- **Risk:** inline `translate` and `rotate` style properties need current browsers, which this
  site already targets. Fallback: a combined `transform` string.
- **Repo:** theworldtarot-frontend.

### 3. Mount the field around the player — shipped, 30 October 2026

- **Build:** in `ViewingRoom.tsx`, add the `data-rune-stage` wrapper with `<RuneField />` first,
  and add `overflow-x-clip` to the `data-viewing-room` root's `cn(...)`. Add a short comment that
  the stage copies the player's width cap.
- **Tests:** `npm run build && npm run check:viewing-room`, where every existing assertion still
  passes (card shape at 7 widths, 360 px no horizontal scroll, paywall states, deck states). Then
  look at the page by hand: `npm run dev`, `/viewing-room?state=member` at 1280 and 360,
  `?state=signed-out` with the veil over the runes, and the deck-loading placeholder with the
  runes around it.
- **Risk:** the vertical overhang reaches the header or the carousel band on a short or narrow
  viewport (5% of the card is about 25 px at 360, against a 32 px gap above the band). If
  step 4's criterion 5 fails at any width, lower `RUNE_OVERHANG.y` and re-run step 1's tests.
  Do not move the page's margins.
- **Risk:** `isolate` on the stage changes nothing inside `FilmPlayer`, which uses no blend
  modes. Confirm the play and replay controls still sit above everything.
- **Repo:** theworldtarot-frontend.

### 4. Browser assertions for the runes — shipped, 30 October 2026

- **Build:** a `console.log("\nRunes:")` section in `scripts/check-viewing-room.mjs`, reusing
  `openRoom`, `answerFor` and `expect`. It covers criteria 1 to 10: the widths loop, the desktop
  and phone edge counts, the header and band intersection, the signed-out `elementFromPoint` probe
  with an injected `pointer-events: auto` style, the `reducedMotion: "reduce"` context, the
  `aria-hidden` and focusable checks, and the stage width against the player width.
- **Tests:** the section covers criteria 1 to 10. The browser section was written after
  implementation; the outcomes for the clipping and stacking checks are in Build notes below.
- **Risk:** flaky opacity sampling (criterion 2). Read after `waitForTimeout(600)`, then again
  1.2 s later, across all runes. With at least 5 durations, at least one value always changes.
- **Repo:** theworldtarot-frontend.

### 5. Mark the plan built — shipped, 30 October 2026

- **Build:** set this banner to "built" with the date, and add one line under *What phase two
  was* in `docs/plans/viewing-room.md` pointing to this plan.
- **Tests:** none (docs).
- **Repo:** theworldtarot-frontend.

## Build notes

- The step 4 browser section was written after implementation, not before.
- Removing root `overflow-x-clip` caused no assertion failure: `html` and `body` already clip
  horizontally, so criterion 7 cannot discriminate it; the class stays as belt-and-braces. Removing
  `-z-10` also fails nothing, as predicted: the player follows RuneField in DOM order.
- Criterion 6's probe removes `inert`; its positive control raises `[data-rune-stage]` to z-index
  40, above the veil (`z-20`) and `PaywallModal`'s fixed `z-30` wrapper.
- Criterion 11 compares the rune-field markup across two builds (byte-identical), since whole-page
  HTML differs by build hashes. No hydration warning appeared in the console.
- Local build verification needs `NEXT_PUBLIC_API_BASE_URL=http://localhost:9 ALLOW_LOCAL_API_BUILD=1 npm run build`.
- Client review remains open: peak brightness 0.7 and density 24–32 (28 runes here).

### Sub-decisions made here

- Placement and glyph data live in `src/lib/`, because the test glob is `src/**/*.test.ts` and
  cannot render TSX.
- The browser checks go in the existing `check:viewing-room` script rather than a new
  `check:runes`. It already fakes the API, loops the same widths and checks horizontal scroll at
  360.
- A card-sized stage with percentage overhangs, rather than negative insets on the full-width
  block. The full-width block is the container's width, so its insets would not track the card.
- `-z-10` inside an `isolate` stage, rather than `z-0` plus `z-10` on `FilmPlayer`. This keeps
  `FilmPlayer` untouched.
- Rune size is `clamp(14px, 1.6vw, 28px)` × scale, not a percentage of the field. A percentage
  made phone runes about 14 px or smaller.
- Opacity is 0.12 ↔ 0.7 pulsing and 0.35 static. The colour is champagne with a static gold
  drop-shadow. All are tunable after review.

## Open questions

None block the build. One client question remains: are the peak brightness (0.7) and density
(24–32, currently 28 runes) right, or should the runes be quieter? Changing them is a one-line edit
to the table or the CSS.
