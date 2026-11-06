# Remaining Major Arcana Reference Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship reference pages for the twenty-one Major Arcana cards beyond The Fool, from the client's `LIBRARY PACKETS` assets and her `LIBRARY CARDS CONTENT 1.xls` copy.

**Architecture:** The page template already takes one content object per card and falls back to `ComingSoonPage` without one, so the React work is small. The bulk is a new asset pipeline (`scripts/optimize-packet-assets.mjs`) that dedupes twenty-nine shared symbols, tints them off black, normalizes twenty-one parchment sheets to one width, and trims twenty-one shadow panels to their content bounds. Two assets vary per card — the parchment and the shadow — so `lib/assets.ts` grows a per-card lookup beside the existing shared `cardReference` map.

**Tech Stack:** Next.js 16 (static export, `images.unoptimized`), React 19, TypeScript, Tailwind v4 (`@theme` tokens), `sharp` for asset conversion, `xlrd` via Python for the one-off content import, `node --test` for tests.

**Spec:** [`docs/plans/major-arcana-remaining-cards.md`](major-arcana-remaining-cards.md)

## Global Constraints

- **Card copy is transcribed verbatim.** Do not fix `SOVREIGNTY`, `fufillment`, The Magician's duplicated shadow text, or the Wheel/Hermit shared quote. This overrides the "fix outright misspellings" rule `library.ts` records for The Fool.
- **Card *names* in `library.ts` are exempt** from the above and do not change: `Judgement` stays `Judgement`, `The Hermit` stays `The Hermit`.
- **The Fool keeps its existing `the unkown` → "the unknown" correction.** It is the only non-verbatim page.
- **URL suffix is `-tarot-meaning`** for all twenty-two, replacing `-tarot-card-meaning`.
- **Slugs are derived from `card.slug`**, never taken from the sheet's slug column.
- **Panel fill is opaque `rgb(56,56,56)`** for all twenty-two shadow panels.
- **Shadow panels are trimmed to content bounds, never scaled.**
- **Parchment normalizes to 1337px wide**, the existing `--container-card-paper`, so the Fool's geometry and CSS are unchanged.
- **Symbols are tinted to `rgb(120,115,105)`**, matching the shipped Fool symbols.
- Every asset written by a script must have a declared width; a source with no entry throws rather than shipping at its own size (the rule `optimize-card-assets.mjs` already sets).
- Tests run with `npm test` (`node --test "src/**/*.test.ts"`). Test files import with an explicit `.ts` extension, as `card-path.test.ts` does.
- Follow `src/app/README.md`: no absolute positioning for layout, Figma numerics converted to the fluid clamp scale.

## Review Focus

Six conditions the spec implies that no task's happy path exercises. Each has a test pinned to the task that owns the code.

1. **A packet folder gains or loses a card** — the pipeline hard-codes twenty-one names; a twenty-second folder or a renamed one should throw, not be silently skipped. *(Task 2)*
2. **An icon stops being byte-identical across packets** — the dedupe assumes it; a re-delivered `FIRE.png` that differs in one folder would silently take whichever sorted first. *(Task 2)*
3. **A parchment sheet's detected bounds are implausible** — white-keying on a card whose art runs to the canvas edge would yield a full-frame "sheet" and ship a mis-cropped page. *(Task 3)*
4. **A card's content object is missing a meta symbol the sheet names** — `moon.png` must resolve to a real tinted asset; a typo in the sheet would otherwise emit a broken `src` that only shows as a missing image in the browser. *(Task 6)*
5. **`shadow` arrives with two strings instead of three** — most cards' bullets are one line, not the Fool's two, and `ShadowPanel` must render either without assuming a count. *(Task 5)*
6. **Her sheet carries two invisible separator characters** — U+2028 breaks eighteen of the twenty-one essays into paragraphs (a newline split alone silently collapses them into one), and U+00B7 is a second bullet glyph mixed with U+2022 in fifty-seven places. Both are invisible in an editor and would ship as a wall of text or two mismatched dots. *(Task 6)*

---

## File Structure

**Created:**
- `scripts/optimize-packet-assets.mjs` — the packet pipeline: symbols, parchments, shadows.
- `scripts/import-card-content.mjs` — one-off `.xls` → TypeScript emitter. Committed for re-runs, not part of the build.
- `src/content/card-content.test.ts` — asserts the twenty-two content objects are well-formed.
- `public/figma/card-reference/symbols/*.webp` — twenty-nine tinted shared symbols.
- `public/figma/card-reference/paper/<slug>-{top,mid,bottom}.webp` — sixty-three parchment slices.
- `public/figma/card-reference/shadows/<slug>.webp` — twenty-two shadow panels.

**Modified:**
- `src/lib/assets.ts` — add `cardSymbols`, `cardPaper`, `cardShadows`; drop `shadowSilhouette`.
- `src/content/card-content.ts` — twenty-one new content objects.
- `src/content/library.ts` — `CARD_SUFFIX`, `CARD_PATH_PATTERN`, `content:` on twenty-one cards.
- `src/content/card-path.test.ts` — one fixture string.
- `src/components/library/card/ShadowPanel.tsx` — one image instead of two, art via prop.
- `src/components/library/card/CardReferencePage.tsx` — pass card art to `ShadowPanel`, set the paper variable.
- `src/app/globals.css` — `.card-paper` reads its slices from custom properties.
- `src/components/library/card/README.md`, `src/content/README.md` — update the "only The Fool" claims and the URL.

---

## Task 1: Move the URL suffix to `-tarot-meaning`

Smallest independent change, and it touches a file every later task also edits — doing it first avoids conflicts.

**Files:**
- Modify: `src/content/library.ts:129` (`CARD_SUFFIX`), `:138` (`CARD_PATH_PATTERN`), and the comments at `:106` and `:123`
- Test: `src/content/card-path.test.ts:42`

**Interfaces:**
- Consumes: nothing.
- Produces: `CARD_SUFFIX = "-tarot-meaning"`; `cardPath(card)` returns `/library/<slug>-tarot-meaning/`. Every later task that quotes a card URL uses this form.

- [ ] **Step 1: Update the test fixture to the new suffix**

In `src/content/card-path.test.ts`, change the unknown-card fixture:

```ts
test("an unknown card is not found", () => {
  assert.equal(findMajorArcanaByPath("the-nonesuch-tarot-meaning"), undefined);
});
```

Add a test pinning the suffix itself, so the constant cannot drift silently:

```ts
test("card paths use the client's -tarot-meaning suffix", () => {
  assert.equal(cardPath(majorArcana[0]), "/library/the-fool-tarot-meaning/");
});
```

- [ ] **Step 2: Run the tests to verify the new one fails**

Run: `npm test`
Expected: FAIL — `the-fool-tarot-card-meaning` !== `the-fool-tarot-meaning`.

- [ ] **Step 3: Change the constant and the pattern**

In `src/content/library.ts`:

```ts
const CARD_SUFFIX = "-tarot-meaning";
```

```ts
export const CARD_PATH_PATTERN = /^\/library\/[a-z]+(?:-[a-z]+)*-tarot-meaning\/$/;
```

- [ ] **Step 4: Update the two comments that quote the old URL**

At `:106` and `:123` in the same file, replace `-tarot-card-meaning` with `-tarot-meaning` and `/library/the-fool-tarot-card-meaning/` with `/library/the-fool-tarot-meaning/`. The prose around them ("the phrase 'tarot card meaning'") becomes "the phrase 'tarot meaning'".

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests.

- [ ] **Step 6: Update the two docs that quote the old URL**

`src/components/library/card/README.md:28` and `docs/plans/card-content-backend-readiness.md:109`: replace `the-fool-tarot-card-meaning` with `the-fool-tarot-meaning`.

- [ ] **Step 7: Commit**

```bash
git add src/content/library.ts src/content/card-path.test.ts src/components/library/card/README.md docs/plans/card-content-backend-readiness.md
git commit -m "refactor(library): move card URLs to the client's -tarot-meaning suffix"
```

---

## Task 2: Dedupe and tint the twenty-nine shared symbols

**Files:**
- Create: `scripts/optimize-packet-assets.mjs`
- Modify: `package.json` (add the `assets:packets` script)

