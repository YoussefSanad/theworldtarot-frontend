/**
 * Turns the client's Learn page delivery into the webp the site serves.
 *
 * `npm run assets:learn`, reading from the shared `asset dump/` beside the repo
 * and writing into `public/figma/`. Her PNGs are not committed — the dump is the
 * delivery folder, this is the pipeline, and `public/` holds only what ships,
 * which is the arrangement every other `assets:*` script here already follows.
 *
 * **Everything arrives pre-composed and nothing here recomposes it.** The three
 * postcards ship already rotated, already rounded, and with their play glyph
 * painted on; the gold marks arrive as finished discs. That is why there is no
 * crop, no rotate and no overlay anywhere below — the page places these, it does
 * not assemble them. `PostcardFan` leans on this: it translates the cards into
 * their fan and never rotates them, because the tilt is in the pixels.
 *
 * **The marks and the line icons keep their exact pixel sizes**, with
 * `alphaQuality: 100`. They are small figures on transparency — gold discs on
 * the night band, navy line art on the cream one — drawn at their native size or
 * under it, so there is nothing to gain by resampling and a soft edge is exactly
 * where a careless one shows. The navy icons are the fussier of the two: thin
 * open linework on a pale ground, where a degraded alpha reads as grey fringing
 * rather than as softness.
 *
 * The two photographs are the exception and take a quality step down — see their
 * entries.
 */
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

/** The client's delivery folder, one level up from the repo. */
const DUMP = join(process.cwd(), "..", "asset dump", "learn");
const DEST = join(process.cwd(), "public", "figma");

const JOBS = [
  /*
    The hero's laptop (1606x960). A photograph, and by far the heaviest thing in
    the delivery at 1.8MB — quality 80 rather than the default 82, which buys
    real bytes at the top of the page and shows nothing at the size it is drawn.
    It carries its own darkness into a transparent left edge, which is what lets
    it fade into the night band instead of ending on a seam, so the alpha is
    kept at full quality even though the picture is not.
  */
  { from: "COMPUTER IMAGE.png", to: "learn-computer.webp", quality: 80 },

  /*
    The three course postcards. Photographs too, but an order of magnitude
    smaller than the laptop and drawn at roughly their native width, so they keep
    the default quality — the fan is the one place on the page where a visitor
    looks *at* the artwork rather than past it.
  */
  { from: "SUN POSTCARD.png", to: "learn-postcard-sun.webp" },
  { from: "CHARIOT POSTCARD.png", to: "learn-postcard-chariot.webp" },
  { from: "STAR POSTCARD.png", to: "learn-postcard-star.webp" },

  /* The four gold marks on the night band, at their delivered sizes. */
  { from: "FILM ICONS.png", to: "learn-mark-film.webp" },
  { from: "BOOK ICON.png", to: "learn-mark-book.webp" },
  { from: "STAR ICON.png", to: "learn-mark-star.webp" },
  { from: "CARDS ICON.png", to: "learn-mark-cards.webp" },

  /* The three navy line icons on the cream band. */
  { from: "MAJOR ARCANA ICON.png", to: "learn-map-major.webp" },
  { from: "COURT CARDS ICON.png", to: "learn-map-court.webp" },
  { from: "MINOR ARCANA ICON.png", to: "learn-map-minor.webp" },
];

for (const { from, to, quality = 82 } of JOBS) {
  const source = join(DUMP, from);

  try {
    await stat(source);
  } catch {
    console.error(`Missing from the dump: ${from}`);
    process.exitCode = 1;
    continue;
  }

  const input = sharp(await readFile(source));
  const { width, height, hasAlpha } = await input.metadata();

  const { size } = await input.webp({ quality, alphaQuality: 100 }).toFile(join(DEST, to));

  /*
    The dimensions print because `lib/assets.ts` writes them down a second time,
    by hand, and the two have to agree — `next/image` reserves each box from the
    numbers in that file, so a mismatch is a layout shift nobody sees until the
    image loads. Check this column against the `asset()` calls in `learnArtwork`.
  */
  console.log(`${to.padEnd(30)} ${width}x${height}  alpha=${hasAlpha}  ${(size / 1024).toFixed(1)}KB`);
}
