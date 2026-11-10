/**
 * Proves the shadow panels kept their rounded corners.
 *
 * Her panels are a rounded plaque, not a rectangle: the corner pixels are
 * transparent and the artwork only reaches full opacity a little way in. An
 * early version of `optimize-packet-assets.mjs` set `alpha = 255` on every
 * pixel while normalizing the fill, which squared all twenty-two off — the
 * build, the lint and the whole test suite stayed green while the panels
 * changed shape.
 *
 *   node scripts/check-shadow-corners.mjs
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

const DIR = "public/figma/card-reference/shadows";

let squared = 0;

for (const file of readdirSync(DIR).sort()) {
  const { data, info } = await sharp(join(DIR, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: W, height: H } = info;
  const alpha = (x, y) => data[(y * W + x) * 4 + 3];

  const corners = [
    ["TL", alpha(0, 0)],
    ["TR", alpha(W - 1, 0)],
    ["BL", alpha(0, H - 1)],
    ["BR", alpha(W - 1, H - 1)],
  ];

  const opaque = corners.filter(([, a]) => a > 200);

  if (opaque.length > 0) {
    console.log(`${file.padEnd(28)} SQUARED — ${opaque.map(([c, a]) => `${c}=${a}`).join(" ")}`);
    squared += 1;
  }
}

if (squared > 0) {
  throw new Error(`${squared} shadow panel(s) lost their rounded corners.`);
}

console.log(`${readdirSync(DIR).length} shadow panels keep their rounded corners.`);
