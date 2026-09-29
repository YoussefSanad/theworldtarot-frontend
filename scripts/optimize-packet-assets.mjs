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
    /* The Fool's folder holds one hand-composited shadow, not a packet. */
    .filter((name) => name !== FOOL_FOLDER)
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

/** The width every sheet is normalized to — the Fool's own, so `.card-paper` is unchanged. */
/**
 * The Fool's own sources, which do not come from a packet.
 *
 * His page predates this delivery, so the client never sent a packet for him.
 * His parchment is her original PSD layer and his shadow was composited by hand
 * from the two layers the page used to stack; both live beside her twenty-one so
 * every source this script reads is in one place.
 *
 * **The folder is deliberately outside `PACKETS`.** That roster is asserted
 * against what is on disk — a folder appearing or disappearing throws — and his
 * is not a packet: it holds these two files and none of the others a packet has.
 */
const FOOL_FOLDER = "00 - The Fool";
const FOOL_PAPER = { folder: FOOL_FOLDER, file: "paper-fool.png" };
const FOOL_SHADOW = { folder: FOOL_FOLDER, file: "shadow-fool.png" };

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

  const depth = { top: top + 1, bottom: H - bottom };

  /*
    **A deckle cannot be most of the sheet.** Both scans walk inward until a row
    is ~fully opaque, and a sheet that never gets there — a fold, a die-cut mark,
    a long gradual fade — walks all the way through and yields a "deckle" of
    hundreds of pixels. That produces a negative middle height (sharp then fails
    with an opaque message about an integer between 0 and 100000000) or, worse,
    a positive one that ships most of the paper inside a strip meant to hold a
    torn edge.

    The cap is generous: The Moon's genuine tear is the deepest measured at
    138px, so a tenth of the sheet leaves real room and still catches a scan
    that has plainly run away.
  */
  const limit = Math.floor(H / 10);

  if (depth.top > limit || depth.bottom > limit) {
    throw new Error(
      `Deckle scan ran away: found ${depth.top}px top and ${depth.bottom}px ` +
        `bottom on a ${H}px sheet (limit ${limit}). The sheet likely never ` +
        `reaches a fully opaque row — check it for a fold or a gradual fade.`,
    );
  }

  return depth;
}

/**
 * The paper: one whole sheet per card, trimmed of empty canvas and nothing else.
 *
 * **It was three slices per card, and that was the wrong trade.** The page's
 * height is content-driven — a long essay makes a taller sheet — so the sheet
 * was cut into a top edge, a stretching middle and a bottom edge, on the
 * reasoning that only the featureless middle should distort. It cost two things
 * that turned out to matter more: the cut ran *through* the deckle, leaving a
 * hard line where her torn edge used to fade out, and sixty-six files where
 * twenty-two would do.
 *
 * So the sheet is written whole. `.card-paper` pins the two torn edges and
 * stretches the middle by painting this one image three times, which gets the
 * slicing's benefit with none of its cost — see globals.css.
 *
 * **The trim is to the canvas, not to the paper.** Her backgrounds sit inside a
 * 1920-wide frame with empty space around them; that space goes, and the deckle
 * — which is part of the paper — is kept whole. The earlier crop measured the
 * sheet's *solid* bounds, which is a different thing: it cut at the first fully
 * opaque column and threw the ragged margin away.
 */
