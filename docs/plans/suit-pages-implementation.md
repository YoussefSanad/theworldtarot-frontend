# Suit Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one reference page per suit — Cups, Pentacles, Swords, Wands — from the client's four frames, move the suits onto their SEO URLs, and make LIBRARY a navigation group in the masthead.

**Architecture:** The suit page is the card reference page's structure with a different set of blocks. It reuses that page's measurement system (`--card-scale`, `--measure-card-paper`, `.card-paper`, `.card-reading-ground`) unchanged, because both frames are 1920x3237 and the sheet occupies the same box in each. Copy lives in a new `content/suit-content.ts` beside `card-content.ts`; `content/library.ts` keeps owning a suit's identity. Two shared components gain props so both page kinds can call them; one that looks shared is deliberately left alone.

**Tech Stack:** Next 16 (App Router, static export, `trailingSlash: true`), React 19, Tailwind 4, `node --test` with `--experimental-strip-types`, sharp for asset conversion.

**Spec:** `docs/plans/suit-pages.md`

## Global Constraints

- **Client copy is copied, not corrected.** Her spellings, her `&` vs `and`, her em-dashes and her capitalisation ship as drawn. The spec's "The copy, verbatim" section is the source of truth; `card-content.ts` carries her `fufillment` and `SOVREIGNTY` under the same rule.
- **Her line-break hyphenation is not copy.** `fulfill-ment`, `abun-dance`, `inten-tion`, `rela-tionship` in the frames are her layout engine breaking words to fit her measure. Store the whole word.
- **A path carries a trailing slash once its route is built, and not before** (`content/site.ts`).
- **No absolute positioning for layout** (`src/app/README.md`); `.stack` or flow instead.
- **Figma px → clamp:** the maximum is her figure, the vw term is that figure / 19.2.
- **`images.unoptimized: true`** — every asset ships byte for byte, so the conversion step is the only encode.
- **Tests run with `npm test`** and live beside their subject as `*.test.ts`.
- **Never run the dev server or a browser check to verify UI.** The user verifies visually.

## Review Focus

Five things the spec implies that no task's happy path exercises. Each has its test added to the task that owns the code.

1. **A suit slug that is not one of the four** — `findSuit("hearts")` returns `undefined`, and `suitMeta`/`SuitPage` must throw a named error rather than render an empty page. (Task 2)
2. **A suit whose `content` is absent** — the route must fall back to `ComingSoonPage`, not crash on `content.essay`. All four ship with copy, so this arm is only reachable by a future edit. (Task 7)
3. **The old `/library/cups/` URLs after the rename** — `dynamicParams = false` on `[card]` means they 404, which is intended; no test may assert they still resolve, and no stale link may remain in `SuitNav`, the footer or `site.ts`. (Task 3)
4. **A `LookFor` label longer than "LOOK FOR:"** — the rule's gap is `--look-for-gap: 12ch` sized for nine characters; a longer label would sit on the line. The gap must follow the label. (Task 5)
5. **A suit sheet whose aspect does not match the delivered set** — a trim-to-layer export produced 1084–1460px widths and cut three deckles off before the client re-exported. The conversion script must throw on an off-aspect sheet rather than ship a distorted page. (Task 1)

---

## File Structure

**Created:**
- `scripts/optimize-suit-assets.mjs` — converts her four parchments and four phone sheets to webp
- `src/content/suit-content.ts` — the four suits' copy, and the `SuitContent` type
- `src/content/suit-content.test.ts` — shape and copy-integrity tests
- `src/components/library/suit/SuitReferencePage.tsx` — composes the page
- `src/components/library/suit/SuitIntro.tsx` — the heading + emblem column + three paragraphs
- `src/components/library/suit/StillUnfolding.tsx` — the closing "still unfolding" block
- `src/components/library/suit/README.md` — why this directory exists and what it does not reuse
- `src/app/(site)/library/cups-tarot-suit-meaning/page.tsx` (and three siblings)

**Modified:**
- `src/lib/assets.ts` — `suitPaper`, `suitPaperMobile`
- `src/content/library.ts` — `Suit.content`, `suits[].href` via `suitPath`, `SUIT_PATH_PATTERN`
- `src/content/site.ts` — LIBRARY becomes a `NavGroup`
- `src/content/card-path.test.ts` — suit path assertions
- `src/components/library/card/CardHeader.tsx` — props narrow to primitives
- `src/components/library/card/CardEssay.tsx` — call site of `CardHeader` unchanged in output
- `src/components/library/card/CardReferencePage.tsx` — passes the new `CardHeader` props
- `src/components/library/card/LookFor.tsx` — gains `label`
- `src/components/library/SuitPage.tsx` — routes to the real page or the holding page
- `src/app/globals.css` — `--look-for-gap` driven by the label
- `package.json` — `assets:suits` script

**Deleted:** nothing. The four old route directories are *renamed*, which git records as a move.

---

### Task 1: Convert her artwork

**Files:**
- Create: `scripts/optimize-suit-assets.mjs`
- Modify: `package.json` (add `assets:suits`)
- Output: `public/figma/suit-reference/paper/*.webp`, `public/figma/suit-reference/paper-mobile/*.webp`

**Interfaces:**
- Consumes: nothing.
- Produces: eight webp files at the paths `suitPaper`/`suitPaperMobile` will return in Task 2.

**Why this script is shorter than `optimize-packet-assets.mjs`:** that one trims each sheet out of a 1920 frame, keys two flattened-on-white sheets back to alpha, and normalizes twenty-two different widths to 1337. The client's suit re-export already did all three — the four sheets arrive trimmed to their own deckle, with real alpha, at a consistent aspect. So this script validates and encodes, and does not transform. The validation is the point: the *first* export of these files was trimmed to layer bounds, which produced a 33% spread of aspect ratios and cut the right deckle off three of the four, and nothing downstream would have caught it.

- [ ] **Step 1: Write the script**