**Interfaces:**
- Consumes: nothing.
- Produces: `public/figma/card-reference/symbols/<name>.webp` for twenty-nine lowercase names — the four elements (`air`, `earth`, `fire`, `water`), twelve signs (`aquarius`, `aries`, `cancer`, `capricorn`, `gemini`, `leo`, `libra`, `pisces`, `sagittarius`, `scorpio`, `taurus`, `virgo`), ten planets (`jupiter`, `mars`, `mercury`, `moon`, `neptune`, `pluto`, `saturn`, `sun`, `uranus`, `venus`), and three verdicts (`yes`, `no`, `maybe`). Task 4 declares these in `lib/assets.ts`; Task 6 references them by these names.

- [ ] **Step 1: Create the script with its header, source constants, and the packet roster**

Create `scripts/optimize-packet-assets.mjs`:

```js
/**
 * Re-encodes the client's `LIBRARY PACKETS` delivery for the web.
 *
 * The companion to `optimize-card-assets.mjs`, which does the same job for the
 * single PSD The Fool's page was built from. They are separate because the
 * sources are shaped differently: that one reads a flat folder of her PSD layer
 * exports, this one reads twenty-one per-card folders with a different dedupe
 * story and a tint step of its own.
 *
 * **Her icons are byte-identical across every packet** — measured by hash, all
 * twenty-nine of them — so they are a shared library she copied into each
 * folder rather than per-card art, and they are written once.
 *
 * **They also arrive as pure black silhouette masks** (`rgb(0,0,0)`), where the
 * page draws them grey-taupe. That is the same trap `optimize-card-assets.mjs`
 * documents about Figma's `rawImages`, except here it is her own export that is
 * untinted, so the tint happens below rather than in the source.
 *
 *   node scripts/optimize-packet-assets.mjs
 */

import { mkdir, readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE = resolve(root, "..", "asset dump", "LIBRARY PACKETS");
const DEST = join(root, "public", "figma", "card-reference");

/**
 * Her folder names, mapped to the slugs `content/library.ts` uses.
 *
 * **The Magician is in `REVISED MAGICIAN TEST PACK`**, not a numbered folder,
 * so it sorts after `21` in a listing and is easy to miss entirely.
 *
 * Her numbering and spacing are inconsistent (`12- The Hangman` has no space
 * before the dash) and are recorded here exactly rather than parsed.
 */
const PACKETS = {
  "REVISED MAGICIAN TEST PACK": "the-magician",
  "02 - The High Priestess": "the-high-priestess",
  "03 - The Empress": "the-empress",
  "04 - The Emperor": "the-emperor",
  "05 - The High Priest": "the-high-priest",
  "06 - The Lovers": "the-lovers",
  "07 - The Chariot": "the-chariot",
  "08 - Strength": "strength",
  "09 - The Hermit": "the-hermit",
  "10 - The Wheel": "the-wheel",
  "11 - Justice": "justice",
  "12- The Hangman": "the-hangman",
  "13 - Death": "death",
  "14 - Temperance": "temperance",
  "15 - The Devil": "the-devil",
  "16 - The Tower": "the-tower",
  "17 - The Star": "the-star",
  "18 - The Moon": "the-moon",
  "19 - The Sun": "the-sun",
  "20 - Judgement": "judgement",
  "21 - The World": "the-world",
};

/** The grey-taupe the page draws her black masks in, sampled off the shipped Fool symbols. */
const SYMBOL_TINT = { r: 120, g: 115, b: 105 };

/**
 * The width each symbol is written at — 2x the width the meta strip draws it,
 * so it stays sharp on a retina display and no larger. A source with no entry
 * throws rather than shipping at its own size, the rule
 * `optimize-card-assets.mjs` sets for the same reason.
 */
const SYMBOL_WIDTHS = {
  air: 116, earth: 116, fire: 116, water: 116,
  aquarius: 102, aries: 116, cancer: 116, capricorn: 96, gemini: 116,
  leo: 90, libra: 116, pisces: 116, sagittarius: 116, scorpio: 116,
  taurus: 116, virgo: 116,
  jupiter: 68, mars: 116, mercury: 76, moon: 116, neptune: 116,
  pluto: 74, saturn: 78, sun: 116, uranus: 76, venus: 76,
  yes: 116, no: 116, maybe: 116,
};
```

- [ ] **Step 2: Add the packet-roster guard**

Append to the same file. This is Review Focus item 1 — a folder appearing or disappearing must throw rather than be skipped.

```js
/**
 * **The roster is asserted, not discovered.** A re-delivery that adds, removes
 * or renames a folder should stop the run rather than silently ship twenty
 * cards where there were twenty-one, which is the failure a directory scan
 * would hide.
 */
async function readPackets() {
  const found = (await readdir(SOURCE, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const expected = Object.keys(PACKETS).sort();

  const missing = expected.filter((name) => !found.includes(name));
  const extra = found.filter((name) => !expected.includes(name));

  if (missing.length || extra.length) {
    throw new Error(
      `Packet roster changed. Missing: ${missing.join(", ") || "none"}. ` +
        `Unexpected: ${extra.join(", ") || "none"}. Update PACKETS in this script.`,
    );
  }

  return expected;
}
```

- [ ] **Step 3: Add the symbol dedupe with its byte-identity assertion**

Append. This is Review Focus item 2.

```js
/**
 * The icons, deduped across every packet.
 *
 * **Byte-identity is asserted rather than trusted.** It was measured once and
 * held for all twenty-nine, but a re-delivery that changes one folder's copy
 * would otherwise silently ship whichever sorted first.
 */
async function collectSymbols(packets) {
  const byName = new Map();

  for (const folder of packets) {
    for (const file of await readdir(join(SOURCE, folder))) {
      if (!/\.png$/i.test(file)) continue;
      if (/BKGRND|BACKGROUND|^shadow|^SECTION/i.test(file)) continue;

      const name = file.replace(/\.png$/i, "").toLowerCase();
      const path = join(SOURCE, folder, file);
      const hash = createHash("md5").update(await readFile(path)).digest("hex");

      const seen = byName.get(name);

      if (!seen) {
        byName.set(name, { path, hash });
        continue;
      }

      if (seen.hash !== hash) {
        throw new Error(
          `"${file}" differs between packets (${folder} vs the first one seen). ` +
            `The dedupe below assumes every copy is identical.`,
        );
      }
    }
  }

  return byName;
}
```

- [ ] **Step 4: Add the tint-and-write step**

Append.

```js
/**
 * **Tinted by recolouring, not by overlay.** Her masks are pure black with a
 * real alpha channel, so the glyph's own alpha is kept and only its colour is
 * replaced — a composited flat fill would square off the antialiased edges.
 */
async function writeSymbols(byName) {
  const dest = join(DEST, "symbols");
  await mkdir(dest, { recursive: true });

  let written = 0;
  let total = 0;

  for (const [name, { path }] of [...byName].sort()) {
    const width = SYMBOL_WIDTHS[name];

    if (!width) {
      throw new Error(`No width declared for symbol "${name}" — add it to SYMBOL_WIDTHS.`);
    }

    const source = sharp(path).resize({ width, withoutEnlargement: true });
    const { data, info } = await source.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    for (let i = 0; i < data.length; i += 4) {
      data[i] = SYMBOL_TINT.r;
      data[i + 1] = SYMBOL_TINT.g;
      data[i + 2] = SYMBOL_TINT.b;
    }

    const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .webp({ quality: 90 })
      .toFile(join(dest, `${name}.webp`));

    total += out.size;
    written += 1;
    console.log(
      `symbols/${name}`.padEnd(28) +
        `${String(out.width).padStart(5)}x${String(out.height).padEnd(5)} ${(out.size / 1024).toFixed(1).padStart(6)}kB`,
    );
  }

  return { written, total };
}
```

- [ ] **Step 5: Add the entry point**

Append. Later tasks extend this block rather than replacing it.

```js
const packets = await readPackets();
const symbols = await collectSymbols(packets);

if (symbols.size !== 29) {
  throw new Error(`Expected 29 distinct symbols across the packets, found ${symbols.size}.`);
}

const { written, total } = await writeSymbols(symbols);

console.log(`\n${written} assets, ${(total / 1024).toFixed(0)}kB total.`);
```

- [ ] **Step 6: Register the script**

