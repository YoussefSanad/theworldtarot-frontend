/**
 * Re-encodes the client's Library card art for the web.
 *
 * The delivered files (`asset dump/readings page/NO PLAQUE NAME LARGER IMAGES FOR
 * LIBRARY CARDS/`) are 1280x2120 JPEGs of 1-2.4MB each. Twenty-two of them land on
 * one page, and `next.config.mjs` sets `images.unoptimized: true` — the export is
 * static, Next's optimiser never runs, and whatever is referenced ships byte for
 * byte. Referenced as delivered that is ~35MB of images to draw cards a few
 * hundred pixels wide.
 *
 * This writes 640x1060 webp instead: 2x the largest size a card reaches, so it
 * stays sharp on a retina display with room to spare.
 *
 * Unlike `assets:fetch`/`assets:optimize` (local-only, gitignored — see
 * README.md), this needs no credentials and nothing outside the repo, so it is
 * committed: re-running it is the documented way to redo this conversion when the
 * client re-cuts the art.
 *
 *   node scripts/optimize-library-cards.mjs
 */

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE = resolve(root, "..", "asset dump", "readings page", "NO PLAQUE NAME LARGER IMAGES FOR LIBRARY CARDS");
const DEST = join(root, "public", "figma", "library-cards");

/** 2x the widest a card is drawn, keeping the source's own 1280x2120 aspect. */
const WIDTH = 640;
const HEIGHT = 1060;

/**
 * The client's filenames carry her spellings and her zero-padding, which is
 * inconsistent (`0-the-fool` against `01-the-magician`). The output is renamed to
 * the card slugs `content/library.ts` uses, so the content layer never has to
 * know about either.
 */
const SLUGS = {
  "0-the-fool": "the-fool",
  "01-the-magician": "the-magician",
  "02-the-high-priestess": "the-high-priestess",
  "03-the-empress": "the-empress",
  "04-the-emporer": "the-emperor",
  "05-the-high-priest": "the-high-priest",
  "06-the-lovers": "the-lovers",
  "07-the-chariot": "the-chariot",
  "08-strength": "strength",
  "09-the-hermit": "the-hermit",
  "10-the-wheel": "the-wheel",
  "11-justice": "justice",
  "12-the-hangman": "the-hanged-man",
  "13-death": "death",
  "14-temperance": "temperance",
  "15-the-devil": "the-devil",
  "16-the-tower": "the-tower",
  "17-the-star": "the-star",
  "18-the-moon": "the-moon",
  "19-the-sun": "the-sun",
  "20-judgement": "judgement",
  "21-the-world": "the-world",
};

const files = (await readdir(SOURCE)).filter((name) => /\.jpe?g$/i.test(name)).sort();

if (files.length !== 22) {
  throw new Error(`Expected 22 card images in ${SOURCE}, found ${files.length}`);
}

await mkdir(DEST, { recursive: true });

let before = 0;
let after = 0;

for (const file of files) {
  const stem = file.replace(/\.jpe?g$/i, "");
  const slug = SLUGS[stem];

  if (!slug) {
    throw new Error(`No slug mapped for "${stem}" — add it to SLUGS and to content/library.ts`);
  }

  const source = join(SOURCE, file);
  const input = sharp(source);
  const { width, height } = await input.metadata();
  /* `metadata()` reports no `size` for file-backed input, so ask the filesystem. */
  const { size } = await stat(source);

  /*
    Every card the client delivered is 1280x2120. A different size is not
    necessarily wrong, but it would mean the plaque no longer sits where
    `TarotCardTile` places its overlay — the tile positions the name by
    percentage off measurements taken from these files — so it stops rather
    than silently shipping a card whose name lands off the plaque.
  */
  if (width !== 1280 || height !== 2120) {
    throw new Error(`${file} is ${width}x${height}, expected 1280x2120 — check the plaque geometry in TarotCardTile`);
  }

  const out = await input.resize(WIDTH, HEIGHT, { fit: "fill" }).webp({ quality: 82 }).toBuffer();

  await writeFile(join(DEST, `${slug}.webp`), out);

  before += size;
  after += out.length;

  console.log(`${file.padEnd(28)} -> ${slug}.webp  ${(out.length / 1024).toFixed(0)}KB`);
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

console.log(`\n${files.length} cards  ${mb(before)}MB -> ${mb(after)}MB`);
