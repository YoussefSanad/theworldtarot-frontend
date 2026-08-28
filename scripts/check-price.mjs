/**
 * Drives the reading page through the four states of its price.
 *
 * `npm run build && npm run check:price` — serves `out/` and loads the real
 * exported bundle three times, intercepting the product endpoint to answer
 * 200, 404 and 500 in turn. Each answer is **held until the loading state has
 * been measured**, so the race between the fetch and the assertion cannot
 * decide the result.
 *
 * This exists because the thing the ticket actually asks for cannot be checked
 * by the type checker or by `node --test`: that the panel does not move under a
 * customer's thumb while the price is in flight, and that there is no way to
 * pay until there is a live amount to pay. Both are facts about a laid-out
 * page. See `docs/plans/reading-page-live-price.md`.
 *
 * It needs no backend — every request to the API is answered by the route
 * handler, which is also the only way to produce the 500 on demand.
 *
 * `npm run check:price -- --live` drops the interception and lets the page talk
 * to the API in `.env.local`, which is the one thing the intercepted run cannot
 * prove: that the endpoint answers this product key at all. It serves on **port
 * 3000 deliberately** — that is the origin staging's `CORS_ALLOWED_ORIGINS`
 * carries, so any other port fails as an opaque network error rather than as a
 * CORS message.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const live = process.argv.includes("--live");
const root = join(process.cwd(), "out");

// 3000 is the origin staging allows; the intercepted run never leaves the
// browser, so it can sit anywhere.
const PORT = live ? 3000 : 4321;
const PAGE = `http://localhost:${PORT}/readings/month-ahead/`;

/** The left panel, whose height is the thing that must not jump. */
const PANEL = ".reading-panel-sky";
const PRICE = "#get-my-reading p.font-display";
const RESTING = '[role="status"][aria-label="Fetching the price"]';

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".otf": "font/otf", ".txt": "text/plain", ".ico": "image/x-icon",
  ".mp4": "video/mp4",
};

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(req.url.split("?")[0]);

  // The export is directory-per-route with an `index.html` in each.
  if (path.endsWith("/")) path += "index.html";
  if (!extname(path)) path += "/index.html";

  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not in the export.");
  }
});

await new Promise((resolve) => server.listen(PORT, resolve));

const browser = await chromium.launch();
const failures = [];

function expect(state, what, actual, wanted) {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) failures.push(`${state}: ${what} was ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);

  console.log(`  ${ok ? "✓" : "✗"} ${what}: ${JSON.stringify(actual)}`);
}

/**
 * Loads the page, measures the resting state, then lets the API answer.
 *
 * `settled` is a page-side predicate rather than a timeout. A fixed wait is
 * long enough for a route handler and not for a real round trip to staging,
 * which is exactly the kind of flake that gets a check disbelieved.
 */
async function drive(state, response, settled) {
  console.log(`\n${state}`);

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  let release = () => {};

  if (!live) {
    const held = new Promise((resolve) => (release = resolve));

    await page.route("**/api/v1/*/products/**", async (route) => {
      await held;
      await route.fulfill(response);
    });
  }

  await page.goto(PAGE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(RESTING);

  const resting = {
    height: Math.round(await page.$eval(PANEL, (node) => node.getBoundingClientRect().height)),
    visibleControls: await page.locator("#get-my-reading button:visible").count(),
    // A control inside an `inert` subtree is not reachable by a pointer, a tab,
    // a screen reader or `element.click()`, which is the whole claim.
    reachableControls: await page
      .locator("#get-my-reading button")
      .evaluateAll((nodes) => nodes.filter((node) => !node.closest("[inert]")).length),
  };

  release();
  await page.waitForFunction(settled, null, { timeout: 15000 });

  const answered = {
    height: Math.round(await page.$eval(PANEL, (node) => node.getBoundingClientRect().height)),
    visibleControls: await page.locator("#get-my-reading button:visible").count(),
    price: (await page.locator(PRICE).first().innerText().catch(() => "")).trim(),
    question: await page.locator("#get-my-reading textarea").count(),
    anchor: await page.locator("#get-my-reading").count(),
  };

  await page.close();

  return { resting, settled: answered };
}

const PRODUCT = {
  key: "month-ahead",
  type: "reading",
  name: "Month Ahead Reading",
  short_description: "One month, five cards.",
  long_description: "A written reading of the weeks to come.",
  allows_question: true,
  price: { currency: "EUR", amount: 7000 },
};

/** The price line has said something — live or fallback, either settles it. */
const priced = () => {
  const node = document.querySelector("#get-my-reading p.font-display");

  return Boolean(node) && node.innerText.trim().length > 0;
};

/** Nothing is for sale: the whole order came off the page. */
const unsold = () => document.querySelectorAll("#get-my-reading form").length === 0;

const sold = await drive("live — a priced product", { status: 200, json: PRODUCT }, priced);
expect("live", "no controls while loading", sold.resting.reachableControls, 0);
expect("live", "the panel does not move", sold.settled.height, sold.resting.height);
expect("live", "the API's price, in the API's currency", sold.settled.price, "€70");
expect("live", "all five controls", sold.settled.visibleControls, 5);

if (live) {
  await browser.close();
  server.close();

  console.log(failures.length === 0 ? "\nThe live catalogue prices this page." : "");
  process.exit(failures.length === 0 ? 0 : 1);
}

const gone = await drive("withdrawn — a 404", { status: 404, json: { message: "Not found." } }, unsold);
expect("withdrawn", "no price", gone.settled.price, "");
expect("withdrawn", "no controls", gone.settled.visibleControls, 0);
expect("withdrawn", "no question either", gone.settled.question, 0);
expect("withdrawn", "the closing call to action still lands", gone.settled.anchor, 1);

const dead = await drive("unreachable — a 500", { status: 500, json: { message: "Server error." } }, priced);
expect("unreachable", "the bundled price, as copy", dead.settled.price, "$75");
expect("unreachable", "and no way to pay it", dead.settled.visibleControls, 0);

await browser.close();
server.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} failed:\n${failures.map((line) => `  ${line}`).join("\n")}`);
  process.exit(1);
}

console.log("\nAll four states behave.");