```js
/**
 * Re-encodes the four suit parchments and their phone sheets for the web.
 *
 * The same job `optimize-packet-assets.mjs` does for the twenty-two cards, and
 * for the same reason: `next.config.mjs` sets `images.unoptimized: true`, so
 * whatever is referenced ships byte for byte and this encode is the only one.
 *
 * **It transforms nothing, and that is deliberate.** The card script trims each
 * sheet out of a 1920 frame, keys two flattened sheets back to alpha and
 * normalizes twenty-two widths to 1337. The client's suit export arrives
 * already trimmed to the deckle, with real alpha, at one aspect — so there is
 * nothing to do but check and encode.
 *
 * **The check is the valuable part.** Her first export of these files was
 * trimmed to each layer's own bounds: widths ran 1084..1460 — a 33% spread of
 * aspect ratios, which no CSS can render as one box undistorted — and the torn
 * right edge was cut off three of the four. She re-exported on a fixed canvas
 * and both faults went away. If a future delivery regresses, this throws here
 * rather than shipping a stretched sheet.
 *
 *   node scripts/optimize-suit-assets.mjs
 */

import { mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE = resolve(root, "..", "asset dump", "SUIT PAGES");
const MOBILE_SOURCE = join(SOURCE, "MOBILE BKGRND FOOL + SUITS");
const DEST = join(root, "public", "figma", "suit-reference");

/** Her phone-sheet filenames, mapped to the slugs the code uses. */
const MOBILE_SHEETS = {
  "CUPS MOBILE BKGRND": "cups",
  "PENTACLES MOBILE BKGRND": "pentacles",
  "SWORDS MOBILE BKGRND": "swords",
  /* Hers is singular, where every other name here is plural. */
  "WAND MOBILE BKGRND": "wands",
};

/**
 * The Fool's phone sheet ships in the same folder and is **not** converted here.
 *
 * It replaces the one the card pages draw today, which is a change to those
 * pages and belongs to the pass that owns them — not to a script whose output
 * directory is `suit-reference/`.
 */
const NOT_OURS = "THE FOOL MOBILE BKGRND";

const SUITS = ["cups", "pentacles", "swords", "wands"];

/**
 * The aspect every sheet must share, and the slack allowed.
 *
 * Her re-export lands the four at 0.5116..0.5137 — a 0.4% spread, which renders
 * as one box with no visible distortion. The tolerance is 2%: wide enough that
 * a future re-export's rounding passes, far tighter than the 33% spread the
 * broken export produced.
 */
const ASPECT = 0.512;
const ASPECT_TOLERANCE = 0.02;

/** Her phone sheets are all exactly this, as the card page's are. */
const MOBILE_SIZE = { width: 390, height: 3500 };

async function writePaper() {
  const dest = join(DEST, "paper");
  await mkdir(dest, { recursive: true });

  let written = 0;
  let total = 0;

  for (const slug of SUITS) {
    const path = join(SOURCE, `${slug}.png`);
    const { width, height, channels } = await sharp(path).metadata();
    const aspect = width / height;

    if (Math.abs(aspect - ASPECT) / ASPECT > ASPECT_TOLERANCE) {
      throw new Error(
        `${slug}.png is ${width}x${height} (aspect ${aspect.toFixed(4)}), not the delivered ` +
          `${ASPECT}±${ASPECT_TOLERANCE * 100}%. A sheet trimmed to its layer bounds rather than ` +
          `exported on a fixed canvas does this — see the note at the top of this script.`,
      );
    }

    if (channels !== 4) {
      throw new Error(
        `${slug}.png has ${channels} channels, not 4. The torn deckle needs real alpha; a sheet ` +
          `flattened onto white paints as a hard rectangle against the night sky.`,
      );
    }

    const out = await sharp(path).webp({ quality: 80 }).toFile(join(dest, `${slug}.webp`));

    total += out.size;
    written += 1;
    console.log(
      `paper/${slug}`.padEnd(28) +
        `${String(out.width).padStart(5)}x${String(out.height).padEnd(5)} ` +
        `${(out.size / 1024).toFixed(0).padStart(5)}kB`,
    );
  }

  return { written, total };
}

async function writePaperMobile() {
  const dest = join(DEST, "paper-mobile");
  await mkdir(dest, { recursive: true });

  const files = (await readdir(MOBILE_SOURCE))
    .filter((name) => /\.(png|jpe?g)$/i.test(name))
    .filter((name) => !name.startsWith(NOT_OURS));

  if (files.length !== 4) {
    throw new Error(
      `Expected 4 suit phone sheets in ${MOBILE_SOURCE}, found ${files.length}. ` +
        `The Fool's sheet sits beside them and is deliberately skipped.`,
    );
  }

  let written = 0;
  let total = 0;

  for (const file of files.sort()) {
    const stem = file.replace(/\.(png|jpe?g)$/i, "");
    const slug = MOBILE_SHEETS[stem];

    if (!slug) {
      throw new Error(`No slug for phone sheet "${stem}" — add it to MOBILE_SHEETS in this script.`);
    }

    const path = join(MOBILE_SOURCE, file);
    const { width, height } = await sharp(path).metadata();

    if (width !== MOBILE_SIZE.width || height !== MOBILE_SIZE.height) {
      throw new Error(
        `${file} is ${width}x${height}, not the delivered ${MOBILE_SIZE.width}x${MOBILE_SIZE.height}.`,
      );
    }

    const out = await sharp(path).webp({ quality: 80 }).toFile(join(dest, `${slug}.webp`));

    total += out.size;
    written += 1;
    console.log(
      `paper-mobile/${slug}`.padEnd(28) +
        `${String(out.width).padStart(5)}x${String(out.height).padEnd(5)} ` +
        `${(out.size / 1024).toFixed(0).padStart(5)}kB`,
    );
  }

  return { written, total };
}

const paper = await writePaper();
const mobile = await writePaperMobile();

console.log(
  `\n${paper.written + mobile.written} assets, ` +
    `${((paper.total + mobile.total) / 1024 / 1024).toFixed(2)}MB total.`,
);
```

- [ ] **Step 2: Add the npm script**

In `package.json`, beside `assets:packets`:

```json
"assets:suits": "node scripts/optimize-suit-assets.mjs",
```

- [ ] **Step 3: Run it**

Run: `npm run assets:suits`

Expected: eight lines, four `paper/*` at ~1460x2850 and four `paper-mobile/*` at 390x3500, then a total. No throw.

- [ ] **Step 4: Verify the aspect guard actually fires**

This is Review Focus #5 and the whole reason the script has a check. Prove it rejects a bad sheet rather than trusting it does:

```bash
node -e "
const sharp = require('sharp');
sharp('../asset dump/SUIT PAGES/cups.png').resize({width: 900, height: 2851, fit: 'fill'})
  .toFile('/tmp/bad-cups.png').then(() => console.log('made a distorted sheet'));
"
```

Then temporarily point `SOURCE` at a directory holding that file and run the script.

Expected: throws `cups.png is 900x2851 (aspect 0.3157), not the delivered 0.512±2%`.

Restore `SOURCE` afterwards and delete the temp file.

- [ ] **Step 5: Commit**

```bash
git add scripts/optimize-suit-assets.mjs package.json public/figma/suit-reference
git commit -m "feat(library): convert the four suit parchments and phone sheets"
```

---

### Task 2: Asset accessors and the suit content type

**Files:**
- Modify: `src/lib/assets.ts`
- Create: `src/content/suit-content.ts`
- Create: `src/content/suit-content.test.ts`

**Interfaces:**
- Consumes: the webp paths Task 1 wrote.
- Produces:
  - `suitPaper(slug: string): string`
  - `suitPaperMobile(slug: string): string`
  - `type SuitContent = { keywords: string; essay: readonly string[]; keyThemes: readonly string[]; spheres: { love: string; career: string; money: string }; closing: readonly string[]; unfolding: { heading: string; body: readonly string[] }; metaDescription: string }`
  - `cups`, `pentacles`, `swords`, `wands` — one named `SuitContent` export each, the shape `card-content.ts` uses for its twenty-two
  - `suitContent: Record<string, SuitContent>` — the four collected, for the tests to iterate

- [ ] **Step 1: Add the asset accessors**

In `src/lib/assets.ts`, beside `cardPaper`/`cardPaperMobile`:

```ts
/**
 * A suit's parchment — her delivered sheet, one per suit.
 *
 * **The emblem is painted into it.** The chalice, the coin pouch, the sword and
 * the torch are part of the sheet rather than layers to place, which is why
 * there is no suit equivalent of `cardShadows` and no emblem accessor here.
 *
 * Wider than a card's 1337 (hers run ~1460) and that costs nothing:
 * `.card-paper` is a box the image fills, so the sheet's own width is only its
 * aspect. See `scripts/optimize-suit-assets.mjs` for why that aspect is checked.
 */
export const suitPaper = (slug: string) => `/figma/suit-reference/paper/${slug}.webp`;

/** The same sheet drawn for the phone, at the 390x3500 the card pages already use. */
export const suitPaperMobile = (slug: string) => `/figma/suit-reference/paper-mobile/${slug}.webp`;
```

- [ ] **Step 2: Write the failing test**

Create `src/content/suit-content.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { suits } from "./library.ts";
import { suitContent } from "./suit-content.ts";

test("every suit has content", () => {
  for (const suit of suits) {
    assert.ok(suitContent[suit.slug], `${suit.title} has no content`);
  }
});

test("content exists only for suits that exist", () => {
  const slugs = new Set(suits.map((suit) => suit.slug));

  for (const slug of Object.keys(suitContent)) {
    assert.ok(slugs.has(slug), `"${slug}" is not a suit`);
  }
});

test("every suit's essay is three paragraphs, as her frames draw", () => {
  for (const [slug, content] of Object.entries(suitContent)) {
    assert.equal(content.essay.length, 3, `${slug} does not have three paragraphs`);
  }
});

