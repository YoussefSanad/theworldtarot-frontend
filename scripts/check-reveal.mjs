/**
 * Walks the reveal: idle card back, crossfade to The Star video, then the
 * trigger fading into the card name and question, the secondary actions taking
 * their pulse and the return prompt arriving. Also reloads to confirm the card
 * is restored for the rest of the visit.
 *
 * Chromium's open-source build has no H.264 decoder, so this prefers the
 * installed Chrome when there is one. Both the card back and the card face are
 * H.264 now, so on Chromium the reveal cannot complete at all — check the
 * browser named in the first log line before believing a failure here.
 *
 * The face is a <video> on a fresh reveal and an <img> on a restored visit
 * (the still is the video's closing frame), so each path is queried separately.
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
// The prompt is always in the DOM holding its space open, so `isVisible()` says
// true even while it is faded out — opacity is the only thing worth asserting.
const promptOpacity = () =>
  page.getByText(/return another day/i).evaluate((node) => Number(getComputedStyle(node).opacity).toFixed(2));

console.log("idle label:", (await trigger.textContent())?.trim());
console.log("back video playing:", await stage.evaluate((video) => !video.paused));
console.log("idle, prompt faded out:", (await promptOpacity()) === "0.00");

// Nothing may move when the button gives way to the name: the hero grid centres
// this column, so any height change here shifts the title and card name too.
const columnBox = () => page.locator("main h1").boundingBox();
const boxBefore = await columnBox();
await page.screenshot({ path: join(outDir, "reveal-1-idle.png"), clip: { x: 960, y: 240, width: 960, height: 840 } });

await trigger.click();

// The trigger swaps on the click itself, not when the card's crossfade ends, so
// one second in — still mid-crossfade — the button should already be gone and
// the name already up. Both only take exit (0.45s) + enter (0.5s) to land.
await page.waitForTimeout(1000);
console.log("mid-crossfade, button gone:", (await page.getByRole("button", { name: /reveal your card/i }).count()) === 0);
console.log("mid-crossfade, card name up:", await page.getByText(/·/).first().isVisible());

await page.waitForTimeout(3000);

const cardFace = page.locator("main video[aria-label$=', your card']");
console.log("card face:", await cardFace.evaluate((video) => ({
  src: video.currentSrc.split("/").pop(),
  playing: !video.paused,
  loops: video.loop,
})));
console.log("card opacity:", await cardFace.evaluate((video) => getComputedStyle(video).opacity));
console.log("back opacity:", await stage.evaluate((video) => getComputedStyle(video).opacity));
await page.screenshot({ path: join(outDir, "reveal-2-revealed.png"), clip: { x: 0, y: 240, width: 1100, height: 840 } });

const cardName = page.getByText("XVII · The Star");
const question = page.getByText("Why has this card appeared for you today?");
console.log("card name visible:", await cardName.isVisible());
console.log("question visible:", await question.isVisible());
console.log("reveal button gone:", (await page.getByRole("button", { name: /reveal your card/i }).count()) === 0);
console.log("actions pulsing:", await page.locator("main a.pulse-glow").count());
console.log("return prompt faded in:", (await promptOpacity()) === "1.00");
console.log("hero held still through the swap:", (await columnBox()).y === boxBefore.y);

// The name has to render exactly like the tagline above it.
const typeMatch = await page.evaluate(() => {
  const pick = (node) => {
    const s = getComputedStyle(node);
    return `${s.fontFamily} | ${s.fontSize} | ${s.color}`;
  };
  const tagline = [...document.querySelectorAll("main p")].find((p) =>
    p.textContent.includes("cinematic tarot, brought to life"),
  );
  const name = [...document.querySelectorAll("main p")].find((p) => p.textContent.includes("The Star"));
  return { tagline: pick(tagline), name: pick(name), same: pick(tagline) === pick(name) };
});
console.log("tagline:", typeMatch.tagline);
console.log("card name:", typeMatch.name);
console.log("type matches tagline:", typeMatch.same);

// A restored visit must not re-download the MP4 — it shows the closing still.
const mp4Requests = [];
page.on("request", (request) => {
  if (request.url().includes("17-the-star") && request.url().endsWith(".mp4")) mp4Requests.push(request.url());
});

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2000);
console.log("after reload card name:", await page.getByText("XVII · The Star").isVisible());
console.log("after reload question:", await page.getByText("Why has this card appeared for you today?").isVisible());
console.log("after reload reveal button gone:", (await page.getByRole("button", { name: /reveal your card/i }).count()) === 0);
console.log("after reload actions pulsing:", await page.locator("main a.pulse-glow").count());
console.log("after reload return prompt:", (await promptOpacity()) === "1.00");
const restored = page.locator("main img[alt$=', your card']");
console.log("restored card:", await restored.evaluate((img) => ({ src: img.currentSrc.split("/").pop(), opacity: getComputedStyle(img).opacity })));
console.log("card mp4 re-requested on restore:", mp4Requests.length, mp4Requests.length === 0 ? "(good)" : "(should be 0)");
await page.screenshot({ path: join(outDir, "reveal-3-restored.png"), clip: { x: 0, y: 240, width: 1100, height: 840 } });

await browser.close();