In `package.json`, beside `assets:card`:

```json
"assets:packets": "node scripts/optimize-packet-assets.mjs",
```

- [ ] **Step 7: Run it and verify the output**

Run: `npm run assets:packets`
Expected: twenty-nine lines, each a `symbols/<name>` at its declared width, then a total. No throw.

Verify one is tinted rather than black:

```bash
node -e "const s=require('sharp');s('public/figma/card-reference/symbols/air.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true}).then(({data})=>{let r=0,n=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>200){r+=data[i];n++}console.log('avg red channel:',(r/n)|0,'(expect 120, not 0)')})"
```

Expected: `avg red channel: 120`.

- [ ] **Step 8: Commit**

```bash
git add scripts/optimize-packet-assets.mjs package.json public/figma/card-reference/symbols
git commit -m "feat(assets): dedupe and tint the packets' twenty-nine shared symbols"
```

---

## Task 3: Convert the twenty-one parchment sheets

**Files:**
- Modify: `scripts/optimize-packet-assets.mjs`

**Interfaces:**
- Consumes: `PACKETS`, `readPackets()`, `SOURCE`, `DEST` from Task 2.
- Produces: `public/figma/card-reference/paper/<slug>-top.webp`, `-mid.webp`, `-bottom.webp` for twenty-one slugs, each normalized to 1337px wide. Task 4 declares them; Task 7 points CSS at them.

- [ ] **Step 1: Add the bounds detector**

Append to `scripts/optimize-packet-assets.mjs`. This is Review Focus item 3.

```js
/** The width every sheet is normalized to — the Fool's own, so `.card-paper` is unchanged. */
const PAPER_WIDTH = 1337;

/**
 * The plausible range for a detected sheet, as a share of the 1920 canvas.
 *
 * Her twenty-one measure 1314..1466 wide. A detection that lands outside this
 * has found something other than the paper — most likely the whole canvas,
 * because a white-keyed card whose art bleeds to the edge has no margin to key
 * — and shipping that would put a mis-cropped page live. Throwing is the point.
 */
const PAPER_BOUNDS = { min: 1250, max: 1550 };

/**
 * The sheet's bounding box.
 *
 * **Two detection modes, because she delivered two kinds of file.** Nineteen
 * carry real transparency around the sheet; Temperance's and The Wheel's are
 * flattened onto opaque white. Measured, the white ones are just as usable —
 * their torn deckle is as ragged as the others' (7px and 30px of variation,
 * against 9px and 27px for two alpha sheets), the edge is a ~3px antialiased
 * ramp, and the paper's own tone (~190 luminance) sits far below any sensible
 * key threshold, so nothing of the paper is keyed away.
 *
 * A row or column counts as "the sheet" once half of it is solid, which ignores
 * the few stray pixels that defeat a naive `trim()`.
 */
async function sheetBounds(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;

  let keyed = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      keyed = true;
      break;
    }
  }

  const solid = (x, y) => {
    const i = (y * W + x) * 4;
    if (keyed) return data[i + 3] > 200;
    return !(data[i] >= 250 && data[i + 1] >= 250 && data[i + 2] >= 250);
  };

  const rowFilled = (y) => {
    let n = 0;
    for (let x = 0; x < W; x++) if (solid(x, y)) n++;
    return n / W;
  };

  const colFilled = (x) => {
    let n = 0;
    for (let y = 0; y < H; y++) if (solid(x, y)) n++;
    return n / H;
  };

  let top = 0;
  while (top < H && rowFilled(top) < 0.5) top++;
  let bottom = H - 1;
  while (bottom > top && rowFilled(bottom) < 0.5) bottom--;
  let left = 0;
  while (left < W && colFilled(left) < 0.5) left++;
  let right = W - 1;
  while (right > left && colFilled(right) < 0.5) right--;

  const width = right - left + 1;

  if (width < PAPER_BOUNDS.min || width > PAPER_BOUNDS.max) {
    throw new Error(
      `${path}: detected a ${width}px sheet (${keyed ? "alpha" : "white-keyed"}), ` +
        `outside the plausible ${PAPER_BOUNDS.min}..${PAPER_BOUNDS.max}. The detection found ` +
        `something other than the paper.`,
    );
  }

  return { left, top, width, height: bottom - top + 1, keyed };
}
```

- [ ] **Step 2: Add the deckle measurement**

Append.

```js
/**
 * How deep the torn edge runs at each end of an already-cropped sheet.
 *
 * Her tearing finishes within 5..13px depending on the card, where The Fool's
 * was a flat 24 — so the slice depth is measured rather than assumed, or a
 * sheet with a shallow deckle would have clean paper cut into its edge strip
 * and stretched.
 *
 * The scan walks inward until a row is ~fully solid, then adds a pixel of
 * margin so the strip ends inside the first clean row rather than exactly on it.
 */
async function deckleDepth(buffer, keyed) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;

  const solid = (x, y) => {
    const i = (y * W + x) * 4;
    if (keyed) return data[i + 3] > 200;
    return !(data[i] >= 250 && data[i + 1] >= 250 && data[i + 2] >= 250);
  };

  const rowFilled = (y) => {
    let n = 0;
    for (let x = 0; x < W; x++) if (solid(x, y)) n++;
    return n / W;
  };

  let top = 0;
  while (top < H && rowFilled(top) < 0.98) top++;
  let bottom = H - 1;
  while (bottom > top && rowFilled(bottom) < 0.98) bottom--;

  return { top: top + 1, bottom: H - bottom };
}
```

- [ ] **Step 3: Add the slice-and-write step**

Append.

```js
/**
 * The paper, cropped to its sheet, normalized to one width and sliced in three.
 *
 * **Nothing of the paper is cut.** The crop removes the empty margin around the
 * sheet in her 1920-wide canvas; the torn deckle is part of the paper and is
 * kept whole.
 *
 * **The normalize is a scale, and it is safe.** Her sheets run 1314..1466, so
 * some grow ~2% and some shrink ~9% to reach 1337 — and this layer is a paper
 * grain with no figure in it and no horizon to skew, the same reason
 * `.card-paper` already stretches the middle tile vertically. Normalizing is
 * what lets all twenty-two share one `--container-card-paper` instead of
 * twenty-two sets of measured CSS.
 *
 * Three slices because the sheet has a deckle at each end and a middle that has
 * to stretch — the structure `.card-paper` already expects.
 */
async function writePaper(packets) {
  const dest = join(DEST, "paper");
  await mkdir(dest, { recursive: true });

  let written = 0;
  let total = 0;

  for (const folder of packets) {
    const slug = PACKETS[folder];
    const files = await readdir(join(SOURCE, folder));
    const file = files.find((n) => /BKGRND|BACKGROUND/i.test(n) && !/\.pbm$/i.test(n));

    if (!file) {
      throw new Error(`${folder}: no usable background. Temperance's .pbm is deliberately ignored.`);
    }

    const path = join(SOURCE, folder, file);
    const box = await sheetBounds(path);

    const sheet = await sharp(path)
      .extract({ left: box.left, top: box.top, width: box.width, height: box.height })
      .resize({ width: PAPER_WIDTH })
      .png()
      .toBuffer();

    const flattened = box.keyed
      ? sheet
      : await sharp(sheet).png().toBuffer();

    const { height } = await sharp(flattened).metadata();
    const deckle = await deckleDepth(flattened, box.keyed);

    const slices = [
      ["top", 0, deckle.top],
      ["mid", deckle.top, height - deckle.top - deckle.bottom],
      ["bottom", height - deckle.bottom, deckle.bottom],
    ];

    for (const [stem, top, sliceHeight] of slices) {
      const out = await sharp(flattened)
        .extract({ left: 0, top, width: PAPER_WIDTH, height: sliceHeight })
        .webp({ quality: 76 })
        .toFile(join(dest, `${slug}-${stem}.webp`));

      total += out.size;
      written += 1;
    }

    console.log(
      `paper/${slug}`.padEnd(28) +
        `${box.width}x${box.height} ${box.keyed ? "alpha" : "white"}`.padEnd(20) +
        `deckle ${deckle.top}/${deckle.bottom}`,
    );
  }

  return { written, total };
}
```

- [ ] **Step 4: Call it from the entry point**

Replace the tail of the file:

```js
const paper = await writePaper(packets);

