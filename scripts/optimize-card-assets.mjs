/**
 * Re-encodes the card reference page's artwork for the web.
 *
 * The same job `optimize-library-cards.mjs` does for the deck, and for the same
 * reason: `next.config.mjs` sets `images.unoptimized: true`, so the export is
 * static, Next's optimiser never runs, and whatever is referenced ships byte
 * for byte. The sources here are ~19MB of PNG, most of it the two full-frame
 * background layers.
 *
 * **The sources are the client's own PSD layers** (`asset dump/REF PAGE
 * ASSETS/`), exported by her from `THE FOOL 2 FLAT.psd`, and that matters more
 * here than anywhere else on the site. The first build of this page pulled the
 * same artwork out of Figma and got it wrong twice over: `rawImages` returns
 * these layers *untinted* — the meta symbols come back as pure black
 * silhouettes rather than the grey-taupe the page shows — and even the composed
 * node renders are flattened approximations that lose the layers' own alpha.
 * The rotunda warning in `src/components/library/README.md` is the same lesson.
 *
 * **Her filenames are PSD layer names**, so they are mapped to slugs here and
 * appear nowhere else — the pattern `optimize-library-cards.mjs` uses for the
 * deck's inconsistent zero-padding.
 *
 * Unlike `assets:fetch`/`assets:optimize` (local-only, gitignored — see
 * README.md), this needs no credentials and nothing outside the repo, so it is
 * committed: re-running it is the documented way to redo this conversion.
 *
 *   node scripts/optimize-card-assets.mjs
 */

import { mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE = resolve(root, "..", "asset dump", "REF PAGE ASSETS");
const DEST = join(root, "public", "figma", "card-reference");

/**
 * Her PSD layer names, mapped to the slugs the code uses.
 *
 * `THE FOOL 2 FLAT` is the flattened reference render of the whole frame. It is
 * deliberately **not** converted: it is what the page should look like, not
 * something the page draws.
 *
 * **Her `FRAME` layer is in the same position now**, though for a different
 * reason: the gold ornament it holds was dropped from the page at the client's
 * request, so a run should leave it in the PSD rather than write an asset
 * nothing imports. Both entries go together if it ever comes back — the slug
 * here and its width below — because a source with no width throws.
 */
const SLUGS = {
  "Layer 3": "page-base", // the opaque ground, full bleed
  "Layer 20": "page-wash", // the forest wash over it, slight overhang
  "BACKGROUND TO ELEMENTS": "meta-strip-bg", // the pale strip behind the meta row
  "DIVIDER 1": "divider-green", // her green rule, drawn three times
  "DIVIDER 2": "divider-gold", // the gold rule under each column label
  "DIVIDER 1 copy": "divider-champagne", // the same rule in champagne, for the shadow panel
  'DIVIDER AROUND _LOOK FOR_': "divider-look-for", // the wider rule around LOOK FOR
  "ICON 1": "appears-icon-1",
  "ICON 2": "appears-icon-2",
  "ICON 3": "appears-icon-3",
  "ICON 4": "appears-icon-4",
  "Layer 7": "sphere-love",
  "Layer 8": "sphere-career",
  "Layer 9": "sphere-money",
  "Layer 17": "shadow-ground",
  "FOOL SILOUHETTE": "shadow-silhouette", // her spelling; the figure on the cliff
  "symbol 1": "symbol-air",
  "symbol 2": "symbol-uranus",
  "symbol 3": "symbol-aquarius",
  "symbol 4": "symbol-key",
  "symbol 5": "symbol-compass", // over YES/NO — the fifth of a uniform row
};

/** Sources that are reference material rather than page artwork. */
const IGNORE = new Set([
  "THE FOOL 2 FLAT",
  /* Sliced into three below rather than written whole. */
  "Layer 21",
  /* Only its diamond trio is used; the frame itself is drawn from tokens. */
  "LOVE DIAMOND FRAME TOP",
]);

/**
 * The width each asset is written at.
 *
 * Every value is **2x the width the frame draws that asset at**, so it stays
 * sharp on a retina display and no larger; `withoutEnlargement` leaves a source
 * alone when it is already smaller than that, which is the case for most of the
 * line art she exported at 1x.
 *
 * The two full-frame background layers are the exception and are written at 1x.
 * They are already 1920 wide — the width the frame draws them at — and doubling
 * a 1920x3237 photograph to 3840 would add several megabytes to every card page
 * for detail no one can see in a backdrop.
 *
 * A source with no entry here throws rather than being written at its own size:
 * silently shipping a 2500px asset for a 300px slot is what this table prevents.
 */
const WIDTHS = {
  "page-base": 1920, // full frame, 1x — see above
  "page-wash": 1920,
  "meta-strip-bg": 1205,
  "divider-green": 582,
  "divider-gold": 241,
  "divider-champagne": 582,
  "divider-look-for": 1203,
  "appears-icon-1": 49,
  "appears-icon-2": 64,
  "appears-icon-3": 57,
  "appears-icon-4": 51,
  "sphere-love": 738, // 369 drawn
  "sphere-career": 738,
  "sphere-money": 740, // 370 drawn
  "shadow-ground": 1216,
  "shadow-silhouette": 269, // 254 drawn; her export is already ~1x
  "symbol-air": 58,
  "symbol-uranus": 34,
  "symbol-aquarius": 51,
  "symbol-key": 80,
  "symbol-compass": 87,
};

/**
 * The backgrounds are photographs of paper and washes and tolerate a lower
 * quality than line art does; the watercolours sit between the two. Everything
 * else keeps the default, where banding on a gold rule would show.
 */
const QUALITY = {
  "page-base": 72,
  "page-wash": 72,
  "meta-strip-bg": 80,
  "sphere-love": 78,
  "sphere-career": 78,
  "sphere-money": 78,
};

await mkdir(DEST, { recursive: true });

const files = (await readdir(SOURCE)).filter((name) => name.endsWith(".png")).sort();

if (files.length === 0) {
  throw new Error(`No PNGs in ${SOURCE} — see this file's header for where they come from.`);
}

let total = 0;
let written = 0;

for (const file of files) {
  const layer = file.replace(/\.png$/, "");

  if (IGNORE.has(layer)) {
    console.log(`${layer.padEnd(20)} — reference only, not converted`);
    continue;
  }

  const stem = SLUGS[layer];

  if (!stem) {
    throw new Error(`No slug for PSD layer "${layer}" — add it to SLUGS in this script.`);
  }

  const width = WIDTHS[stem];

  if (!width) {
    throw new Error(`No width declared for "${stem}" — add it to WIDTHS in this script.`);
  }

  const info = await sharp(join(SOURCE, file))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: QUALITY[stem] ?? 82 })
    .toFile(join(DEST, `${stem}.webp`));

  total += info.size;
  written += 1;
  console.log(
    `${stem.padEnd(20)} ${String(info.width).padStart(5)}x${String(info.height).padEnd(5)} ${(info.size / 1024).toFixed(0).padStart(5)}kB`,
  );
}

