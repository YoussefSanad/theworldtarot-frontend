/**
 * Drives the reading page's payment panel through the four states it can be in.
 *
 * `npm run build && npm run check:panel` — serves `out/` and loads the real
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
 * ## What it can and cannot say about the wallet button
 *
 * **It can never see an Apple Pay button.** Stripe draws one only in Safari on
 * a device with a wallet, and only on a registered payment method domain — a
 * headless Chromium on `localhost` fails both, and Stripe reports nothing when
 * it declines: no `ready`, no `loaderror`, no `availablepaymentmethodschange`.
 * Verified against `@stripe/stripe-js@9.14.0`.
 *
 * So the wallet assertions here are all negatives, and they are the ones that
 * would otherwise go unnoticed: that the element mounts at all, that it quotes
 * the live amount, that its row collapses rather than leaving a hole where no
 * wallet exists, and that nothing capable of taking money is mounted in a state
 * that has no live money to take. **That the sheet opens and quotes the price
 * is proved by hand, in Safari, on `staging.theworldtarot.com`** — see #37.
 *
 * `npm run check:panel -- --live` drops the interception and lets the page talk
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

/** The client's own frames. The wallet button is not one and never matches. */
const GHOST = "#get-my-reading .checkout-option";

/** The wallet row, present or collapsed. Selected by the hook, not the label. */
const WALLET = "#get-my-reading [data-wallet-row]";

/** Proof Stripe.js actually built an element rather than merely loading. */
const STRIPE_FRAME = '#get-my-reading iframe[name^="__privateStripeFrame"]';

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

  /*
    Stripe validates its options inside the iframe and reports a bad one by
    throwing, not by rejecting a promise anybody awaits — an `IntegrationError`
    surfaces as an uncaught rejection and the element renders nothing at all.
    Every assertion below still passes when that happens, because they are all
    negatives and a dead element satisfies every one of them.

    Added after `layout.overflow: 'never'` shipped with `maxRows: 1`, which
    Stripe rejects and this script did not notice.
  */
  const thrown = [];

  page.on("pageerror", (error) => thrown.push(error.message.split("\n")[0]));
  page.on("console", (message) => {
    const text = message.text();

    if (message.type() === "error" && /IntegrationError|Stripe/.test(text)) thrown.push(text.split("\n")[0]);
  });

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

  /*
    Stripe mounts its iframe a beat after the price settles, so the wallet
    measurements need their own wait. Absent is a legitimate answer — three of
    the four states have no element at all — so this resolves rather than throws
    when nothing arrives.
  */
  await page.waitForSelector(STRIPE_FRAME, { timeout: 8000 }).catch(() => {});

  const answered = {
    height: Math.round(await page.$eval(PANEL, (node) => node.getBoundingClientRect().height)),
    visibleControls: await page.locator("#get-my-reading button:visible").count(),
    price: (await page.locator(PRICE).first().innerText().catch(() => "")).trim(),
    question: await page.locator("#get-my-reading textarea").count(),
    anchor: await page.locator("#get-my-reading").count(),
    ghosts: await page.locator(GHOST).count(),
    walletRows: await page.locator(WALLET).count(),
    stripeFrames: await page.locator(STRIPE_FRAME).count(),
    /*
      The rendered height of the wallet row. `boundingBox()` is `null` for a
      `display:none` element, which is the collapse, and that is deliberately
      not distinguished from a zero-height box: either way the panel has no gap.
    */
    walletHeight: Math.round(
      (await page.locator(WALLET).first().boundingBox().catch(() => null))?.height ?? 0,
    ),
    /* The amount the sheet would quote, read off the row's own label. */
    walletLabel: await page.locator(WALLET).first().getAttribute("aria-label").catch(() => null),
  };

  await page.close();

  return { resting, settled: answered, thrown };
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
expect("live", "Stripe raised nothing", sold.thrown, []);
expect("live", "no controls while loading", sold.resting.reachableControls, 0);
/*
  Not "does not move". This browser has no Apple Pay, so the wallet row
  collapses the moment the price lands and the panel gets shorter by exactly one
  row. That is the trade #37 took for the "no gap" criterion, and the direction
  is the point: a panel that only ever shrinks never puts a control under a
  finger that was reaching for something else. What must never happen is growth.
*/
expect("live", "the panel never grows", sold.settled.height <= sold.resting.height, true);
expect("live", "the API's price, in the API's currency", sold.settled.price, "€70");
expect("live", "the client's four frames, Apple Pay's row now Stripe's", sold.settled.ghosts, 4);
expect("live", "a Stripe element is mounted", sold.settled.stripeFrames > 0, true);
expect(
  "live",
  "and it quotes the API's money, not the bundled copy",
  sold.settled.walletLabel,
  "Pay €70 with Apple Pay",
);
expect("live", "no gap where this browser has no wallet", sold.settled.walletHeight, 0);

if (live) {
  await browser.close();
  server.close();

  console.log(failures.length === 0 ? "\nThe live catalogue prices this page." : "");
  process.exit(failures.length === 0 ? 0 : 1);
}

const gone = await drive("withdrawn — a 404", { status: 404, json: { message: "Not found." } }, unsold);
expect("withdrawn", "Stripe raised nothing", gone.thrown, []);
expect("withdrawn", "no price", gone.settled.price, "");
expect("withdrawn", "no controls", gone.settled.visibleControls, 0);
expect("withdrawn", "no question either", gone.settled.question, 0);
expect("withdrawn", "the closing call to action still lands", gone.settled.anchor, 1);
expect("withdrawn", "and nothing to pay with", gone.settled.stripeFrames, 0);

const dead = await drive("unreachable — a 500", { status: 500, json: { message: "Server error." } }, priced);
expect("unreachable", "Stripe raised nothing", dead.thrown, []);
expect("unreachable", "the bundled price, as copy", dead.settled.price, "$75");
/*
  The frame stays whole — a visitor arriving while the API is down should not
  meet a hole where the checkout is. None of these five can take money.
*/
expect("unreachable", "the client's five frames, all of them duds", dead.settled.ghosts, 5);
/*
  The assertion the state exists for. `reading.price` is the string "$75" for a
  reading the catalogue prices at EUR 7000: no currency, and a number nobody has
  verified today. A sheet quoting it would be asking for consent to an amount no
  server ever agreed to, so nothing capable of opening one is mounted.
*/
expect("unreachable", "and nothing that could quote it", dead.settled.walletRows, 0);
expect("unreachable", "no Stripe element at all", dead.settled.stripeFrames, 0);

await browser.close();
server.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} failed:\n${failures.map((line) => `  ${line}`).join("\n")}`);
  process.exit(1);
}

console.log("\nAll four states behave.");
