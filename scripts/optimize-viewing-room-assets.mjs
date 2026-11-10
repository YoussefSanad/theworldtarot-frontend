/**
 * Turns the client's Viewing Room deliveries into the webp the site serves.
 *
 * `npm run assets:viewing-room`, reading from the shared `asset dump/` beside
 * the repo and writing into `public/figma/`. Her PNGs are not committed — the
 * dump is the delivery folder, this is the pipeline, and `public/` holds only
 * what ships, which is the arrangement every other `assets:*` script here
 * already follows.
 *
 * **The four marks come out at her exact pixel sizes.** They are small gold
 * figures on transparency and the frame draws them at 69-76px, so there is
 * nothing to gain by resizing and a soft gold edge is exactly where a careless
 * resample shows. `alphaQuality: 100` for the same reason: these sit on a dark
 * panel, where a degraded alpha edge reads as a grey halo.
 *
 * The background is the exception — see the note on its entry below.
 */
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

/** The client's delivery folder, one level up from the repo. */
const DUMP = join(process.cwd(), "..", "asset dump");
const DEST = join(process.cwd(), "public", "figma");

const JOBS = [
  { from: "CARDS ICON.png", to: "viewing-room-cards-icon.webp" },
  { from: "INFINITY ICON.png", to: "viewing-room-infinity-icon.webp" },
  { from: "STAR ICON.png", to: "viewing-room-star-icon.webp" },
  { from: "KEY DIVIDER.png", to: "viewing-room-key-divider.webp" },
  /*
    The room itself, with the black base painted in.
    **It carries its own black on purpose.** An earlier build laid a black
    sheet behind the page instead, which covered the whole viewport — so it
    also darkened the masthead and the footer, both of which paint
    semi-transparent textured veils and let it through. Baking the base into
    the artwork keeps the page's own background a page background.

    Quality 80 rather than 82: it is a 1920x2132 photograph of a dark room
    and the file is three orders of magnitude bigger than the marks, so the
    two points buy real bytes and show nothing at this size.
  */
  { from: "viewing-room-bg-2.png", to: "viewing-room-bg.webp", quality: 80 },
  /*
    The carousel's knob and the dotted rule it rides (`384:23`, `384:21/22`).

    **The rule is cropped to the dots.** Her export is 383x290 and the inked
    line occupies rows 142-147 of it — six pixels of dots in a frame that is
    mostly empty, plus a little stray noise further down. Shipping the whole
    thing would mean a 290px-tall element to position a 6px line inside, so
    the crop is the asset. It tiles horizontally, which the full-width rule
    needs: her two GOLD DOTS frames are the same tile twice, left and right
    of the knob.
  */
  { from: "GOLD BUTTON.png", to: "viewing-room-knob.webp" },
];

for (const { from, to, quality = 82, crop } of JOBS) {
  const source = join(DUMP, from);

  try {
    await stat(source);
  } catch {
    console.error(`Missing from the dump: ${from}`);
    process.exitCode = 1;
    continue;
  }

  let input = sharp(await readFile(source));
  const { width, height, hasAlpha } = await input.metadata();

  if (crop) {
    input = input.extract({
      left: crop.left ?? 0,
      top: crop.top,
      width: crop.width ?? width,
      height: crop.height,
    });
  }

  const { size } = await input.webp({ quality, alphaQuality: 100 }).toFile(join(DEST, to));

  const shipped = crop ? `${crop.width ?? width}x${crop.height}` : `${width}x${height}`;

  console.log(`${to.padEnd(38)} ${shipped}  alpha=${hasAlpha}  ${(size / 1024).toFixed(1)}KB`);
}
