/** Reports any image that failed to load or rendered at zero size. */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(process.argv[2]) || 1920, height: 1080 } });

const failures = [];
page.on("response", (response) => {
  if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
});

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

const images = await page.evaluate(() =>
  [...document.images].map((image) => ({
    src: image.currentSrc.replace(location.origin, "").slice(0, 70),
    natural: `${image.naturalWidth}x${image.naturalHeight}`,
    rendered: `${Math.round(image.getBoundingClientRect().width)}x${Math.round(image.getBoundingClientRect().height)}`,
    complete: image.complete,
  })),
);

console.table(images);
console.log(failures.length ? `failed requests:\n${failures.join("\n")}` : "no failed requests");
await browser.close();
