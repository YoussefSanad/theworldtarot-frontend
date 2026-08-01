/**
 * Walks the reveal: idle card back, crossfade to The Star face image, then the
 * trigger fading into the card name and question. Also reloads to confirm the
 * card is restored for the rest of the visit.
 *
 * Chromium's open-source build has no H.264 decoder, so this prefers the
 * installed Chrome when there is one (needed for the looping card-back video).
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const outDir = join(process.cwd(), ".screens");
await mkdir(outDir, { recursive: true });

let browser;
let channel = "chrome";
try {
  browser = await chromium.launch({ channel });
} catch {
  channel = "chromium (no H.264)";
  browser = await chromium.launch();
}
console.log(`browser: ${channel}`);

const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

const trigger = page.getByRole("button", { name: /reveal your card/i });
const stage = page.locator("main video").first();

console.log("idle label:", (await trigger.textContent())?.trim());
console.log("back video playing:", await stage.evaluate((video) => !video.paused));
await page.screenshot({ path: join(outDir, "reveal-1-idle.png"), clip: { x: 960, y: 240, width: 960, height: 840 } });

await trigger.click();
await page.waitForTimeout(2600);

const cardFace = page.locator("main img[alt$=', your card']");
console.log("card face:", await cardFace.evaluate((img) => ({ src: img.currentSrc.split("/").pop(), naturalWidth: img.naturalWidth })));
console.log("card opacity:", await cardFace.evaluate((img) => getComputedStyle(img).opacity));
console.log("back opacity:", await stage.evaluate((video) => getComputedStyle(video).opacity));
await page.screenshot({ path: join(outDir, "reveal-2-revealed.png"), clip: { x: 0, y: 240, width: 1100, height: 840 } });

const cardName = page.getByText("The Star", { exact: true });
const question = page.getByText("Why has this card appeared for you now?");
console.log("card name visible:", await cardName.isVisible());
console.log("question visible:", await question.isVisible());
console.log("reveal button gone:", (await page.getByRole("button", { name: /reveal your card/i }).count()) === 0);

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2000);
console.log("after reload card name:", await page.getByText("The Star", { exact: true }).isVisible());
console.log("after reload question:", await page.getByText("Why has this card appeared for you now?").isVisible());
console.log("after reload reveal button gone:", (await page.getByRole("button", { name: /reveal your card/i }).count()) === 0);
const restored = page.locator("main img[alt$=', your card']");
console.log("restored card:", await restored.evaluate((img) => ({ src: img.currentSrc.split("/").pop(), opacity: getComputedStyle(img).opacity })));
await page.screenshot({ path: join(outDir, "reveal-3-restored.png"), clip: { x: 0, y: 240, width: 1100, height: 840 } });

await browser.close();
