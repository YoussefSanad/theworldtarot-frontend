/**
 * Prints the rendered box of key homepage elements so they can be compared with
 * the Figma frame, which was drawn at 1920px wide.
 *
 * `node scripts/measure.mjs [width]`
 */
import { chromium } from "playwright";

const width = Number(process.argv[2]) || 1920;

const TARGETS = {
  header: "body > header",
  logo: "header img",
  heroSection: "main > section:first-of-type",
  heroGrid: "main > section:first-of-type div.grid",
  heroCopy: "main > section:first-of-type div.grid > div:first-child",
  heroTitle: "h1",
  heroVisual: "main > section:first-of-type div.grid > div:last-child",
  heroCircles: "main > section:first-of-type div.grid > div:last-child > div:first-child",
  revealStage: "main > section:first-of-type div.grid > div:last-child > div:last-child",
  revealButton: "main button",
  secondaryActions: "main > section:first-of-type div.grid > div:first-child > div:last-child",
  productGrid: "#choose-your-journey div.grid",
  productCard: "#choose-your-journey article",
  productFrame: "#choose-your-journey article > div",
  productCta: "#choose-your-journey article > a",
  footer: "body > footer",
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1080 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

const rows = [];
for (const [name, selector] of Object.entries(TARGETS)) {
  const box = await page.locator(selector).first().boundingBox().catch(() => null);
  rows.push(
    box
      ? { name, x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) }
      : { name, x: "-", y: "-", w: "missing", h: "-" },
  );
}

console.table(rows);

/* Figma frame extents, for comparison while tuning section rhythm. */
const FIGMA_BANDS = [225, 1201, 640, 1035, 580, 378, 1053, 177, 573, 419, 716];

const bands = await page.evaluate(() =>
  [...document.querySelectorAll("body > header, main > *, body > footer")].map((node) => {
    const box = node.getBoundingClientRect();
    return { top: Math.round(box.top + window.scrollY), height: Math.round(box.height) };
  }),
);

console.table(
  bands.map((band, index) => ({
    band: index,
    top: band.top,
    height: band.height,
    figma: FIGMA_BANDS[index] ?? "-",
    delta: FIGMA_BANDS[index] ? band.height - FIGMA_BANDS[index] : "-",
  })),
);

console.log("page height:", await page.evaluate(() => document.body.scrollHeight), "(figma 6674)");
await browser.close();