console.log(
  `\n${written + paper.written} assets, ${((total + paper.total) / 1024 / 1024).toFixed(2)}MB total.`,
);
```

- [ ] **Step 5: Run it and verify**

Run: `npm run assets:packets`
Expected: the twenty-nine symbol lines, then twenty-one `paper/<slug>` lines. Every sheet width between 1250 and 1550, every deckle between 3 and 30. No throw.

Verify the three slices reassemble to the sheet's height:

```bash
node -e "const s=require('sharp');const d='public/figma/card-reference/paper/';Promise.all(['top','mid','bottom'].map(k=>s(d+'the-star-'+k+'.webp').metadata())).then(m=>console.log('widths',m.map(x=>x.width),'heights sum',m.reduce((a,x)=>a+x.height,0)))"
```

Expected: all three widths `1337`; heights summing to the star sheet's scaled height (~2845).

- [ ] **Step 6: Verify the guard fires**

Temporarily narrow the plausible range to prove the throw works:

```bash
node -e "const f='scripts/optimize-packet-assets.mjs';const fs=require('fs');const s=fs.readFileSync(f,'utf8');fs.writeFileSync(f,s.replace('min: 1250','min: 1400'));" && npm run assets:packets; node -e "const f='scripts/optimize-packet-assets.mjs';const fs=require('fs');const s=fs.readFileSync(f,'utf8');fs.writeFileSync(f,s.replace('min: 1400','min: 1250'));"
```

Expected: the run throws naming a card and its detected width, then the file is restored.

- [ ] **Step 7: Commit**

```bash
git add scripts/optimize-packet-assets.mjs public/figma/card-reference/paper
git commit -m "feat(assets): crop, normalize and slice the twenty-one parchment sheets"
```

---

## Task 4: Convert the twenty-two shadow panels

Includes The Fool's, so all twenty-two come from one place and take one code path.

**Files:**
- Modify: `scripts/optimize-packet-assets.mjs`

**Interfaces:**
- Consumes: `PACKETS`, `readPackets()` from Task 2.
- Produces: `public/figma/card-reference/shadows/<slug>.webp` for twenty-two slugs, each 1216px wide, opaque, on `rgb(56,56,56)`.

- [ ] **Step 1: Add the shadow constants and trimmer**

Append to `scripts/optimize-packet-assets.mjs`.

```js
/** The panel's own width. Her content measures exactly this once the padding is off. */
const SHADOW_WIDTH = 1216;

/**
 * The opaque fill every panel is flattened onto.
 *
 * **Her packets and The Fool's flat cut reach the same look two ways**: hers are
 * opaque `rgb(56,56,56)`, his is near-black at alpha 181, which composites to
 * `rgb(69,66,62)` over the parchment — about thirteen points lighter and warmer
 * because it picks up paper tone. Hers win: they are the majority and the newer
 * cut, and an opaque panel renders the same whatever sits behind it.
 */
const SHADOW_FILL = { r: 56, g: 56, b: 56 };

/**
 * The panel's content box inside a padded export.
 *
 * **The height variance was padding, not artwork.** Her files run 229..437 tall
 * and look like twenty-one different panels; trimmed, every one is 1216x227 with
 * the figure in the same place. Up to 42% of a file is empty margin.
 *
 * So they are **trimmed, never scaled** — a resize would have distorted figures
 * that were already the right size.
 *
 * Two of them (The Hermit's `shadow9.jpg`, Death's `shadow13.jpg`) are JPEGs
 * padded with white rather than alpha, and trim to the same 227 by luminance.
 */
async function shadowBounds(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;

  let keyed = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      keyed = true;
      break;
    }
  }

  const solid = (x, y) => {
    const i = (y * W + x) * 4;
    if (keyed) return data[i + 3] > 20;
    const lum = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    return lum < 245;
  };

  let top = H;
  let bottom = -1;
  let left = W;
  let right = -1;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!solid(x, y)) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }

  return { left, top, width: right - left + 1, height: bottom - top + 1, keyed };
}
```

- [ ] **Step 2: Add the shadow writer**

Append.

```js
/**
 * The shadow panels, trimmed and flattened.
 *
 * **The Fool's comes from the repo, not a packet.** His flat cut
 * (`shadow-ground.png`, the ground and the figure already composited) replaced
 * the two layers `ShadowPanel` used to stack, whose 11px-of-glow arithmetic was
 * hand-fitted to one card and could not travel.
 *
 * **The High Priestess is 260 tall where the rest are 227**, because her figure
 * reaches higher above the panel. She is not cropped to match: the panel is what
 * the artwork overhangs, exactly as The Fool's silhouette did.
 */
async function writeShadows(packets) {
  const dest = join(DEST, "shadows");
  await mkdir(dest, { recursive: true });

  const sources = [[join(DEST, "shadow-ground.png"), "the-fool"]];

  for (const folder of packets) {
    const files = await readdir(join(SOURCE, folder));
    const file = files.find((n) => /^shadow/i.test(n));

    if (!file) {
      throw new Error(`${folder}: no shadow layer.`);
    }

    sources.push([join(SOURCE, folder, file), PACKETS[folder]]);
  }

  let written = 0;
  let total = 0;

  for (const [path, slug] of sources) {
    const box = await shadowBounds(path);

    if (box.width !== SHADOW_WIDTH) {
      throw new Error(
        `${path}: trimmed to ${box.width}px wide, expected ${SHADOW_WIDTH}. ` +
          `Her panels are uniform once the padding is off; this one is not.`,
      );
    }

    const out = await sharp(path)
      .extract({ left: box.left, top: box.top, width: box.width, height: box.height })
      .flatten({ background: SHADOW_FILL })
      .webp({ quality: 82 })
      .toFile(join(dest, `${slug}.webp`));

    total += out.size;
    written += 1;
    console.log(
      `shadows/${slug}`.padEnd(28) +
        `${String(out.width).padStart(5)}x${String(out.height).padEnd(5)} ${(out.size / 1024).toFixed(1).padStart(6)}kB`,
    );
  }

  return { written, total };
}
```

- [ ] **Step 3: Call it from the entry point**

Replace the tail again:

```js
const shadows = await writeShadows(packets);

console.log(
  `\n${written + paper.written + shadows.written} assets, ` +
    `${((total + paper.total + shadows.total) / 1024 / 1024).toFixed(2)}MB total.`,
);
```

- [ ] **Step 4: Run it and verify**

Run: `npm run assets:packets`
Expected: twenty-two `shadows/<slug>` lines, every one `1216x227` except `the-high-priestess` at `1216x260`. No throw.

Verify the fill is opaque and the right grey:

```bash
node -e "const s=require('sharp');s('public/figma/card-reference/shadows/the-fool.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true}).then(({data,info})=>{const i=((info.height>>1)*info.width+Math.round(info.width*0.75))*4;console.log('panel interior rgba:',data[i],data[i+1],data[i+2],data[i+3],'(expect 56 56 56 255)')})"
```

Expected: `56 56 56 255`.

- [ ] **Step 5: Commit**

```bash
git add scripts/optimize-packet-assets.mjs public/figma/card-reference/shadows
git commit -m "feat(assets): trim and flatten the twenty-two shadow panels"
```

---

## Task 5: Teach the asset map and `ShadowPanel` about per-card art

**Files:**
- Modify: `src/lib/assets.ts:365-399` (`cardReference`), and append `cardSymbols`, `cardPaper`, `cardShadows`
- Modify: `src/components/library/card/ShadowPanel.tsx`
- Modify: `src/components/library/card/CardReferencePage.tsx:~175` (the `ShadowPanel` call)

**Interfaces:**
- Consumes: the asset paths Tasks 2–4 wrote.
- Produces:
  - `cardSymbols: Record<string, ImageAsset>` keyed by the twenty-nine lowercase names.
  - `cardShadows: Record<string, ImageAsset>` keyed by card slug.
  - `cardPaper(slug): { top: string; mid: string; bottom: string }` — plain URLs, because CSS paints them.
  - `ShadowPanel({ lines, art }: { lines: readonly string[]; art: ImageAsset })`.
  - `cardReference.shadowSilhouette` is **removed**.

- [ ] **Step 1: Write the failing test**

Create `src/content/card-content.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { cardShadows, cardSymbols } from "../lib/assets.ts";
import { majorArcana } from "./library.ts";