test("every suit's key themes are three lines", () => {
  for (const [slug, content] of Object.entries(suitContent)) {
    assert.equal(content.keyThemes.length, 3, `${slug} does not have three key-theme lines`);
  }
});

test("no copy carries her line-break hyphenation", () => {
  /*
    Her frames hyphenate across a line break — `fulfill-ment`, `abun-dance` —
    which is her layout engine fitting her measure, not her spelling. This page
    wraps at its own width, so a hyphen that survived the transcription would
    appear mid-line. Matches a hyphen between two lowercase letters, which no
    real compound in her copy has (`well-being`, `clear-eyed` are fine: those
    are hers and are checked by eye, so the pattern deliberately allows a hyphen
    only where the transcription would not have introduced one).
  */
  const BROKEN = /(?:fulfill-|abun-|inten-|rela-|possi-|oppor-|enthusi-|spon-)/i;

  for (const [slug, content] of Object.entries(suitContent)) {
    const all = [...content.essay, ...content.keyThemes, ...content.closing, ...content.unfolding.body, content.spheres.love, content.spheres.career, content.spheres.money];

    for (const line of all) {
      assert.doesNotMatch(line, BROKEN, `${slug} kept a line-break hyphen: "${line}"`);
    }
  }
});

test("every suit's unfolding heading names that suit", () => {
  for (const suit of suits) {
    assert.match(
      suitContent[suit.slug].unfolding.heading,
      new RegExp(suit.label, "i"),
      `${suit.title}'s unfolding heading does not name it`,
    );
  }
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- --test-name-pattern="suit"`

Expected: FAIL — `Cannot find module './suit-content.ts'`.

- [ ] **Step 4: Write the content module**

Create `src/content/suit-content.ts`. **Copy the text verbatim from the spec's "The copy, verbatim" section** (`docs/plans/suit-pages.md`) — her spellings, her `&` vs `and`, her em-dashes, no line-break hyphens.

```ts
/**
 * The four suits' copy, transcribed from the client's frames.
 *
 * The split from `library.ts` is the one `card-content.ts` already keeps:
 * `library.ts` owns a suit's *identity* — slug, label, title, href — and this
 * module owns its *words*. A CMS would one day own this file and not that one.
 *
 * **Her copy is reproduced as drawn**, including spellings and her mixed `&`
 * and `and`. What is deliberately *not* reproduced is her line-break
 * hyphenation (`fulfill-ment`, `abun-dance`): that is her layout engine fitting
 * her own measure, and this page has a different one. `suit-content.test.ts`
 * pins that.
 *
 * **The singular in each unfolding line is hers and is stored, not derived** —
 * "each Cup", "each Pentacle", "each Sword", "each Wand". Pentacles → Pentacle
 * is regular enough to tempt a `.slice(0, -1)`; Swords → Sword and Wands → Wand
 * agree, but the whole sentence is one string anyway, so nothing is assembled.
 */
export type SuitContent = {
  /** EMOTION · INTUITION · CONNECTION — under the rule, in caps. */
  keywords: string;
  /** The three paragraphs beside the emblem. */
  essay: readonly string[];
  /** The three centred lines under the KEY THEMES rule. */
  keyThemes: readonly string[];
  spheres: { love: string; career: string; money: string };
  /** The saying between the two rules. */
  closing: readonly string[];
  unfolding: { heading: string; body: readonly string[] };
  metaDescription: string;
};

/*
  **One named export per suit**, which is the shape `card-content.ts` uses for
  its twenty-two and the reason `library.ts` can attach them by name: a missing
  export is then a compile error, where a record lookup for a slug that does not
  exist is silently `undefined` and renders the holding page.
*/
export const cups: SuitContent = {
  keywords: "EMOTION · INTUITION · CONNECTION",
  essay: [
    "The suit of Cups represents the realm of the heart—emotion, intuition, relationships, and our inner world. Cups speak to love, longing, compassion, creativity, and the feelings that shape our experience.",
    "This is a suit of receptivity and connection. Cups invite us to trust what we feel, deepen our relationships, and listen to the quiet wisdom within. They often signal love, emotional healing, creative inspiration, and meaningful connection.",
    "At their highest expression, Cups bring empathy, fulfillment, and emotional wisdom—the understanding that what moves the heart can guide us as powerfully as the mind.",
  ],
  keyThemes: [
    "emotion and intuition · love and connection",
    "relationships & compassion · creativity & imagination",
    "emotional healing & fulfillment · dreams & the subconscious",
  ],
  spheres: {
    love: "Deepens emotional connection, intimacy, and understanding. Cups encourage openness, compassion, and following the heart while remaining true to what you feel.",
    career: "Points toward meaningful work, creativity, and emotional fulfillment. Trust your instincts and consider whether the path you're on genuinely inspires you.",
    money: "Encourages an intuitive but balanced relationship with money. Let your values guide financial choices, while keeping emotion from clouding practical judgment.",
  },
  closing: ["The heart is a vessel that remembers", "what the mind has forgotten."],
  unfolding: {
    heading: "THE CUPS ARE STILL UNFOLDING",
    body: [
      "New cards will be added to the Library as they are created.",
      "Return to explore each Cup in depth—its imagery, symbolism,",
      "meaning, and place within the journey of the suit.",
    ],
  },
  metaDescription:
    "The suit of Cups in The World Tarot: emotion, intuition, connection. Cups speak to love, compassion, creativity, and the feelings that shape our experience.",
};

export const pentacles: SuitContent = {
  keywords: "ABUNDANCE · STABILITY · GROWTH",
  essay: [
    "The suit of Pentacles represents the material world—money, work, home, health, and the resources that support our lives. Pentacles ground us in what is tangible, asking us to consider what we are building, protecting, and creating for the future.",
    "This is a suit of steady growth and practical action. Pentacles speak to opportunity, prosperity, security, and the rewards that come through patience, skill, and consistent effort. They remind us that lasting abundance is cultivated over time.",
    "At their highest expression, Pentacles bring stability, self-reliance, and fulfillment—the ability to turn intention into something real, valuable, and enduring.",
  ],
  keyThemes: [
    "money and resources · work and achievement",
    "security & stability · health & well-being",
    "growth & prosperity · patience & perseverance",
  ],
  spheres: {
    love: "Favors loyalty, commitment, and relationships built on a solid foundation. Pentacles bring stability, trust, and the desire to create something lasting together.",
    career: "Signals steady progress, skill, and meaningful achievement. Consistent effort and practical choices can build lasting success and open new opportunities.",
    money: "Strongly connected to prosperity, security, and material growth. Pentacles encourage wise use of resources and building wealth with patience and purpose.",
  },
  closing: [
    "The physical world is where our intentions take form—",
    "through what we build, nurture, value, and sustain",
  ],
  unfolding: {
    heading: "THE PENTACLES ARE STILL UNFOLDING",
    body: [
      "New cards will be added to the Library as they are created.",
      "Return to explore each Pentacle in depth—its imagery, symbolism,",
      "meaning, and place within the journey of the suit.",
    ],
  },
  metaDescription:
    "The suit of Pentacles in The World Tarot: abundance, stability, growth. Pentacles ground us in money, work, home, health, and the resources that support our lives.",

};

export const swords: SuitContent = {
  keywords: "MIND · TRUTH · CLARITY",
  essay: [
    "The suit of Swords represents the realm of the mind—thought, communication, truth, and higher awareness. Swords cut through illusion, revealing what is real and demanding clarity, discernment, and conscious choice.",
    "This is a suit of focused power: the unseen force of intellect, intention, and conviction that can change the course of our lives. Swords often signal decisive moments, necessary change, and the courage to act on what we know.",
    "At their highest expression, they bring insight, purpose, and the mental strength to move forward with clarity and resolve.",
  ],
  keyThemes: [
    "intellect and reasoning · clear communication · truth & honesty",
    "decisions & discernment · boundaries & protection",
    "mental challenges & overthinking · breaking free from old patterns",
  ],
  spheres: {
    love: "Calls for honest communication, clear boundaries, and seeing a relationship as it truly is. Truth may bring understanding—or reveal what needs to change.",
    career: "Favors clear thinking, decisive action, and strategic choices. Focus and sound judgment can cut through obstacles and create a strong path forward.",
    money: "Encourages careful analysis, informed decisions, and a clear-eyed approach to finances. Look beyond emotion and act on facts, not assumptions.",
  },
  closing: ["The mind, when clear, becomes a blade of light", "that cuts through every shadow"],
  unfolding: {
    heading: "THE SWORDS ARE STILL UNFOLDING",
    body: [
      "New cards will be added to the Library as they are created.",
      "Return to explore each Sword in depth—its imagery, symbolism,",
      "meaning, and place within the journey of the suit.",
    ],
  },
  metaDescription:
    "The suit of Swords in The World Tarot: mind, truth, clarity. Swords cut through illusion, demanding discernment and the courage to act on what we know.",

};

export const wands: SuitContent = {
  keywords: "PASSION · ACTION · CREATION",
  essay: [
    "The suit of Wands represents the realm of fire—passion, energy, creativity, ambition, and the spark that moves us to act. Wands speak to inspiration and possibility, urging us to pursue what excites us and bring our ideas to life.",
    "This is a suit of movement and personal power. Wands often signal new beginnings, bold choices, growth, and the determination to move forward. Their energy can be spontaneous and intense, reminding us that inspiration becomes meaningful when we have the courage to act upon it.",
    "At their highest expression, Wands bring confidence, purpose, and creative force—the inner fire that drives us to explore, take risks, overcome challenges, and shape our own direction.",
  ],
  keyThemes: [
    "passion and inspiration · creativity and ambition",
    "action & initiative · courage & confidence",
    "growth & adventure · drive & determination",
  ],
  spheres: {
    love: "Brings passion, attraction, and renewed energy to relationships. Wands encourage openness, spontaneity, and the courage to pursue what—and whom—sets the heart alight.",
    career: "Signals ambition, opportunity, and forward momentum. Take initiative, trust your ideas, and use your creativity and confidence to pursue new possibilities.",
    money: "Encourages bold but purposeful action with finances. New opportunities may emerge through initiative, enterprise, or creative thinking—just temper enthusiasm with good judgment.",
  },
  closing: ["The fire within becomes a force in", "the world when we choose to act"],
  unfolding: {
    heading: "THE WANDS ARE STILL UNFOLDING",
    body: [
      "New cards will be added to the Library as they are created.",
      "Return to explore each Wand in depth—its imagery, symbolism,",
      "meaning, and place within the journey of the suit.",
    ],
  },
  metaDescription:
    "The suit of Wands in The World Tarot: passion, action, creation. Wands speak to inspiration, ambition, and the courage to bring our ideas to life.",
};

/** The four collected, for the tests to iterate. */
export const suitContent: Record<string, SuitContent> = { cups, pentacles, swords, wands };
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- --test-name-pattern="suit"`

Expected: PASS, six tests.

- [ ] **Step 6: Check the sphere boxes for orphans**

**The client has a standing note that no sphere box may end on a lone word.** `card-content.ts` honours it with literal U+00A0 characters joining the last two or three words of each sphere paragraph — invisible in an editor, and load-bearing. The suit copy above is transcribed without them, so the twelve suit sphere boxes (four suits × love/career/money) have no such protection.

`SpheresCarousel` sets `text-pretty`, which forbids a last line that is a single short word and handles the general case. So this is a *check*, not an automatic edit:

Run: `grep -Pc '\xc2\xa0' src/content/card-content.ts src/content/suit-content.ts`

Expected: a non-zero count for `card-content.ts`, zero for `suit-content.ts`.

Leave it at zero. Do **not** invent non-breaking spaces: hers mark the specific boxes she pointed at, and guessing where they belong is a copy change. Record in the commit message that the suit boxes rely on `text-pretty` alone, so that if the client reports an orphan on a suit page the fix is known — join that phrase with U+00A0, the way `card-content.ts` does.

- [ ] **Step 7: Commit**

```bash
git add src/lib/assets.ts src/content/suit-content.ts src/content/suit-content.test.ts
git commit -m "feat(library): add the four suits' copy and sheet accessors

The sphere boxes carry no U+00A0 joins, unlike card-content.ts: hers mark
boxes the client named, and these rely on text-pretty alone until she
points at one."
```

---

### Task 3: The SEO URLs

**Files:**
- Modify: `src/content/library.ts`
- Modify: `src/content/card-path.test.ts`
- Rename: the four route directories

**Interfaces:**
- Consumes: `suitPath` (already in `library.ts`).
- Produces: `SUIT_PATH_PATTERN`; `suits[].href` now equal to `suitPath(suit)`.

- [ ] **Step 1: Write the failing tests**

Append to `src/content/card-path.test.ts`:

```ts
test("every suit's path follows the issue's SEO pattern", () => {
  for (const suit of suits) {
    assert.match(suitPath(suit), SUIT_PATH_PATTERN, `${suit.title} has a malformed path`);
  }
});

test("a suit's href is its SEO path", () => {
  for (const suit of suits) {
    assert.equal(suit.href, suitPath(suit), `${suit.title} still links at its old URL`);
  }
});

test("suit slugs are lowercase, hyphenated, and free of special characters", () => {
  for (const suit of suits) {
    assert.match(suit.slug, /^[a-z]+(?:-[a-z]+)*$/, `${suit.title} has a malformed slug`);
  }
});

test("the four suit paths are distinct", () => {
  assert.equal(new Set(suits.map(suitPath)).size, suits.length);
});

test("suit paths use the client's -tarot-suit-meaning suffix", () => {
  for (const suit of suits) {
    assert.ok(suitPath(suit).endsWith("-tarot-suit-meaning/"), `${suit.title} has the wrong suffix`);
  }
});

test("a suit path is not a card path", () => {
  /*
    Both live under `/library/`, and `[card]` would answer a suit URL if the
    static segment did not win. `findMajorArcanaByPath` must not resolve one.
  */
  for (const suit of suits) {
    const segment = suitPath(suit).slice("/library/".length, -1);

    assert.equal(findMajorArcanaByPath(segment), undefined, `${suit.title} resolves as a card`);
  }
});
```

Add `SUIT_PATH_PATTERN` to the existing import from `./library.ts`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --test-name-pattern="suit"`

Expected: FAIL — `SUIT_PATH_PATTERN` is not exported, and `suit.href` is `/library/cups/`.

- [ ] **Step 3: Apply the pattern in `library.ts`**

Add beside `CARD_PATH_PATTERN`:

```ts
/** The suit equivalent of `CARD_PATH_PATTERN`, for the same reason: the brief is checked, not restated. */
export const SUIT_PATH_PATTERN = /^\/library\/[a-z]+(?:-[a-z]+)*-tarot-suit-meaning\/$/;
```

Replace the four hand-written `href`s so each is derived. `suitPath` is declared below `suits` today, and a `const` cannot be read before its initialiser runs — so move the `SUIT_SUFFIX`/`suitPath` declarations above `suits`, or build the array with a helper:

```ts
/**
 * The four suits, each of which gets **one** reference page describing the suit
 * — not a page per card.
 *
 * **`href` is derived rather than written**, so the SEO pattern lives in
 * `suitPath` alone. It was four literals at `/library/{slug}/` while the pages
 * were placeholders; applying the pattern was always "this one line plus four
 * directory moves", and this is that line.
 */
export const suits: readonly Suit[] = [
  { slug: "swords", label: "SWORDS", title: "Swords" },
  { slug: "cups", label: "CUPS", title: "Cups" },
  { slug: "wands", label: "WANDS", title: "Wands" },
  { slug: "pentacles", label: "PENTACLES", title: "Pentacles" },
].map((suit) => ({ ...suit, href: `/library/${suit.slug}${SUIT_SUFFIX}/` }));
```

Update the `suitPath` docblock: it says "confirmed, and not yet applied" and that the routes "still answer at `/library/swords/`". Both are now false. Replace with a note that it is the single spelling of the pattern and that `suits[].href` is derived from it.

- [ ] **Step 4: Rename the four route directories**

```bash
cd "src/app/(site)/library"
git mv cups cups-tarot-suit-meaning
git mv swords swords-tarot-suit-meaning
git mv wands wands-tarot-suit-meaning
git mv pentacles pentacles-tarot-suit-meaning
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- --test-name-pattern="suit"`

Expected: PASS.

- [ ] **Step 6: Check no stale link survives**

This is Review Focus #3 — a missed link is a 404 that no test would catch.

Run: `grep -rn "/library/\(cups\|swords\|wands\|pentacles\)/" src/ --include="*.ts" --include="*.tsx"`

Expected: no output. If `content/site.ts` or any other file holds one, fix it now.

- [ ] **Step 7: Build to confirm the routes export**

Run: `npm run build`

Expected: the four `library/*-tarot-suit-meaning` routes listed; no `library/cups`.

- [ ] **Step 8: Assert the export, rather than reading it**

The spec requires that the four routes are in the static export and the old four are not. The build log says so once; a test says so every run. Append to `src/content/card-path.test.ts`:

```ts
test("every suit's route directory exists at its SEO path", async () => {
  /*
    The route *is* the directory name under `app/(site)/library/`, so this
    checks the rename actually happened rather than trusting the href. A suit
    whose href moved but whose folder did not would 404 — and `dynamicParams =
    false` on `[card]` means it 404s silently rather than falling through.
  */
  const { access } = await import("node:fs/promises");
  const { join } = await import("node:path");

  for (const suit of suits) {
    const segment = suitPath(suit).slice("/library/".length, -1);
    const dir = join(process.cwd(), "src", "app", "(site)", "library", segment);

    await assert.doesNotReject(access(dir), `${suit.title} has no route directory at ${segment}`);
  }
});

test("no suit answers at its old bare path", async () => {
  const { access } = await import("node:fs/promises");
  const { join } = await import("node:path");

  for (const suit of suits) {
    const dir = join(process.cwd(), "src", "app", "(site)", "library", suit.slug);

    await assert.rejects(access(dir), `${suit.title} still has a directory at /library/${suit.slug}/`);
  }
});
```

Run: `npm test -- --test-name-pattern="route directory|old bare path"`

Expected: PASS, two tests.

- [ ] **Step 9: Commit**

```bash
git add -A src/content src/app
git commit -m "feat(library): move the suits onto their SEO URLs"
```

---

### Task 4: `CardHeader` takes primitives

**Files:**
- Modify: `src/components/library/card/CardHeader.tsx`
- Modify: `src/components/library/card/CardReferencePage.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `CardHeader({ heading, eyebrow }: { heading: string; eyebrow?: ReactNode })`
  - `Keywords({ keywords }: { keywords: string })`, extracted from `CardEssay`

**Why:** the suit frame draws this exact block — name, green rule — without a numeral. `CardHeader` reaches into `card.numeral`/`card.name`, which is the only thing stopping a suit page from calling it.

**`CardHeader` does NOT render the keywords.** It is numeral, name, rule. The keyword line lives in `CardEssay`, and it carries a rule that must not be lost: it splits on the bare `•` rather than `" • "`, because The Emperor's line reads `authority •structure • leadership` — a missing space that ships verbatim at the client's instruction — and a space-delimited split welds `authority •structure` into one unbreakable phrase. Her suit keywords use the same separator (`EMOTION · INTUITION · CONNECTION`), so the suit page needs that same splitting rather than a plain string.

So this task does two things: narrow `CardHeader`, and lift the keyword line out of `CardEssay` into a `Keywords` component both pages call. Neither changes rendered output.

- [ ] **Step 1: Narrow `CardHeader`'s props**

```tsx
/**
 * A reference page's opening block: the numeral, the name and the rule under it.
 *
 * **Props are primitives rather than a card**, because a suit's page draws the
 * same block with no numeral. `eyebrow` is optional for exactly that: a card
 * passes its Roman numeral, a suit passes nothing.
 *
 * The keyword line under this rule is **not** here — it is `Keywords`, which
 * both page kinds call, because the bullet splitting it carries is worth
 * exactly one implementation.
 */
export function CardHeader({ heading, eyebrow }: { heading: string; eyebrow?: ReactNode }) {
```

Replace `card.numeral` with `eyebrow`, `card.name` with `heading`, guarding the eyebrow:

```tsx
{eyebrow ? (
  <p className="font-serif text-card-lead leading-none tracking-[0.01em] text-card-ink">{eyebrow}</p>
) : null}
```

- [ ] **Step 2: Extract `Keywords` from `CardEssay`**

Create `src/components/library/card/Keywords.tsx` by **moving** the keyword `<p>` out of `CardEssay.tsx` unchanged — the element, its classes, the `.split("•")` chain and the comment explaining The Emperor:

```tsx
import { Fragment } from "react";

/**
 * The keyword line under a reference page's first rule — "WILL • FOCUS •
 * CREATION" on a card, "EMOTION · INTUITION · CONNECTION" on a suit.
 *
 * **Lifted out of `CardEssay` so both page kinds share one implementation**,
 * and the splitting below is the reason it was worth lifting rather than
 * retyping: it splits on the bare separator, not on `" • "`. The Emperor's line
 * reads "authority •structure • leadership" — a missing space that ships
 * verbatim at the client's instruction — and a space-delimited split welds
 * "authority •structure" into one unbreakable phrase.
 *
 * Her suit frames use `·` where her card frames use `•`, so both are split on.
 */
export function Keywords({ keywords }: { keywords: string }) {
  const parts = keywords
    .split(/[•·]/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <p className="mx-auto max-w-[22rem] text-balance text-center font-serif text-card-lead uppercase leading-none tracking-[0.01em] text-card-ink lg:max-w-none">
      {parts.map((phrase, index) => (
        <Fragment key={phrase}>
          {index > 0 && " • "}
          <span className="whitespace-nowrap">{phrase}</span>
        </Fragment>
      ))}
    </p>
  );
}
```

**Check the separator the join uses against her suit frames before committing.** The card pages join with `" • "`; if her suit frames draw `·` rather than `•` in the rendered line, the join must be per-page rather than hard-coded — pass it as a prop in that case rather than changing what the card pages render.

In `CardEssay.tsx`, replace the moved block with `<Keywords keywords={content.keywords} />`.

- [ ] **Step 3: Update the call sites**

In `CardReferencePage.tsx`:

```tsx
<CardHeader heading={card.name} eyebrow={card.numeral} />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 5: Build**

Run: `npm run build`

Expected: success. The card pages render identically — this is a prop change, not a behaviour change.

- [ ] **Step 6: Commit**

```bash
git add src/components/library/card/CardHeader.tsx src/components/library/card/CardReferencePage.tsx
git commit -m "refactor(library): CardHeader takes primitives so a suit page can use it"
```

---

### Task 5: `LookFor` takes a label

**Files:**
- Modify: `src/components/library/card/LookFor.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: nothing new.
- Produces: `LookFor({ lines, label }: { lines: readonly string[]; label?: string })`, defaulting to `"LOOK FOR:"`.

**Why the CSS changes too:** the rule is a single image with a transparent band masked through its middle, sized `--look-for-gap: 12ch` for the nine characters of "LOOK FOR:". A longer label would not fit the gap and would sit on the line. "KEY THEMES" is ten characters, so the gap must follow the label rather than be fixed. This is Review Focus #4.

- [ ] **Step 1: Write the failing test**

Create `src/components/library/card/look-for.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { lookForGap } from "./LookFor.tsx";

test("the gap clears the label plus breathing room", () => {
  assert.equal(lookForGap("LOOK FOR:"), "12ch");
});

test("a longer label gets a wider gap", () => {
  /*
    The rule's cut is sized in `ch` against the label's own font, so the number
    is the label's length plus clearance. "KEY THEMES" is ten characters and
    must not sit on the line the way it would at a fixed 12ch.
  */
  assert.equal(lookForGap("KEY THEMES"), "13ch");
});

test("the gap never narrows below the default", () => {
  assert.equal(lookForGap("SEE:"), "12ch");
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --test-name-pattern="gap"`

Expected: FAIL — `lookForGap` is not exported.

- [ ] **Step 3: Implement**

In `LookFor.tsx`:

```tsx
/**
 * The width to cut out of the rule for a label of this length.
 *
 * The mask is sized in `ch` against the rule's own copy of the label's font, so
 * one `ch` here is one character there — see `.look-for__rule` in globals.css.
 * Three characters of clearance is what "LOOK FOR:" was tuned with, and the
 * floor keeps a short label from pulling the cut tighter than the design.
 *
 * Exported for its test: the arithmetic is the whole reason a longer label does
 * not end up sitting on the line.
 */
export function lookForGap(label: string): string {
  return `${Math.max(12, label.length + 3)}ch`;
}

export function LookFor({ lines, label = "LOOK FOR:" }: { lines: readonly string[]; label?: string }) {
```

Set the property on the element carrying `.look-for__rule`:

```tsx
style={{ "--look-for-gap": lookForGap(label) } as React.CSSProperties}
```

and render `{label}` where `LOOK FOR:` is hard-coded.

In `globals.css`, make the declared value a fallback and note why:

```css
    /*
      The default, for a caller that sets nothing. `LookFor` overrides it inline
      from the label's own length — "KEY THEMES" on the suit pages is longer
      than "LOOK FOR:" and would sit on the line at a fixed 12ch. See
      `lookForGap` in LookFor.tsx.
    */
    --look-for-gap: 12ch;
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- --test-name-pattern="gap"`

Expected: PASS, three tests.

- [ ] **Step 5: Build**

Run: `npm run build`

Expected: success; card pages unchanged (they pass no label, so they get the default).

- [ ] **Step 6: Commit**

```bash
git add src/components/library/card/LookFor.tsx src/components/library/card/look-for.test.ts src/app/globals.css
git commit -m "feat(library): LookFor takes a label, and the rule's gap follows it"
```

---

### Task 6: The suit page's own blocks

**Files:**
- Create: `src/components/library/suit/SuitIntro.tsx`
- Create: `src/components/library/suit/StillUnfolding.tsx`
- Create: `src/components/library/suit/README.md`

**Interfaces:**
- Consumes: `CardHeader` and `Keywords` (Task 4), `SuitContent` (Task 2).
- Produces:
  - `SuitIntro({ title, content }: { title: string; content: SuitContent })`
  - `StillUnfolding({ heading, body }: { heading: string; body: readonly string[] })`

- [ ] **Step 1: Write `SuitIntro`**

```tsx
import { CardHeader } from "@/components/library/card/CardHeader";
import { Keywords } from "@/components/library/card/Keywords";
import type { SuitContent } from "@/content/suit-content";

/**
 * A suit page's opening block: the name, the rule, the keywords and the three
 * paragraphs — with the emblem's room beside them.
 *
 * **The left column is empty on purpose, and that is the whole layout.** Her
 * emblem — the chalice, the pouch, the sword, the torch — is painted *into the
 * parchment*, in exactly the band where a card's tile sits on a card reference
 * page. So this is that page's two-column arrangement with nothing in the first
 * column: the sheet supplies the picture, and the prose sits beside it.
 *
 * That is why this is not `CardEssay`. That component draws the card tile — the
 * plaque, the name laid into it, the long-name rule, the `25.1vw` cap that
 * leaves the prose a measure — and a suit has none of those things. Reusing it
 * would mean a prop that switches off most of what it does.
 *
 * **The type is `CardEssay`'s**, deliberately: `text-pretty` against the
 * client's note about single words stranded on a line, `--text-card-label` for
 * its 22/18, and the same gap between paragraphs. Her suit frames set the prose
 * identically to her card frames.
 *
 * Below `xl` the empty column collapses and the prose runs the full measure,
 * which is where the phone sheet's own emblem placement takes over — see
 * `suitPaperMobile`.
 */
export function SuitIntro({ title, content }: { title: string; content: SuitContent }) {
  return (
    <div className="flex flex-col">
      <CardHeader heading={title} />

      {/*
        Her keyword line, in the same component the card pages use — see
        `Keywords` for why the bullet splitting is shared rather than retyped.
        The gap is `CardEssay`'s own, since her suit frames set it identically.
      */}
      <div className="mt-[clamp(calc(0.875rem*var(--card-scale)),calc(2.917vw*var(--card-scale)),calc(3.5rem*var(--card-scale)))]">
        <Keywords keywords={content.keywords} />
      </div>

      <div className="mt-[clamp(calc(0.547rem*var(--card-scale)),calc(1.823vw*var(--card-scale)),calc(2.188rem*var(--card-scale)))] flex flex-col items-center gap-[clamp(calc(0.75rem*var(--card-scale)),calc(1.46vw*var(--card-scale)),calc(1.75rem*var(--card-scale)))] xl:flex-row xl:items-start">
        {/*
          The emblem's room. It draws nothing — the parchment behind it already
          carries her artwork — and exists so the prose column starts where her
          frame starts it. `aria-hidden` because there is nothing here to
          announce; the emblem is decoration painted into the page's background.

          The share is the one `CardEssay` gives the card tile at `xl`, so the
          prose on a suit page and the prose on a card page begin at the same x.
        */}
        <span aria-hidden className="hidden shrink-0 xl:block xl:w-[min(14.5rem,25.1vw)]" />

        <div className="flex min-w-0 flex-col gap-[clamp(calc(0.75rem*var(--card-scale)),calc(1.46vw*var(--card-scale)),calc(1.75rem*var(--card-scale)))]">
          {content.essay.map((paragraph) => (
            <p
              key={paragraph}
              className="text-pretty text-center font-light text-card-label tracking-[0.01em] text-card-ink-soft xl:text-left"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `StillUnfolding`**

```tsx
/**
 * The block that closes a suit page: a bold line saying the suit is not
 * finished, over the note about cards arriving.
 *
 * **This is her design for the page as it stands, not a placeholder of ours.**
 * The fifty-six Minor Arcana have neither copy nor artwork, and rather than
 * leave the question hanging her frame answers it in the page. When those cards
 * land, this is where their grid goes.
 *
 * The copy is per suit because the singular is — "each Cup", "each Pentacle" —
 * so both lines are stored whole in `suit-content.ts` and nothing is assembled
 * from the suit's name.
 */
export function StillUnfolding({ heading, body }: { heading: string; body: readonly string[] }) {
  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="font-serif text-card-lead font-bold leading-none tracking-[0.02em] text-card-ink">
        {heading}
      </h2>

      {/*
        Her line breaks, kept. The block is three short centred lines in every
        frame rather than a paragraph that wraps, so each is its own element —
        the same reasoning as `ClosingSaying`'s `saying` array.
      */}
      <div className="mt-[clamp(calc(0.5rem*var(--card-scale)),calc(1.04vw*var(--card-scale)),calc(1.25rem*var(--card-scale)))] flex flex-col">
        {body.map((line) => (
          <p key={line} className="font-light text-card-label tracking-[0.01em] text-card-ink-soft">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the README**

Create `src/components/library/suit/README.md` recording: that the emblem is in the parchment so there is no emblem component; that `CardEssay` is deliberately not reused and why; that `CardHeader`, `LookFor`, `SpheresCarousel` and `ClosingSaying` are shared with the card pages, so a change to any of them lands on both.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/library/suit
git commit -m "feat(library): add the suit page's intro and unfolding blocks"
```

---

### Task 7: The page, and the route

**Files:**
- Create: `src/components/library/suit/SuitReferencePage.tsx`
- Modify: `src/components/library/SuitPage.tsx`
- Modify: `src/content/library.ts` (add `content` to `Suit`)
- Modify: the four `page.tsx` files

**Interfaces:**
- Consumes: everything from Tasks 2, 4, 5, 6.
- Produces: `SuitReferencePage({ suit, content }: { suit: Suit; content: SuitContent })`.

- [ ] **Step 1: Give `Suit` its content**

In `library.ts`:

```ts
export type Suit = {
  readonly slug: string;
  readonly label: string;
  readonly title: string;
  readonly href: string;
  /**
   * Her copy for this suit, if it exists.
   *
   * **Optional for the same reason `MajorArcanaCard.content` is**: a suit whose
   * words have not arrived still has a route, and answers with the holding page
   * rather than a 404. All four carry copy today, so the empty arm is
   * unreachable — it costs one line and makes a suit whose copy is pulled a
   * content change rather than a code change.
   */
  readonly content?: SuitContent;
};
```

Attach it the way the twenty-two cards already attach theirs — **a named import per suit, not a record lookup**:

```ts
import { cups, pentacles, swords, wands, type SuitContent } from "@/content/suit-content";
```

```ts
export const suits: readonly Suit[] = [
  { slug: "swords", label: "SWORDS", title: "Swords", href: `/library/swords${SUIT_SUFFIX}/`, content: swords },
  { slug: "cups", label: "CUPS", title: "Cups", href: `/library/cups${SUIT_SUFFIX}/`, content: cups },
  { slug: "wands", label: "WANDS", title: "Wands", href: `/library/wands${SUIT_SUFFIX}/`, content: wands },
  { slug: "pentacles", label: "PENTACLES", title: "Pentacles", href: `/library/pentacles${SUIT_SUFFIX}/`, content: pentacles },
];
```

This matches `majorArcana` exactly — `{ slug: "the-fool", …, content: theFool }` — and it is better than the `Record` lookup an earlier draft of this plan used: a missing export is a compile error here, where `suitContent["cusp"]` is silently `undefined` and renders the holding page. **`SUIT_SUFFIX` must be declared above this array**, since a `const` cannot be read before its initialiser runs.

Direction of imports: `library.ts` imports from `suit-content.ts`, and `suit-content.ts` imports nothing from `library.ts`. That is the same direction `card-content.ts` has, and it is what keeps this out of a cycle.

**This changes Task 2's module shape**: export the four as named consts (`export const cups: SuitContent = {…}`) rather than only as a `suitContent` record. Keep the record too if the tests read it — `export const suitContent = { cups, pentacles, swords, wands }` — so `suit-content.test.ts` as written still works.

Then make `suitMeta` prefer her own description over the generated sentence:

```ts
export function suitMeta(slug: string): { title: string; description: string } {
  const suit = findSuit(slug);

  if (!suit) {
    throw new Error(`Unknown suit "${slug}"`);
  }

  return {
    title: suit.title,
    /*
      Hers when she has written one, the generated sentence otherwise. The
      fallback is what every suit answered with while the pages were
      placeholders; it stays for the same reason the holding page does.
    */
    description:
      suit.content?.metaDescription ??
      `The suit of ${suit.title} in the Minor Arcana of The World Tarot.`,
  };
}
```

**The four `page.tsx` files need no edit** beyond Task 3's directory rename: they call `suitMeta(slug)` and render `<SuitPage slug={slug} />`, and neither signature changes. Confirm this rather than assuming — `grep -n "suitMeta\|SuitPage" "src/app/(site)/library/cups-tarot-suit-meaning/page.tsx"`.

- [ ] **Step 2: Write the page**

```tsx
import { CardHeader } from "@/components/library/card/CardHeader";
import { LookFor } from "@/components/library/card/LookFor";
import { SpheresCarousel } from "@/components/library/card/SpheresCarousel";
import { StillUnfolding } from "@/components/library/suit/StillUnfolding";
import { SuitIntro } from "@/components/library/suit/SuitIntro";
import { Container, Section } from "@/components/layout/Section";
import { LibraryIntro } from "@/components/library/LibraryIntro";
import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { ClosingSaying } from "@/components/readings/ClosingSaying";
import type { Suit } from "@/content/library";
import type { SuitContent } from "@/content/suit-content";
import { suitPaper, suitPaperMobile } from "@/lib/assets";

/**
 * A suit's reference page — one per suit, describing the suit rather than its
 * cards.
 *
 * **It is the card reference page's structure with her suit blocks in it**, and
 * it shares that page's whole measurement system: `--card-scale`,
 * `--measure-card-paper`, `.card-paper` and `.card-reading-ground` all apply
 * unchanged, because her suit frames are the same 1920x3237 and put the sheet
 * in the same box. See `CardReferencePage` for why those exist; nothing about
 * them is re-derived here.
 *
 * **Her sheets are wider than a card's** — about 1460 against 1337 — which
 * costs nothing: `.card-paper` is a box the image fills, so a sheet's own width
 * is only its aspect, and all four suits share one. The aspect is checked at
 * conversion time (`scripts/optimize-suit-assets.mjs`) because an export
 * trimmed to layer bounds breaks it, and did once.
 *
 * **What this page does not have**: no numeral, no `AppearsPanel`, no
 * `ShadowPanel`, no `MetaStrip` — a suit has no element, planet, sign or
 * yes/no — and no emblem component, because her emblems are painted into the
 * parchments.
 */
export function SuitReferencePage({ suit, content }: { suit: Suit; content: SuitContent }) {
  return (
    <div className="library-card-page min-h-full pb-[clamp(calc(3rem*var(--card-scale)),calc(8.9vw*var(--card-scale)),calc(10.7rem*var(--card-scale)))]">
      {/* Not `relative` — see the note in `CardReferencePage`, which this page follows exactly. */}
      <PageAtmosphere variant="card-reference" />

      {/*
        The Library's own navigation, above the sheet and marking which suit
        this is. Her frame draws neither it nor the masthead, the same way her
        card frame draws no masthead: a visitor arriving from a search has to be
        able to reach the other three suits and the grid, and this strip is how
        the rest of the Library already does that.
      */}
      <LibraryIntro current={suit.slug} />

      <div
        className="card-paper mt-[clamp(calc(1.5rem*var(--card-scale)),calc(5.28vw*var(--card-scale)),calc(6.34rem*var(--card-scale)))] pb-[clamp(calc(3.813rem*var(--card-scale)),calc(12.708vw*var(--card-scale)),calc(15.25rem*var(--card-scale)))]"
        data-paper-mobile=""
        style={
          {
            "--card-paper": `url("${suitPaper(suit.slug)}")`,
            "--card-paper-mobile": `url("${suitPaperMobile(suit.slug)}")`,
          } as React.CSSProperties
        }
      >
        <Section padding="none" className="pt-[clamp(calc(1.969rem*var(--card-scale)),calc(6.563vw*var(--card-scale)),calc(7.875rem*var(--card-scale)))]">
          <Container width="card">
            <div className="card-reading-ground">
              <SuitIntro title={suit.title} content={content} />
            </div>
          </Container>
        </Section>

        <Section padding="none" className="mt-[clamp(calc(1.25rem*var(--card-scale)),calc(3.6vw*var(--card-scale)),calc(4.25rem*var(--card-scale)))]">
          <Container width="cardWide">
            <div className="card-reading-ground">
              <LookFor label="KEY THEMES" lines={content.keyThemes} />
            </div>
          </Container>
        </Section>

        <Section padding="none" className="mt-[clamp(calc(0.547rem*var(--card-scale)),calc(1.823vw*var(--card-scale)),calc(2.188rem*var(--card-scale)))]">
          <Container width="cardWide">
            <SpheresCarousel cardName={suit.title} spheres={content.spheres} />
          </Container>
        </Section>

        {/* Her frame draws the saying between two rules with no button, as the card pages do. */}
        <ClosingSaying
          className="mt-[clamp(calc(0.313rem*var(--card-scale)),calc(1.042vw*var(--card-scale)),calc(1.25rem*var(--card-scale)))]"
          saying={content.closing}
          action={null}
          width="cardClosing"
          rule="green"
          tone="ink"
          hugRule
        />

        <Section padding="none" className="mt-[clamp(calc(0.5rem*var(--card-scale)),calc(1.25vw*var(--card-scale)),calc(1.5rem*var(--card-scale)))]">
          <Container width="card">
            <StillUnfolding heading={content.unfolding.heading} body={content.unfolding.body} />
          </Container>
        </Section>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Route to it**

Rewrite `src/components/library/SuitPage.tsx`:

```tsx
import { ComingSoonPage } from "@/components/library/ComingSoonPage";
import { SuitReferencePage } from "@/components/library/suit/SuitReferencePage";
import { comingSoon, findSuit } from "@/content/library";

/**
 * A suit's page: her reference page when the copy exists, the holding page
 * when it does not.
 *
 * **The branch is the one the card route already has** and it is unreachable
 * today — all four suits carry copy. It stays for the same reason the card
 * route's does: a suit whose words are pulled should answer, not 404.
 */
export function SuitPage({ slug }: { slug: string }) {
  const suit = findSuit(slug);

  if (!suit) {
    throw new Error(`Unknown suit "${slug}"`);
  }

  if (!suit.content) {
    return <ComingSoonPage heading={suit.title} message={comingSoon.suit} current={suit.slug} />;
  }

  return <SuitReferencePage suit={suit} content={suit.content} />;
}
```

- [ ] **Step 4: Write the fallback test**

This is Review Focus #1 and #2. Create `src/content/suit-page.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { findSuit, suitMeta, suits, type Suit } from "./library.ts";

test("an unknown suit is not found", () => {
  assert.equal(findSuit("hearts"), undefined);
});

test("an unknown suit's metadata throws rather than rendering empty", () => {
  assert.throws(() => suitMeta("hearts"), /Unknown suit/);
});

test("every suit's metadata prefers her own description", () => {
  for (const suit of suits) {
    const { description } = suitMeta(suit.slug);

    assert.equal(description, suit.content?.metaDescription, `${suit.title} has a generated description`);
  }
});

test("a suit with no content falls back to the generated description", () => {
  /*
    The holding-page arm. Unreachable while all four carry copy, which is why it
    is asserted on a constructed suit rather than a real one — the branch exists
    so a suit whose words are pulled answers instead of crashing.

    Typed as `Suit` so the optional `content` is a real absence rather than an
    excess property on an inferred literal.
  */
  const orphan: Suit = {
    slug: "hearts",
    label: "HEARTS",
    title: "Hearts",
    href: "/library/hearts-tarot-suit-meaning/",
  };

  assert.equal(orphan.content, undefined);
});
```

- [ ] **Step 5: Run the tests**

Run: `npm test`

Expected: PASS, every suite.

- [ ] **Step 6: Build**

Run: `npm run build`

Expected: four `library/*-tarot-suit-meaning` routes, no errors.

- [ ] **Step 7: Commit**

```bash
git add -A src/components/library src/content
git commit -m "feat(library): build the four suit reference pages"
```

---

### Task 8: LIBRARY becomes a nav group

**Files:**
- Modify: `src/content/site.ts`
- Create: `src/content/nav.test.ts`

**Interfaces:**
- Consumes: `suits`, `majorArcanaNav` from `library.ts`.
- Produces: `primaryNav`'s LIBRARY entry as a `NavGroup`.

**Why no component changes:** `NavDropdown` is already generic over any `NavGroup` and `SiteHeader` already branches on `"children" in item`. Hover-to-open, the chevron for touch, the drawer's indented rows and the keyboard handling all come for free.

- [ ] **Step 1: Write the failing test**

```ts
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

test("every dropdown row points at a built route", () => {
  assert.ok(library && "children" in library);

  for (const child of library.children) {
    assert.match(child.href, /\/$/, `${child.label} is missing its trailing slash`);
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --test-name-pattern="LIBRARY|dropdown"`

Expected: FAIL — LIBRARY is a plain `NavLink`.

- [ ] **Step 3: Make it a group**

In `site.ts`, import `majorArcanaNav` and `suits`, and replace the LIBRARY entry:

```ts
  {
    /**
     * **The label navigates and the panel opens**, the arrangement READINGS
     * already has: LIBRARY goes to the grid, hovering it offers the four suits.
     *
     * **The first row is a deliberate redundancy**, asked for by the client.
     * The note on `NavGroup` above records that READINGS dropped its OVERVIEW
     * child because a row repeating the group's own destination was that
     * destination offered twice — which this row is. It is labelled MAJOR
     * ARCANA rather than LIBRARY so it reads as the thing it points at, the
     * grid, rather than as an echo of the label above it. That is also what
     * `SuitNav` calls the same link.
     *
     * The children are built from `majorArcanaNav` and `suits` rather than
     * written out, so this panel and the strip above the grid cannot drift
     * apart — and so the suits' SEO URLs are spelled in `library.ts` alone.
     */
    label: "LIBRARY",
    href: "/library/",
    children: [majorArcanaNav, ...suits.map(({ label, href }) => ({ label, href }))],
  },
```

- [ ] **Step 4: Run the tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Build**

Run: `npm run build`

Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/content/site.ts src/content/nav.test.ts
git commit -m "feat(nav): LIBRARY opens the suits and still goes to the Library"
```

---

### Task 9: Documentation and whole-branch check

**Files:**
- Modify: `src/components/library/README.md`
- Modify: `docs/plans/suit-pages.md` (mark implemented)

- [ ] **Step 1: Update the library README**

Record: the suits now have real pages at their SEO URLs; `SuitPage` routes to `SuitReferencePage` or the holding page; the emblems are in the parchments; `CardHeader` and `LookFor` are shared across both page kinds, so a change to either lands on both.

- [ ] **Step 2: Full test run**

Run: `npm test`

Expected: all suites pass. Record the count.

- [ ] **Step 3: Lint**

Run: `npm run lint`

Expected: clean.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 5: Build and check the route list**

Run: `npm run build`

Expected: four `library/*-tarot-suit-meaning/` routes present; no bare `library/cups/` etc.

- [ ] **Step 6: Confirm no stale suit URL survives anywhere**

Run: `grep -rn "library/\(cups\|swords\|wands\|pentacles\)/" src/ docs/ --include="*.ts" --include="*.tsx" --include="*.md" | grep -v "tarot-suit-meaning"`

Expected: no output outside the spec's own history note.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs(library): record the suit pages"
```

---

## Notes for the implementer

**Do not run the dev server or take browser screenshots to check the UI.** The user verifies visually and has asked for this explicitly. Build, typecheck, lint and the unit tests are the verification available here; where a step's expected result is visual, state what you changed and let the user look.

**The clamp values in Tasks 6 and 7 are carried from `CardReferencePage`**, because her suit frames and her card frames set the same rhythm. They are a starting point measured off the card page, not off her suit frames — if the user reports the spacing reads wrong against her mockups, those are the numbers to tune, and each should then be re-derived from her suit frame as `figure` max / `figure / 19.2` vw.

**`SpheresCarousel` takes a `cardName` prop** used for its accessible labelling. A suit passes its title, so the label reads "Cups" where a card's reads "The Fool". If its internal copy says "card" anywhere user-visible, raise it rather than silently generalising it — that is a copy change and belongs to the client.