async function writePaper(packets) {
  const dest = join(DEST, "paper");
  await mkdir(dest, { recursive: true });

  let written = 0;
  let total = 0;

  /*
    **The Fool is first, and he is not a packet.** His sheet is her original PSD
    layer rather than one of the client's per-card backgrounds, so it is named
    directly instead of being searched for — but it goes through exactly the
    same code, so all twenty-two pages get their paper from one path.
  */
  const sheets = [[join(SOURCE, FOOL_PAPER.folder, FOOL_PAPER.file), "the-fool"]];

  for (const folder of packets) {
    const files = await readdir(join(SOURCE, folder));

    /*
      **PNG wins when a folder has both, and the order is pinned rather than
      left to the filesystem.** Temperance ships three backgrounds — an
      unreadable `.pbm`, a `.jpg` and a `.png` of the same sheet — and
      `readdir` order decided which was used, so a re-clone could silently
      switch her page from the lossless source to the lossy one. The Wheel has
      only a `.jpg`, so JPEG stays allowed as a fallback rather than refused.
    */
    const candidates = files.filter(
      (n) => /BKGRND|BACKGROUND/i.test(n) && !/\.pbm$/i.test(n),
    );
    const file =
      candidates.find((n) => /\.png$/i.test(n)) ?? candidates.find((n) => /\.jpe?g$/i.test(n));

    if (!file) {
      throw new Error(
        `${folder}: no usable background. Her .pbm is unreadable by every tool ` +
          `checked and is deliberately ignored; a .png or .jpg must sit beside it.`,
      );
    }

    sheets.push([join(SOURCE, folder, file), PACKETS[folder]]);
  }

  for (const [path, slug] of sheets) {
    const box = await sheetBounds(path);

    /*
      **Padded outward past the solid bounds, so the deckle survives.**
      `sheetBounds` finds where the paper is *fully* opaque; her torn edge fades
      out for a few pixels either side of that, and cutting on the line removes
      it. The pad is clamped to the canvas, so a sheet already flush to its edge
      simply keeps what it has.
    */
    const pad = 24;
    const { width: canvasW, height: canvasH } = await sharp(path).metadata();
    const left = Math.max(0, box.left - pad);
    const top = Math.max(0, box.top - pad);
    const width = Math.min(canvasW - left, box.width + pad * 2);
    const height = Math.min(canvasH - top, box.height + pad * 2);

    const cropped = sharp(path)
      .extract({ left, top, width, height })
      .resize({ width: PAPER_WIDTH });

    /*
      **Temperance's and The Wheel's sheets are flattened onto opaque white**,
      where the other twenty carry real transparency around the paper. Left
      alone, that white paints as a hard rectangle behind the sheet against the
      night sky. Keying it back to alpha restores the torn edge their format
      threw away: her paper's own tone is far below the threshold, so nothing of
      the sheet is keyed, and the few pixels of ramp at the edge become the
      antialiasing the PNG sheets state outright.
    */
    const prepared = box.keyed
      ? cropped
      : await (async () => {
          const { data, info } = await cropped
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

          for (let i = 0; i < data.length; i += 4) {
            const lum = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;

            if (lum >= 250) {
              data[i + 3] = 0;
            } else if (lum > 240) {
              data[i + 3] = Math.round(((250 - lum) / 10) * 255);
            }
          }

          return sharp(data, {
            raw: { width: info.width, height: info.height, channels: 4 },
          });
        })();

    const out = await prepared
      .webp({ quality: 82, alphaQuality: 100 })
      .toFile(join(dest, `${slug}.webp`));

    total += out.size;
    written += 1;
    console.log(
      `paper/${slug}`.padEnd(28) +
        `${String(out.width).padStart(5)}x${String(out.height).padEnd(5)} ` +
        `${(out.size / 1024).toFixed(0).padStart(5)}kB  ${box.keyed ? "alpha" : "white"}`,
    );
  }

  return { written, total };
}

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

  const sources = [[join(SOURCE, FOOL_SHADOW.folder, FOOL_SHADOW.file), "the-fool"]];

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

    /*
      **The Fool's panel is translucent where hers are opaque**, so a plain
      flatten is wrong for it. His near-black sits at alpha 181, and compositing
      that over the fill gives `1*0.71 + 56*0.29` = rgb(17,17,18) — darker than
      every other card rather than equal to them.

      So the alpha is *replaced* rather than composited: each pixel keeps its
      own colour, and anything at least as dark as the fill is lifted to the
      fill exactly. Hers are already opaque rgb(56,56,56), so this is a no-op
      for the twenty-one and only normalizes his.
    */
    const cropped = await sharp(path)
      .extract({ left: box.left, top: box.top, width: box.width, height: box.height })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const px = cropped.data;

    for (let i = 0; i < px.length; i += 4) {
      /*
        **The two JPEG panels carry their corner relief as white, not alpha.**
        The Hermit's and Death's shadows were delivered flattened, so
        `ensureAlpha` gives them a fully opaque channel and the rounded corners
        would survive as white blocks against the parchment. Near-white here is
        the transparency her PNG siblings state outright.
      */
      if (!box.keyed && px[i] >= 250 && px[i + 1] >= 250 && px[i + 2] >= 250) {
        px[i + 3] = 0;
      }

      const a = px[i + 3] / 255;

      // Composite onto the fill, then lift the panel body to the fill exactly.
      const r = Math.round(px[i] * a + SHADOW_FILL.r * (1 - a));
      const g = Math.round(px[i + 1] * a + SHADOW_FILL.g * (1 - a));
      const b = Math.round(px[i + 2] * a + SHADOW_FILL.b * (1 - a));

      const body = r <= SHADOW_FILL.r && g <= SHADOW_FILL.g && b <= SHADOW_FILL.b;

      px[i] = body ? SHADOW_FILL.r : r;
      px[i + 1] = body ? SHADOW_FILL.g : g;
      px[i + 2] = body ? SHADOW_FILL.b : b;

      /*
        **The corner relief is kept, and that is why this is not simply 255.**
        Her panel is a rounded plaque: the four corners are transparent and the
        artwork reaches full opacity about 23px in. Writing 255 everywhere
        normalized the fill correctly and squared all twenty-two panels off at
        the same time — a change of shape that nothing else in the build or the
        suite would have caught.

        So only the *interior* is made opaque, and the split is at half alpha
        rather than near-full. Both kinds of source are cleanly bimodal — her
        packets draw the panel at 255 and The Fool's flat cut draws it at 181,
        while both leave the corners at 0 — so 128 separates "drawn" from
        "relief" for either. A `> 200` test would have left his entire panel
        translucent while looking correct on her twenty-one.
      */
      px[i + 3] = px[i + 3] > 128 ? 255 : px[i + 3];
    }

    const out = await sharp(px, {
      raw: { width: cropped.info.width, height: cropped.info.height, channels: 4 },
    })
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

const packets = await readPackets();
const symbols = await collectSymbols(packets);

if (symbols.size !== 29) {
  throw new Error(`Expected 29 distinct symbols across the packets, found ${symbols.size}.`);
}

const { written, total } = await writeSymbols(symbols);

const paper = await writePaper(packets);

const shadows = await writeShadows(packets);

console.log(
  `\n${written + paper.written + shadows.written} assets, ` +
    `${((total + paper.total + shadows.total) / 1024 / 1024).toFixed(2)}MB total.`,
);