/*
  The paper, sliced into three.

  `Layer 21` is a fixed 1337x2995 sheet with a torn deckle edge at top and
  bottom, and the page it backs has no fixed height — twenty-two cards will run
  to different lengths. Scaling the whole sheet to fit would stretch those torn
  edges into smears; `cover` would crop them off entirely.

  So the edges are cut off as their own strips and the flat middle is left to
  tile between them. Measured on her layer, the tearing is finished by y=20 at
  the top and starts again around y=2975 at the bottom, with every row between
  ~98% opaque and featureless — so 24px takes the whole deckle and none of the
  body.
*/
/*
  The sphere cards' diamond trio, cropped out of her frame layer.

  `LOVE DIAMOND FRAME TOP` is 373x467 and holds the card's whole rounded
  outline as well as the three diamonds astride its top edge. **Only the
  diamonds are wanted**: the rectangle is rebuilt from tokens by `OrnateFrame`
  the way every other framed panel on this site is, because a hairline stretched
  to a responsive box goes soft and a fixed-aspect image cannot follow a card
  that grows when its copy wraps. See the "Framed panels" block in globals.css.

  The trio sits at x=164..210, y=0..23 — and **her own border line runs through
  rows 11 and 12 of it**, the full width of the layer. Those two rows are
  dropped: the ring `OrnateFrame` draws is the line now, and a second one baked
  into the ornament would double it wherever the two failed to land together.

  That leaves 11 rows of diamond above the line and 11 below — the measured
  share, which is what `.ornate-crest--sphere` lifts the ornament by. The same
  approach the readings trio takes (7 of its 16px above the line), rather than
  a blind half of the height.
*/
const CREST = { file: "LOVE DIAMOND FRAME TOP.png", left: 164, width: 47, above: 11, below: 11, lineRows: 2 };

{
  const src = join(SOURCE, CREST.file);
  const [above, below] = await Promise.all([
    sharp(src).extract({ left: CREST.left, top: 0, width: CREST.width, height: CREST.above }).png().toBuffer(),
    sharp(src)
      .extract({ left: CREST.left, top: CREST.above + CREST.lineRows, width: CREST.width, height: CREST.below })
      .png()
      .toBuffer(),
  ]);

  const info = await sharp({
    create: {
      width: CREST.width,
      height: CREST.above + CREST.below,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: above, top: 0, left: 0 },
      { input: below, top: CREST.above, left: 0 },
    ])
    .webp({ quality: 90 })
    .toFile(join(DEST, "sphere-crest.webp"));

  total += info.size;
  written += 1;
  console.log(
    `${"sphere-crest".padEnd(20)} ${String(info.width).padStart(5)}x${String(info.height).padEnd(5)} ${(info.size / 1024).toFixed(0).padStart(5)}kB`,
  );
}

const PAPER = { file: "Layer 21.png", edge: 24 };

{
  const src = join(SOURCE, PAPER.file);
  const { width, height } = await sharp(src).metadata();
  const slices = [
    ["page-paper-top", 0, PAPER.edge],
    ["page-paper-mid", PAPER.edge, height - PAPER.edge * 2],
    ["page-paper-bottom", height - PAPER.edge, PAPER.edge],
  ];

  for (const [stem, top, sliceHeight] of slices) {
    const info = await sharp(src)
      .extract({ left: 0, top, width, height: sliceHeight })
      .webp({ quality: 76 })
      .toFile(join(DEST, `${stem}.webp`));

    total += info.size;
    written += 1;
    console.log(
      `${stem.padEnd(20)} ${String(info.width).padStart(5)}x${String(info.height).padEnd(5)} ${(info.size / 1024).toFixed(0).padStart(5)}kB`,
    );
  }
}

console.log(`\n${written} assets, ${(total / 1024 / 1024).toFixed(2)}MB total.`);