test("every card has a shadow panel asset", () => {
  for (const card of majorArcana) {
    assert.ok(cardShadows[card.slug], `${card.name} has no shadow asset`);
  }
});

test("the twenty-nine shared symbols are all present", () => {
  const expected = [
    "air", "earth", "fire", "water",
    "aquarius", "aries", "cancer", "capricorn", "gemini", "leo", "libra",
    "pisces", "sagittarius", "scorpio", "taurus", "virgo",
    "jupiter", "mars", "mercury", "moon", "neptune", "pluto", "saturn",
    "sun", "uranus", "venus",
    "yes", "no", "maybe",
  ];

  assert.equal(Object.keys(cardSymbols).length, 29);

  for (const name of expected) {
    assert.ok(cardSymbols[name], `no symbol for "${name}"`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `cardShadows`/`cardSymbols` are not exported from `lib/assets.ts`.

- [ ] **Step 3: Drop `shadowSilhouette` and add the three per-card maps**

In `src/lib/assets.ts`, delete the `shadowSilhouette` entry and its comment from `cardReference` (lines 391-392). Leave `shadowGround` in place for now — Task 8 removes it once nothing reads it.

Append after the `cardReference` block:

```ts
const cardSymbol = (name: string, width: number, height: number): ImageAsset =>
  asset(`/figma/card-reference/symbols/${name}.webp`, width, height);

/**
 * The meta strip's glyphs — four elements, twelve signs, ten planets, three
 * verdicts.
 *
 * **Shared, not per-card.** The client copied an identical set into all
 * twenty-one packets (verified by hash in `scripts/optimize-packet-assets.mjs`),
 * so they are written once and every card's content object points at these.
 *
 * The dimensions are that script's output. Read them off a run of it rather
 * than off a packet, where they are the untinted source's size.
 */
export const cardSymbols: Record<string, ImageAsset> = {
  air: cardSymbol("air", 116, 102),
  earth: cardSymbol("earth", 116, 102),
  fire: cardSymbol("fire", 116, 102),
  water: cardSymbol("water", 116, 102),
  aquarius: cardSymbol("aquarius", 102, 72),
  aries: cardSymbol("aries", 116, 105),
  cancer: cardSymbol("cancer", 116, 100),
  capricorn: cardSymbol("capricorn", 96, 115),
  gemini: cardSymbol("gemini", 116, 110),
  leo: cardSymbol("leo", 90, 114),
  libra: cardSymbol("libra", 116, 96),
  pisces: cardSymbol("pisces", 116, 117),
  sagittarius: cardSymbol("sagittarius", 116, 116),
  scorpio: cardSymbol("scorpio", 116, 97),
  taurus: cardSymbol("taurus", 116, 117),
  virgo: cardSymbol("virgo", 116, 115),
  jupiter: cardSymbol("jupiter", 68, 101),
  mars: cardSymbol("mars", 116, 116),
  mercury: cardSymbol("mercury", 76, 148),
  moon: cardSymbol("moon", 116, 125),
  neptune: cardSymbol("neptune", 116, 129),
  pluto: cardSymbol("pluto", 74, 114),
  saturn: cardSymbol("saturn", 78, 118),
  sun: cardSymbol("sun", 116, 116),
  uranus: cardSymbol("uranus", 76, 121),
  venus: cardSymbol("venus", 76, 121),
  yes: cardSymbol("yes", 116, 115),
  no: cardSymbol("no", 116, 116),
  maybe: cardSymbol("maybe", 116, 116),
};

/**
 * Each card's shadow panel — the ground and the figure in one flat image.
 *
 * **They were two layers and are now one**, because the Fool's silhouette was
 * positioned by arithmetic fitted to his own export's transparent glow and
 * twenty-two cards cannot share it.
 *
 * All 1216x227 but The High Priestess, whose figure reaches higher.
 */
export const cardShadows: Record<string, ImageAsset> = {
  "the-fool": asset("/figma/card-reference/shadows/the-fool.webp", 1216, 227),
  "the-magician": asset("/figma/card-reference/shadows/the-magician.webp", 1216, 227),
  "the-high-priestess": asset("/figma/card-reference/shadows/the-high-priestess.webp", 1216, 260),
  "the-empress": asset("/figma/card-reference/shadows/the-empress.webp", 1216, 227),
  "the-emperor": asset("/figma/card-reference/shadows/the-emperor.webp", 1216, 227),
  "the-high-priest": asset("/figma/card-reference/shadows/the-high-priest.webp", 1216, 227),
  "the-lovers": asset("/figma/card-reference/shadows/the-lovers.webp", 1216, 227),
  "the-chariot": asset("/figma/card-reference/shadows/the-chariot.webp", 1216, 227),
  strength: asset("/figma/card-reference/shadows/strength.webp", 1216, 227),
  "the-hermit": asset("/figma/card-reference/shadows/the-hermit.webp", 1216, 227),
  "the-wheel": asset("/figma/card-reference/shadows/the-wheel.webp", 1216, 227),
  justice: asset("/figma/card-reference/shadows/justice.webp", 1216, 227),
  "the-hangman": asset("/figma/card-reference/shadows/the-hangman.webp", 1216, 227),
  death: asset("/figma/card-reference/shadows/death.webp", 1216, 227),
  temperance: asset("/figma/card-reference/shadows/temperance.webp", 1216, 227),
  "the-devil": asset("/figma/card-reference/shadows/the-devil.webp", 1216, 227),
  "the-tower": asset("/figma/card-reference/shadows/the-tower.webp", 1216, 227),
  "the-star": asset("/figma/card-reference/shadows/the-star.webp", 1216, 227),
  "the-moon": asset("/figma/card-reference/shadows/the-moon.webp", 1216, 227),
  "the-sun": asset("/figma/card-reference/shadows/the-sun.webp", 1216, 227),
  judgement: asset("/figma/card-reference/shadows/judgement.webp", 1216, 227),
  "the-world": asset("/figma/card-reference/shadows/the-world.webp", 1216, 227),
};

/**
 * A card's three parchment slices, as bare URLs.
 *
 * **Not `ImageAsset`s, because CSS paints these** — `.card-paper` sets them as
 * `background-image`, and a background has no intrinsic box for a width and
 * height to describe. The same reason `librarySurfaces` holds the Fool's.
 */
export const cardPaper = (slug: string) => ({
  top: `/figma/card-reference/paper/${slug}-top.webp`,
  mid: `/figma/card-reference/paper/${slug}-mid.webp`,
  bottom: `/figma/card-reference/paper/${slug}-bottom.webp`,
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Verify the declared dimensions match what the script wrote**

The heights above are placeholders until a run confirms them. Print the real ones and correct any that differ:

```bash
node -e "const s=require('sharp');const fs=require('fs');const d='public/figma/card-reference/symbols/';Promise.all(fs.readdirSync(d).map(f=>s(d+f).metadata().then(m=>f.replace('.webp','')+': '+m.width+'x'+m.height))).then(r=>console.log(r.sort().join('\n')))"
```

Edit `cardSymbols` so every width and height matches. A wrong height here makes Next reserve the wrong box and the glyph jumps on load.

- [ ] **Step 6: Rewrite `ShadowPanel` to draw one image**

In `src/components/library/card/ShadowPanel.tsx`: change the signature, replace the two `<Image>` elements with one, and delete the silhouette's comment block entirely.

```tsx
import Image from "next/image";

import type { ImageAsset } from "@/lib/assets";
import { cardReference } from "@/lib/assets";

/**
 * The shadow panel: the card's warnings, on near-black, with the figure
 * standing at the left edge.
 *
 * Like the reading panel, this sits **outside the page's inversion** — gold and
 * cream on black, the site's own colours rather than this page's ink.
 *
 * **The rule under "shadow" is champagne, not this page's green.** Her frame
 * tints it `rgba(188,171,130,0.93)`, the colour the rest of the site already
 * uses, because the panel is the site's palette rather than the parchment's.
 * Green here would be consistency with the wrong neighbour.
 *
 * **The panel and the figure are one image, and that is a change.** They were
 * two: an empty rounded panel with the figure drawn over it, positioned by
 * arithmetic reverse-engineered from the 11px of transparent glow around her
 * export. That fitted The Fool and nothing else — the client's twenty-one
 * packets each carry their own figure with its own padding — so every card now
 * ships pre-composited and this draws one picture.
 *
 * **The figure no longer drops out below `sm`.** She used to, because a 254px
 * figure in a 1216px panel would have sat under the words at phone width. She
 * is part of the artwork now, so the panel scales as a whole and the text keeps
 * its offset at every size.
 */
export function ShadowPanel({ lines, art }: { lines: readonly string[]; art: ImageAsset }) {
  return (
    <div className="stack">
      <Image
        src={art.src}
        alt=""
        width={art.width}
        height={art.height}
        className="size-full object-fill"
        sizes="(width >= 64rem) 63.33vw, 100vw"
      />
      {/* … the existing text column below is unchanged … */}
```

Keep everything from the text column's `<div className="flex flex-col items-center …">` onward exactly as it is, including the `sm:ml-[29.2%]` offset and the champagne divider. Remove `relative` from the wrapper — nothing is absolutely positioned against it any more.

- [ ] **Step 7: Pass the art in**

In `src/components/library/card/CardReferencePage.tsx`, add the import and the prop:

```tsx
import { cardShadows } from "@/lib/assets";
```

```tsx
<ShadowPanel lines={content.shadow} art={cardShadows[card.slug]} />
```

- [ ] **Step 8: Add the variable-line-count test**

This is Review Focus item 5 — most cards' shadow bullets are one line, not the Fool's two.

Append to `src/content/card-content.test.ts`:

```ts
import { majorArcanaContent } from "./card-content.ts";

test("shadow blocks are two or three lines, and never empty", () => {
  for (const [slug, content] of Object.entries(majorArcanaContent)) {
    assert.ok(content.shadow.length >= 2, `${slug} has ${content.shadow.length} shadow lines`);
    assert.ok(content.shadow.length <= 3, `${slug} has ${content.shadow.length} shadow lines`);

    for (const line of content.shadow) {
      assert.ok(line.trim().length > 0, `${slug} has an empty shadow line`);
    }
  }
});
```

This imports `majorArcanaContent`, which Task 6 creates — so it fails until then. That is deliberate: it is the contract Task 6 must satisfy.

- [ ] **Step 9: Run the build to verify the page still renders**

Run: `npm run build`
Expected: the build succeeds and `/library/the-fool-tarot-meaning/` is emitted. (`npm test` will fail on the new shadow test until Task 6 — that is expected.)

- [ ] **Step 10: Commit**

```bash
git add src/lib/assets.ts src/components/library/card/ShadowPanel.tsx src/components/library/card/CardReferencePage.tsx src/content/card-content.test.ts
git commit -m "feat(library): per-card shadow and symbol assets, one flat shadow panel"
```

---

## Task 6: Import the twenty-one content objects

**Files:**
- Create: `scripts/import-card-content.mjs`
- Modify: `src/content/card-content.ts`
- Modify: `src/content/library.ts:60-80` (add `content:` to twenty-one cards)

**Interfaces:**
- Consumes: `cardSymbols` from Task 5; `MajorArcanaContent` from `card-content.ts`.
- Produces: twenty-one exported `MajorArcanaContent` objects, and `majorArcanaContent: Record<string, MajorArcanaContent>` keyed by slug — the map Task 5's test imports.

- [ ] **Step 1: Write the emitter**

Create `scripts/import-card-content.mjs`. It reads the `.xls` through Python's `xlrd` because the file is legacy BIFF8 and no maintained JS reader handles it.

```js
/**
 * Turns the client's `LIBRARY CARDS CONTENT 1.xls` into TypeScript.
 *
 * **Its output is the source and is committed**; this script is not part of the
 * build. These pages are statically exported to be indexed, so their copy
 * belongs at build time — the reasoning `card-content.ts`'s own header gives.
 *
 * **Her copy is transcribed verbatim.** The rule `library.ts` keeps for card
 * names — fix outright misspellings — is deliberately NOT applied here at the
 * client's instruction, so `SOVREIGNTY` and `fufillment` ship as she wrote
 * them. The Fool's own `the unkown` correction predates that instruction and
 * stays, which makes his the only non-verbatim page.
 *
 * Her sheet is column-per-card: numerals across, field labels down.
 *
 * **This script was run against her sheet while the plan was written**, so the
 * shape below is verified rather than assumed: twenty-one objects, eighty-four
 * `appears` columns, all twenty-nine symbols referenced, no `.png` left in a
 * value, no stray separators.
 *
 *   node scripts/import-card-content.mjs
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHEET = resolve(root, "..", "asset dump", "LIBRARY CARDS CONTENT 1.xls");

/** Her row numbers, zero-indexed, as measured. */
const ROWS = {
  name: 3,
  keywords: 9,
  subtitle: 10,
  essay: 11,
  appears: [
    [15, 16],
    [17, 18],
    [19, 20],
    [21, 22],
  ],
  lookFor: 26,
  love: 30,
  career: 31,
  money: 32,
  shadowBullets: 35,
  shadowClosing: 36,
  element: 39,
  planet: 40,
  sign: 41,
  keyword: 42,
  yesNo: 43,
  yesNoText: 44,
  quote: 47,
};

/** Her column order, mapped to the slugs `library.ts` uses. */
const SLUGS = [
  "the-magician", "the-high-priestess", "the-empress", "the-emperor",
  "the-high-priest", "the-lovers", "the-chariot", "strength", "the-hermit",
  "the-wheel", "justice", "the-hangman", "death", "temperance", "the-devil",
  "the-tower", "the-star", "the-moon", "the-sun", "judgement", "the-world",
];

const PY = `
import json, xlrd
b = xlrd.open_workbook(r"${SHEET}")
sh = b.sheets()[0]
print(json.dumps([[str(sh.cell_value(r, c)) for c in range(sh.ncols)] for r in range(sh.nrows)]))
`;

const grid = JSON.parse(execFileSync("python", ["-c", PY], { encoding: "utf8", maxBuffer: 8 << 20 }));

const cell = (row, col) => (grid[row]?.[col] ?? "").trim();

/**
 * Her line breaks, of which there are two kinds.
 *
 * **Eighteen of the twenty-one essays break paragraphs with U+2028**, the
 * Unicode line separator, rather than a newline — an artefact of the sheet
 * coming out of Numbers. Splitting on a newline alone collapses those essays
 * into a single paragraph, which is the failure this function exists to
 * prevent. Both characters are invisible in an editor.
 */
const lines = (value) =>
  value
    .split(/[\n\u2028]/)
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Her separator, normalized.
 *
 * **She uses two characters for the same dot**: U+2022 (bullet) and U+00B7
 * (middle dot), mixed within the summary, look-for and shadow rows — 57 middle
 * dots against bullets elsewhere. Side by side they are visibly different
 * weights, so they are unified on the bullet The Fool's page already draws.
 *
 * **This is normalization, not a copy correction.** Her words are untouched;
 * only a glyph she typed inconsistently is made consistent, the same class of
 * judgement as trimming trailing whitespace.
 */
const bullets = (value) => value.replace(/\u00b7/g, "\u2022");

const quote = (value) => JSON.stringify(value);

const camel = (slug) => slug.replace(/-(.)/g, (_, ch) => ch.toUpperCase());

/** Title Case, because her NAME row is shouted: `THE HIGH PRIESTESS`. */
const titleCase = (value) =>
  value.toLowerCase().replace(/\b(.)/g, (_, ch) => ch.toUpperCase());

/**
 * The page's own meta description.
 *
 * **Her keywords plus the first sentence of her essay**, which is the shape The
 * Fool's already has. Built rather than transcribed because her sheet has no
 * column for it — its PAGE TITLE row duplicates what `cardMeta()` already
 * derives from `card.name`, and its ALT TEXT row is the image's, not the page's.
 *
 * Runs 150..170 characters across the twenty-one, inside what a search result
 * shows.
 */
const metaDescription = (col) => {
  const opening = lines(cell(ROWS.essay, col))[0];
  const sentence = opening.split(/(?<=[.!?])\s/)[0];
  const keywords = bullets(cell(ROWS.keywords, col)).toLowerCase();

  return `${titleCase(cell(ROWS.name, col))} tarot card meaning in The World Tarot: ${keywords}. ${sentence}`;
};

const objects = SLUGS.map((slug, index) => {
  const col = index + 1;
  const appears = ROWS.appears.map(([labelRow, bodyRow], n) => {
    const icon = `cardReference.appearsIcon${n + 1}`;
    return `    {\n      icon: ${icon},\n      label: ${quote(cell(labelRow, col))},\n      body: ${quote(cell(bodyRow, col))},\n    },`;
  });

  const shadow = [...lines(bullets(cell(ROWS.shadowBullets, col))), cell(ROWS.shadowClosing, col)];
  /** Her meta rows name a file (`moon.png`); the page shows the stem. */
  const stem = (row) => cell(row, col).replace(/\.png$/i, "");
  const symbol = (row) => `cardSymbols.${stem(row).toLowerCase()}`;

  return `export const ${camel(slug)}: MajorArcanaContent = {
  keywords: ${quote(bullets(cell(ROWS.keywords, col)))},
  subtitle: ${quote(cell(ROWS.subtitle, col))},
  essay: [
${lines(cell(ROWS.essay, col)).map((p) => `    ${quote(p)},`).join("\n")}
  ],
  appears: [
${appears.join("\n")}
  ],
  lookFor: [
${lines(bullets(cell(ROWS.lookFor, col))).map((l) => `    ${quote(l)},`).join("\n")}
  ],
  spheres: {
    love: ${quote(cell(ROWS.love, col))},
    career: ${quote(cell(ROWS.career, col))},
    money: ${quote(cell(ROWS.money, col))},
  },
  shadow: [
${shadow.map((l) => `    ${quote(l)},`).join("\n")}
  ],
  meta: {
    element: { symbol: ${symbol(ROWS.element)}, value: ${quote(stem(ROWS.element))} },
    planet: { symbol: ${symbol(ROWS.planet)}, value: ${quote(stem(ROWS.planet).toUpperCase())} },
    sign: { symbol: ${symbol(ROWS.sign)}, value: ${quote(stem(ROWS.sign).toUpperCase())} },
    keyword: { symbol: cardReference.symbolKey, value: ${quote(cell(ROWS.keyword, col))} },
    yesNo: { symbol: ${symbol(ROWS.yesNo)}, value: ${quote(cell(ROWS.yesNoText, col))} },
  },
  closing: [${quote(cell(ROWS.quote, col))}],
  metaDescription: ${quote(metaDescription(col))},
};`;
});

writeFileSync(join(root, "src", "content", "card-content.generated.ts"), objects.join("\n\n") + "\n");
console.log(`Wrote ${objects.length} content objects to src/content/card-content.generated.ts`);
```

- [ ] **Step 2: Run it**

Run: `node scripts/import-card-content.mjs`
Expected: `Wrote 21 content objects to src/content/card-content.generated.ts`.

- [ ] **Step 3: Check the emitted copy against the sheet**

Open `src/content/card-content.generated.ts` and read The High Priestess and The World in full against the spreadsheet. Confirm specifically:

- `SOVREIGNTY` appears in `the-emperor`'s keyword, **unfixed**.
- `fufillment` appears in `the-empress`'s keywords, **unfixed**.
- `the-magician`'s `shadow` is The Fool's text, **unfixed**.
- Every `essay` has three entries except `the-magician`, which has four.
- `closing` is one string for every card. Her sheet gives one line where The Fool's was broken into two by hand; `Phrase` breaks between parts, so a single part is correct.

- [ ] **Step 4: Merge into `card-content.ts`**

Paste the generated objects into `src/content/card-content.ts` after `theFool`, update the import line, and add the lookup map. Then delete `card-content.generated.ts`.

```ts
import { cardReference, cardSymbols } from "@/lib/assets";
```

At the end of the file:

```ts
/**
 * Every card's content, by slug.
 *
 * **The route does not use this** — it reads `card.content` off the card, which
 * is what makes a card without copy fall through to `ComingSoonPage`. This map
 * exists so tests can walk the set, and it is the reason `card-content.test.ts`
 * can assert a shape across all twenty-two at once.
 */
export const majorArcanaContent: Record<string, MajorArcanaContent> = {
  "the-fool": theFool,
  "the-magician": theMagician,
  "the-high-priestess": theHighPriestess,
  "the-empress": theEmpress,
  "the-emperor": theEmperor,
  "the-high-priest": theHighPriest,
  "the-lovers": theLovers,
  "the-chariot": theChariot,
  strength: strength,
  "the-hermit": theHermit,
  "the-wheel": theWheel,
  justice: justice,
  "the-hangman": theHangman,
  death: death,
  temperance: temperance,
  "the-devil": theDevil,
  "the-tower": theTower,
  "the-star": theStar,
  "the-moon": theMoon,
  "the-sun": theSun,
  judgement: judgement,
  "the-world": theWorld,
};
```

Also update the file's header comment: the paragraph claiming "The Fool is the only card with a record here" is no longer true. Replace it with a note that all twenty-two have records, that the optional-`content` mechanism remains for the four suits, and that her copy is verbatim per the client's 2026-09-28 instruction.

- [ ] **Step 5: Wire the content into `library.ts`**

Import the twenty-one names and add `content:` to each card:

```ts
import {
  death, judgement, justice, strength, temperance, theChariot, theDevil,
  theEmperor, theEmpress, theFool, theHangman, theHermit, theHighPriest,
  theHighPriestess, theLovers, theMagician, theMoon, theStar, theSun,
  theTower, theWheel, theWorld, type MajorArcanaContent,
} from "@/content/card-content";
```

```ts
{ slug: "the-magician", numeral: "I", name: "The Magician", image: libraryCards["the-magician"], content: theMagician },
```

…and the same for the other twenty.

- [ ] **Step 6: Add the symbol-resolution test**

This is Review Focus item 4 — a typo in her sheet would otherwise ship a broken `src`.

Append to `src/content/card-content.test.ts`:

```ts
import { cardSymbols } from "../lib/assets.ts";

test("every meta symbol resolves to a real asset", () => {
  const known = new Set(Object.values(cardSymbols).map((symbol) => symbol.src));

  for (const [slug, content] of Object.entries(majorArcanaContent)) {
    for (const [field, entry] of Object.entries(content.meta)) {
      assert.ok(
        entry.symbol.src.length > 0 && !entry.symbol.src.includes("undefined"),
        `${slug}.meta.${field} has an unresolved symbol`,
      );

      if (field === "keyword") continue; // the shared key glyph, not a packet symbol

      assert.ok(known.has(entry.symbol.src), `${slug}.meta.${field} points outside cardSymbols`);
    }
  }
});

test("no stray separator characters survived the import", () => {
  for (const [slug, content] of Object.entries(majorArcanaContent)) {
    const all = [
      content.keywords,
      content.subtitle,
      ...content.essay,
      ...content.lookFor,
      ...content.shadow,
      ...content.closing,
      content.spheres.love,
      content.spheres.career,
      content.spheres.money,
    ].join(" ");

    // U+2028 is her paragraph break and must have been split on, not kept.
    assert.ok(!all.includes(" "), `${slug} still contains a U+2028 line separator`);
    // U+00B7 is her second bullet glyph; the import unifies it on U+2022.
    assert.ok(!all.includes("·"), `${slug} still contains a U+00B7 middle dot`);
  }
});

test("every card has the four appears columns and non-empty copy", () => {
  for (const [slug, content] of Object.entries(majorArcanaContent)) {
    assert.equal(content.appears.length, 4, `${slug} has ${content.appears.length} columns`);
    assert.ok(content.essay.length >= 3, `${slug} has ${content.essay.length} essay paragraphs`);
    assert.ok(content.keywords.trim().length > 0, `${slug} has no keywords`);
    assert.ok(content.subtitle.trim().length > 0, `${slug} has no subtitle`);
    assert.ok(content.closing.length >= 1, `${slug} has no closing line`);
  }
});
```

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: PASS, including Task 5's shadow-line test.

- [ ] **Step 8: Commit**

```bash
git add scripts/import-card-content.mjs src/content/card-content.ts src/content/library.ts src/content/card-content.test.ts
git commit -m "feat(library): import the twenty-one cards' copy from the client's sheet"
```

---

## Task 7: Point `.card-paper` at each card's own sheet

**Files:**
- Modify: `src/app/globals.css:1614-1700` (`.card-paper` and its pseudo-elements)
- Modify: `src/components/library/card/CardReferencePage.tsx` (set the custom properties)

**Interfaces:**
- Consumes: `cardPaper(slug)` from Task 5.
- Produces: `.card-paper` reads `--card-paper-top`, `--card-paper-mid`, `--card-paper-bottom`.

- [ ] **Step 1: Make the three backgrounds variable**

In `src/app/globals.css`, in `.card-paper`, replace the hard-coded `page-paper-mid.webp` with the variable, and add a note explaining why:

```css
    background-image:
      var(--card-paper-mid),
      linear-gradient(to right, transparent 0 2%, #ebe2cf 2% 98%, transparent 98%);
```

And in the two pseudo-elements:

```css
  .card-paper::before {
    background-image: var(--card-paper-top);
    bottom: 100%;
  }
```

```css
  .card-paper::after {
    background-image: var(--card-paper-bottom);
    top: 100%;
  }
```

Add above `.card-paper`:

```css
  /*
    **The sheet is per-card, which is new.** The Fool's page had one paper; the
    client delivered twenty-one more, each a different width in her 1920 canvas
    (1314..1466) and none of them centred the same. They are normalized to one
    1337px sheet by `scripts/optimize-packet-assets.mjs` — nothing of the paper
    is cut, only the empty margin around it — so this geometry, the deckle ratio
    below and `--container-card-paper` are all unchanged from his page.

    The three URLs arrive as custom properties set on the element, because CSS
    cannot index a map by a React prop. `CardReferencePage` sets them.
  */
```

- [ ] **Step 2: Set the properties on the element**

In `CardReferencePage.tsx`, import the helper and build the style object:

```tsx
import { cardPaper, cardShadows } from "@/lib/assets";
```

Inside the component, above the `return`:

```tsx
  const paper = cardPaper(card.slug);
```

Then on the `.card-paper` div, add the `style` prop, keeping every existing class:

```tsx
      <div
        className="card-paper mt-[clamp(calc(1.5rem*var(--card-scale)),calc(5.28vw*var(--card-scale)),calc(6.34rem*var(--card-scale)))] pb-[clamp(calc(3.813rem*var(--card-scale)),calc(12.708vw*var(--card-scale)),calc(15.25rem*var(--card-scale)))]"
        style={
          {
            "--card-paper-top": `url("${paper.top}")`,
            "--card-paper-mid": `url("${paper.mid}")`,
            "--card-paper-bottom": `url("${paper.bottom}")`,
          } as React.CSSProperties
        }
      >
```

- [ ] **Step 3: Build and verify every page emits**

Run: `npm run build`
Expected: the build succeeds and `out/library/` holds twenty-two directories, all `-tarot-meaning`.

```bash
ls out/library | sort
```

Expected: twenty-two card directories plus the four suit ones, and **no** `-tarot-card-meaning` anywhere.

- [ ] **Step 4: Verify the paper assets are actually referenced**

```bash
grep -o 'paper/[a-z-]*-mid\.webp' out/library/the-star-tarot-meaning/index.html | head -1
```

Expected: `paper/the-star-mid.webp` — the star's own sheet, not the Fool's.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/library/card/CardReferencePage.tsx
git commit -m "feat(library): give each card its own parchment sheet"
```

---

## Task 8: Retire the dead assets and update the docs

**Files:**
- Modify: `src/lib/assets.ts` (drop `shadowGround`; `librarySurfaces`' three `cardPaper*` entries)
- Delete: `public/figma/card-reference/shadow-silhouette.webp`, `shadow-ground.webp`, `page-paper-{top,mid,bottom}.webp`, `shadow-ground.png`
- Modify: `src/components/library/card/README.md`, `src/content/README.md`
- Modify: `scripts/optimize-card-assets.mjs` (note what moved)

**Interfaces:**
- Consumes: everything above.
- Produces: no dead assets, and READMEs that describe the built state.

- [ ] **Step 1: Confirm nothing still reads them**

```bash
grep -rn "shadowSilhouette\|shadowGround\|cardPaperTop\|cardPaperMid\|cardPaperBottom\|page-paper" src/ --include=*.ts --include=*.tsx --include=*.css
```

Expected: no matches outside `lib/assets.ts` itself. If `ShadowPanel` still appears, Task 5 was not finished.

- [ ] **Step 2: Remove the entries and the files**

Delete `shadowGround` from `cardReference` and the three `cardPaper*` entries from `librarySurfaces` in `src/lib/assets.ts`.

```bash
git rm public/figma/card-reference/shadow-silhouette.webp public/figma/card-reference/shadow-ground.webp public/figma/card-reference/page-paper-top.webp public/figma/card-reference/page-paper-mid.webp public/figma/card-reference/page-paper-bottom.webp
rm -f public/figma/card-reference/shadow-ground.png
```

`shadow-ground.png` is the client's source for the Fool's flat panel, now consumed by `optimize-packet-assets.mjs` — it was never committed, so `rm` rather than `git rm`. Note in that script's header that the Fool's source lives in `asset dump` alongside the packets if it is ever needed again; move it there first if it is not already.

- [ ] **Step 3: Note the handover in the old script**

In `scripts/optimize-card-assets.mjs`, in the `SLUGS` table, replace the `"Layer 17"` and `"FOOL SILOUHETTE"` entries with a comment:

```js
  /*
    `Layer 17` (the empty panel) and `FOOL SILOUHETTE` (the figure) are no
    longer converted here. The two were composited by hand in the page and are
    now one flat image per card — see `optimize-packet-assets.mjs`, which writes
    all twenty-two including The Fool's.
  */
```

Remove their `WIDTHS` entries too, or the script throws on a source with no width.

- [ ] **Step 4: Rewrite the README's stale claims**

`src/components/library/card/README.md` currently says "One card has content; twenty-one do not" and describes the two-layer shadow panel. Replace that section with the built state: all twenty-two have content, the per-card assets are the parchment and the shadow, the symbols are shared, and the "Appears" icons are still The Fool's on every page pending client delivery. Update the URL example to `-tarot-meaning`. Keep every other section — the inversion note, the two measures, the tiling parchment, the `@theme` note and the composed-renders warning are all still true.

`src/content/README.md` says only one card is wired up; correct it to twenty-two and note the verbatim-copy rule.

- [ ] **Step 5: Run everything**

Run: `npm test && npm run lint && npm run build`
Expected: all pass. The build emits twenty-two card pages.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(library): retire the Fool-only shadow and paper assets, update docs"
```

---

## Verification

After Task 8, confirm against the spec:

- [ ] `npm test` passes, including the four new content tests.
- [ ] `npm run build` emits twenty-two `-tarot-meaning` directories under `out/library/` and no `-tarot-card-meaning`.
- [ ] No page ships a black symbol: `grep -c 'symbols/' out/library/the-star-tarot-meaning/index.html` returns 5.
- [ ] The Fool's page is unchanged but for its URL and its shadow panel. Diff it against a pre-change build if one is available.
- [ ] Temperance's and The Wheel's pages are the two to inspect first for a halo or a squared-off deckle — their paper edges came from a luminance threshold rather than her own alpha.
- [ ] The client verifies visually. Per the user's standing preference, this plan runs no dev server and takes no browser screenshots.

## Notes for the client

Raise alongside the finished pages — the full list and the reasoning are in the spec's "To raise with the client":

- The copy ships verbatim, so `SOVREIGNTY`, `fufillment`, The Magician's duplicated shadow text and the Wheel/Hermit shared quote are all as she wrote them. The Fool is the one page with a correction.
- All twenty-one pages reuse The Fool's four "Appears in a Reading" icons and his key symbol, because no packet contains any.
- The Fool's URL has changed, and its shadow panel is now opaque where it was translucent — the only two changes to an approved page.
- Temperance and The Wheel ship from flattened-on-white exports; cleaner ones would remove the pipeline's one asymmetry.
- The Magician's packet carries a `SECTION 6 BACKGRND.png` no other packet has. Does she intend per-card meta strips?
