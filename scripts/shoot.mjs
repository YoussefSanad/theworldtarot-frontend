/**
 * Screenshots the homepage for the visual parity pass.
 *
 * `node scripts/shoot.mjs [width] [label] [--full]` — defaults to a 1920px
 * viewport, which is the width the Figma frame was drawn at.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const [widthArg, label = "desktop"] = process.argv.slice(2);
const width = Number(widthArg) || 1920;
const fullPage = process.argv.includes("--full");
const outDir = join(process.cwd(), ".screens");

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: Math.round(width * 0.5625) }, deviceScaleFactor: 1 });

const problems = [];
page.on("console", (message) => {
  if (message.type() === "error") problems.push(message.text());
});
page.on("pageerror", (error) => problems.push(String(error)));

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

// Walk the page so lazily-loaded images are decoded before anything is captured.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
    window.scrollTo(0, y);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  window.scrollTo(0, 0);
});
await page.waitForLoadState("networkidle");
await page.waitForTimeout(800);

if (fullPage) {
  await page.screenshot({ path: join(outDir, `${label}-full.png`), fullPage: true });
} else {
  const sections = await page.evaluate(() =>
    [...document.querySelectorAll("body > header, main > *, body > footer")].map((node, index) => {
      const box = node.getBoundingClientRect();
      return { index, top: Math.round(box.top + window.scrollY), height: Math.round(box.height) };
    }),
  );

  for (const section of sections) {
    if (section.height < 8) continue;
    await page.screenshot({
      path: join(outDir, `${label}-${String(section.index).padStart(2, "0")}.png`),
      fullPage: true,
      clip: { x: 0, y: section.top, width, height: Math.min(section.height, 3000) },
    });
  }
}

const pageHeight = await page.evaluate(() => document.body.scrollHeight);
console.log(`${label} @ ${width}px — page height ${pageHeight}px`);
if (problems.length) console.log("console errors:\n" + problems.join("\n"));

await browser.close();
