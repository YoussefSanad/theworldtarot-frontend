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

    /*
      **Dimensions first, because a missing one defeats the aspect check
      silently.** `metadata()` types both as optional, and `undefined / 2851` is
      `NaN` — against which *every* comparison below is `false`, so an
      unmeasurable sheet would sail through the one check this script exists to
      perform and encode anyway.
    */
    if (!width || !height) {
      throw new Error(
        `${slug}.png reported no dimensions (${width}x${height}). Every check below is an ` +
          `arithmetic comparison, and NaN defeats all of them — so this throws rather than ` +
          `encoding a sheet nothing has measured.`,
      );
    }

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

    /*
      An equality check rather than a tolerance, so `undefined` fails it the way
      any other wrong size does — this arm has no NaN hole for the reason the
      desktop one needed a guard against.
    */
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
