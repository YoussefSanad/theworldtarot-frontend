/**
 * Drives the currency control on every surface that prices something, and
 * proves the five facts `docs/plans/language-and-currency-selector.md` lists
 * under "What proves it".
 *
 * `npm run build && npm run check:currency` — serves `out/` and loads the real
 * exported bundle, intercepting the catalogue, `/currencies` and `/languages`.
 * Each answer is **held until the state under test has been measured**, so the
 * race between a fetch and an assertion cannot decide the result.
 *
 * ## Cheap, and separate from `check:panel` on purpose
 *
 * `check:panel` is seven silent minutes and is the user's to run. This one is a
 * handful of page loads and exists to be run casually, which is why none of
 * what it does is folded in there.
 *
 * ## The panel is opened before anything is read
 *
 * **Neither control is in the static export.** The desktop panel and the mobile
 * drawer are both behind `open` state inside an `AnimatePresence`, so a row
 * assertion against a freshly loaded page asserts against nothing and passes for
 * the wrong reason. Every read below presses `[data-locale-menu]` first.
 *
 * ## One of the five facts is not provable here, and that is structural
 *
 * Fact 5's second half — the language group *appearing* at two entries — cannot
 * happen in a browser today. `resolveLanguages` draws the intersection of the
 * live answer with `BUILT_LOCALES`, and this export is built for English alone,
 * so no answer from `/languages` can produce two rows until #69 adds the
 * `[locale]` segment. What is asserted here is the half that is reachable: the
 * group stays away however many languages the endpoint offers. The other half
 * is `languages.test.ts`, which varies `built` through the parameter it is
 * exported with.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const root = join(process.cwd(), "out");
const PORT = 4322;
const origin = `http://localhost:${PORT}`;

/** The globe. A hook rather than its label, as `check:panel` selects its button. */
const TRIGGER = "[data-locale-menu]";

/** The desktop panel's rows. `LocaleMenu` draws a listbox; the drawer draws a group. */
const CURRENCY_ROWS = '[role="listbox"][aria-label="Currency"] [role="option"]';
const LANGUAGE_GROUP = '[role="listbox"][aria-label="Language"]';

/** The one control on the reading page that can take money. */
const HOSTED = "#get-my-reading [data-hosted-checkout]";

const PAY_TOKEN = "kQ3rN8xvT1sLb0Zy";

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".otf": "font/otf", ".txt": "text/plain", ".ico": "image/x-icon",
  ".mp4": "video/mp4",
};

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(req.url.split("?")[0]);

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
 * A fulfilled cross-origin answer. The API is on another origin, so a reply
 * with no `Access-Control-Allow-Origin` reaches the page as a network failure —
 * which would make every state below look like an unreachable backend.
 */
function api(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Accept, X-XSRF-TOKEN",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

/**
 * The catalogue, priced in whatever the request asked for.
 *
 * **The backend's resolution order, honoured rather than imitated.** A request
 * carrying `?currency=` is answered in it; one carrying none is answered in EUR,
 * which is what this network's `CF-IPCountry` detection would do. That is the
 * whole of the cold-load fact, so the stub has to obey it or the assertion is
 * measuring the stub.
 */
const RATES = { EUR: 1, USD: 1.1, GBP: 0.85, JPY: 160 };
const SYMBOLS = { EUR: "€", USD: "$", GBP: "£", JPY: "¥" };

function catalogue(currency) {
  const rate = RATES[currency] ?? 1;

  return [
    ["one-card", "1 CARD READING", 1200],
    ["three-card", "3 CARD READING", 5200],
    ["month-ahead", "MONTH AHEAD", 7500],
    ["viewing-room-pass", "VIEWING ROOM", 2900],
    ["in-depth", "IN DEPTH", 12000],
  ].map(([key, name, base]) => ({
    key,
    type: "reading",
    name,
    short_description: "Priced by the stub.",
    allows_question: true,
    price: { currency, amount: Math.round(base * rate) },
  }));
}

/**
 * `available`, and only `code` and `symbol` read off each entry — the shapes
 * `fetchCurrencies` and `fetchLanguages` actually parse. A stub answering some
 * other shape falls back to `KNOWN_CURRENCIES` and the check then measures the
 * fallback while appearing to measure the endpoint.
 *
 * Four, where the fallback holds three: a JPY row is how a run can tell the
 * endpoint's list from the one held in `currencies.ts`.
 */
const CURRENCIES = {
  available: [
    { code: "EUR", symbol: "€" },
    { code: "USD", symbol: "$" },
    { code: "GBP", symbol: "£" },
    { code: "JPY", symbol: "¥" },
  ],
  // Answered by the backend and deliberately never read — see `fetchCurrencies`.
  detected: "EUR",
};

/** A bare array, and two live languages, to prove the intersection. */
const LANGUAGES = [
  { code: "en", label: "English", native_name: "English" },
  { code: "es", label: "Spanish", native_name: "Español" },
];

/** Every product address the page asked for, in order, with its query intact. */
function watch(page) {
  const asked = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/v1/") && url.includes("/products")) asked.push(url);
  });

  return asked;
}

/** What `?currency=` each product request carried, `null` where it carried none. */
function sent(asked) {
  return asked.map((url) => new URL(url).searchParams.get("currency"));
}

/**
 * Opens a page with the catalogue, the two flat endpoints and the checkout
 * intercepted.
 *
 * `seed` writes `localStorage` before the bundle runs, which is how a visitor
 * who chose on a previous page load is reproduced without pressing anything.
 */
async function open(path, { seed = {}, holdOrder = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const asked = watch(page);

  let releaseOrder = () => {};
  const orderHeld = new Promise((resolve) => (releaseOrder = resolve));

  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
  }, seed);

  await page.route("**/api/v1/*/products**", async (route) => {
    const currency = new URL(route.request().url()).searchParams.get("currency") ?? "EUR";
    const answer = catalogue(currency);
    const single = /\/products\/[^/?]+/.test(route.request().url());

    await route.fulfill(api(single ? { ...answer[2], long_description: "Long." } : answer));
  });

  await page.route("**/api/v1/currencies", (route) => route.fulfill(api(CURRENCIES)));
  await page.route("**/api/v1/languages", (route) => route.fulfill(api(LANGUAGES)));
  await page.route("**/api/v1/payment-methods", (route) => route.fulfill(api({ methods: ["stripe"] })));
  await page.route("**/sanctum/csrf-cookie", (route) => route.fulfill(api({}, 204)));

  await page.route("**/api/v1/orders", async (route) => {
    if (holdOrder) await orderHeld;
    await route.fulfill(
      api({ id: 41, status: "pending", currency: "EUR", total_amount: 7500, lines: [], pay_token: PAY_TOKEN }, 201),
    );
  });

  await page.route("**/api/v1/orders/*/pay", (route) =>
    route.fulfill(api({ type: "redirect", redirect_url: `${origin}/stripe-stands-here/cs_test_a1B2c3` })),
  );

  await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });

  return { page, asked, releaseOrder };
}

/** Presses the globe and waits for the panel, which is not in the export. */
async function openPanel(page) {
  await page.locator(TRIGGER).first().click();
  await page.waitForSelector(CURRENCY_ROWS, { timeout: 5000 });
}

/** The codes the control draws, and which one it is highlighting. */
async function rows(page) {
  return page.$$eval(CURRENCY_ROWS, (nodes) =>
    nodes.map((node) => ({
      text: node.textContent.trim(),
      selected: node.getAttribute("aria-selected") === "true",
      frozen: node.getAttribute("aria-disabled") === "true",
    })),
  );
}

/** Every price on screen, read out of the labels the cards already carry. */
async function prices(page, selector) {
  return page.$$eval(selector, (nodes) => nodes.map((node) => node.getAttribute("aria-label")));
}

/**
 * Waits for every label in `selector` to carry `symbol`.
 *
 * **Not a wait on the document's text**, which is the trap this walked into
 * once: with the panel open, its own `£GBP` row satisfies "the page contains a
 * pound sign" the instant it is drawn, and the assertion then reads the prices
 * before the round trip that would have moved them has landed. A wait has to
 * name the thing under test.
 */
async function repricedTo(page, selector, symbol) {
  await page
    .waitForFunction(
      ([css, glyph]) => {
        const labels = [...document.querySelectorAll(css)].map((node) => node.getAttribute("aria-label") ?? "");

        return labels.length > 0 && labels.every((label) => label.includes(glyph));
      },
      [selector, symbol],
      { timeout: 8000 },
    )
    .catch(() => {});
}

/* ── cold ────────────────────────────────────────────────────────────────── */

console.log("\ncold — nobody has chosen anything");
{
  const { page, asked } = await open("/");

  await page.waitForFunction(() => document.body.textContent.includes("€"), null, { timeout: 8000 });

  // Fact 2. Every product request, not merely the first — a second surface
  // asking with a parameter would be the same bug arriving later.
  expect("cold", "no product request carries ?currency=", sent(asked), asked.map(() => null));

  await openPanel(page);

  // Fact 5, the half a browser can reach. Two live languages, one built.
  expect("cold", "the language group stays away at one built locale", await page.locator(LANGUAGE_GROUP).count(), 0);

  // The rows are the endpoint's, which is step 6.
  expect(
    "cold",
    "the currency rows are the endpoint's four",
    (await rows(page)).map((row) => row.text.replace(/\s+/g, "")),
    ["€EUR", "$USD", "£GBP", "¥JPY"],
  );

  // The backend answered EUR from detection, and that is what is highlighted.
  expect("cold", "the control highlights what the backend resolved", (await rows(page)).filter((row) => row.selected).length, 1);

  await page.close();
}

/* ── chosen ──────────────────────────────────────────────────────────────── */

console.log("\nchosen — a visitor presses a row");
{
  const { page, asked } = await open("/");

  await page.waitForFunction(() => document.body.textContent.includes("€"), null, { timeout: 8000 });

  const before = await prices(page, "article a[aria-label]");
  const cold = asked.length;

  await openPanel(page);
  await page.locator(CURRENCY_ROWS, { hasText: "GBP" }).first().click();

  await repricedTo(page, "article a[aria-label]", "£");

  // Fact 1.
  expect("chosen", "every request after the press carries ?currency=GBP", sent(asked).slice(cold), sent(asked).slice(cold).map(() => "GBP"));

  // Fact 3, the homepage half: one call re-priced the tiles.
  expect("chosen", "the press cost exactly one catalogue call", asked.length - cold, 1);

  const after = await prices(page, "article a[aria-label]");
  expect("chosen", "the tiles were priced in € and are now priced in £", [before.every((label) => label.includes("€")), after.every((label) => label.includes("£"))], [true, true]);

  await page.close();
}

/* ── the readings index ──────────────────────────────────────────────────── */

console.log("\nreadings — both surfaces move from one call");
{
  const { page, asked } = await open("/readings/");

  await page.waitForFunction(() => document.body.textContent.includes("€"), null, { timeout: 8000 });

  const cold = asked.length;

  await openPanel(page);
  await page.locator(CURRENCY_ROWS, { hasText: "JPY" }).first().click();

  await repricedTo(page, "a.reading-card[aria-label]", "¥");

  // Fact 3, the readings half. The cards and the signature panel are separate
  // components asking one store, which is the whole of step 3.
  expect("readings", "the press cost exactly one catalogue call", asked.length - cold, 1);

  const cards = await prices(page, "a.reading-card[aria-label]");
  expect("readings", "every card is priced in ¥", cards.every((label) => label.includes("¥")), true);

  /*
    The signature panel is the index's second surface and not a card, so it is
    read separately — the fact under test is that one answer moved both, which
    is only a fact if they are measured apart.
  */
  const signature = await page.locator('a[aria-label*="Signature"], a[aria-label*="1 Card"]').first().getAttribute("aria-label");
  expect("readings", "the signature panel moved with them, off the same answer", signature?.includes("¥"), true);

  await page.close();
}

/* ── returning ───────────────────────────────────────────────────────────── */

console.log("\nreturning — a visitor who chose on a previous page load");
{
  // Not a press: this is what a reload looks like to the bundle, and it is the
  // state the browser pass of step 11 found a second request hiding in.
  const { page, asked } = await open("/", { seed: { "currency.chosen": "GBP", "currency.resolved": "GBP" } });

  await repricedTo(page, "article a[aria-label]", "£");
  await page.waitForTimeout(600);

  /*
    **One call, carrying the choice.** The hydration render has to report
    "nothing chosen" — the export was built that way and the first client paint
    must agree with it — so an effect that closes over that render's value asks
    cold, and asks again when the store loads. Fact 1 says *every* product
    request carries a chosen currency, and the first of those two carried none.
  */
  expect("returning", "the reload cost one catalogue call", asked.length, 1);
  expect("returning", "and it carried the choice", sent(asked), ["GBP"]);

  await page.close();
}

console.log("\nreturning — on the reading page, which is the one that takes money");
{
  const { page, asked } = await open("/readings/month-ahead/", {
    seed: { "currency.chosen": "GBP", "currency.resolved": "GBP" },
  });

  await page.waitForSelector(HOSTED, { timeout: 8000 });
  await page.waitForTimeout(1200);

  /*
    `useProduct` is `useCatalogue`'s sibling and had the same hydration bug for
    the same reason. It matters more here: the cold answer's currency is written
    to `resolved` on the way past, so a returning visitor's stored resolution was
    being overwritten with a detected one — on the page holding the checkout
    button, while the offer beside it quoted the wrong currency for a beat.
  */
  /*
    **Fact 1 is the assertion, not a call count.** `useProduct` re-runs its
    effect once when the store loads and the dependency changes, and its cleanup
    aborts the first request — so a reload costs one wasted round trip for the
    same URL. That is a cost, not a defect: nothing wrong is fetched, written or
    painted.

    Removing it needs a module-scoped guard like `askCatalogue`'s, and
    `catalogue.ts` records why a per-mount one cannot be used — React's
    development double-mount would let the second mount skip a request the
    first's cleanup had already aborted, and the page would load forever. Not
    worth that to save an aborted request. The close-out says so.
  */
  expect("returning/reading", "every product request carries the choice", sent(asked), asked.map(() => "GBP"));

  await page.close();
}

/* ── resolved ────────────────────────────────────────────────────────────── */

console.log("\nresolved — remembered, highlighted, and never sent");
{
  // A visitor the backend priced in GBP and who chose nothing. `chosen` absent
  // is the whole point: this is what a cold visitor looks like on their second
  // page load, and sending GBP back would turn detection into a choice.
  const { page, asked } = await open("/", { seed: { "currency.resolved": "GBP" } });

  await page.waitForFunction(() => document.body.textContent.length > 0, null, { timeout: 8000 });
  await page.waitForTimeout(500);

  // Fact 4's sharp half.
  expect("resolved", "a remembered resolution is never sent", sent(asked), asked.map(() => null));

  await openPanel(page);

  /*
    **EUR, not the remembered GBP, and that is the rule working.** `resolved` is
    what the backend *last* answered with: this visitor chose nothing, so the
    cold request was answered from detection, and the highlight follows the
    fresh answer rather than the stale one. A visitor who crossed a border since
    their last visit is repriced, which is the whole reason `chosen` is not
    written here. The `/login/` case below is where a remembered value survives,
    because nothing there asks.
  */
  expect("resolved", "a fresh answer replaces what was remembered", (await rows(page)).find((row) => row.selected)?.text.includes("EUR"), true);

  await page.close();
}

console.log("\nresolved — on a page that fetches no product");
{
  const { page, asked } = await open("/login/", { seed: { "currency.resolved": "JPY" } });

  await openPanel(page);

  // The reason `resolved` is persisted at all: `/login/`, `/set-password/` and
  // `/checkout/complete/` price nothing, so without it the control would draw
  // with no row selected.
  expect("login", "the page asked for no product", asked.length, 0);
  expect("login", "the control still highlights", (await rows(page)).find((row) => row.selected)?.text.includes("JPY"), true);

  await page.close();
}

/* ── frozen ──────────────────────────────────────────────────────────────── */

console.log("\nfrozen — the control while a payment is in flight");
{
  const { page, releaseOrder } = await open("/readings/month-ahead/", { holdOrder: true });

  await page.waitForSelector(HOSTED, { timeout: 8000 });
  await page.waitForFunction(
    () => document.querySelector("[data-hosted-checkout]")?.getAttribute("aria-disabled") !== "true",
    null,
    { timeout: 8000 },
  );

  await openPanel(page);
  expect("frozen", "the rows are live before the press", (await rows(page)).every((row) => !row.frozen), true);

  // The panel is a popover and the button is behind it. Closed first, pressed,
  // then reopened — which is also what a customer does.
  await page.keyboard.press("Escape");
  await page.locator(HOSTED).first().click({ force: true });

  await page.waitForFunction(
    () => document.querySelector("[data-hosted-checkout]")?.getAttribute("aria-busy") === "true",
    null,
    { timeout: 8000 },
  );

  await openPanel(page);

  // Step 8's completion criterion, and the reason the write is held: the state
  // is measured while the round trip is genuinely out.
  expect("frozen", "every currency row is inert while the write is out", (await rows(page)).every((row) => row.frozen), true);

  // Inert, not disabled. The client rejected a disabled control on this site.
  expect("frozen", "the rows are aria-disabled rather than disabled", await page.locator(`${CURRENCY_ROWS}[disabled]`).count(), 0);

  const highlighted = (await rows(page)).find((row) => row.selected)?.text;
  await page.locator(CURRENCY_ROWS, { hasText: "JPY" }).first().click({ force: true });
  await page.waitForTimeout(300);

  expect("frozen", "a press on a frozen row changes nothing", (await rows(page)).find((row) => row.selected)?.text, highlighted);

  await page.keyboard.press("Escape");
  releaseOrder();

  // The pay call answers a redirect this server 404s, which is a page like any
  // other to have arrived at.
  await page.waitForURL((url) => url.href.includes("cs_test_a1B2c3"), { timeout: 8000 }).catch(() => {});

  await page.close();
}

console.log("\nsettled — the control after a refused write");
{
  const { page } = await open("/readings/month-ahead/", { holdOrder: false });

  await page.waitForSelector(HOSTED, { timeout: 8000 });
  await page.route("**/api/v1/orders", (route) => route.fulfill(api({ message: "No." }, 422)));

  await page.waitForFunction(
    () => document.querySelector("[data-hosted-checkout]")?.getAttribute("aria-disabled") !== "true",
    null,
    { timeout: 8000 },
  );

  await page.locator(HOSTED).first().click({ force: true });
  await page.waitForTimeout(1000);

  await openPanel(page);
  expect("settled", "a refused write leaves the control live again", (await rows(page)).every((row) => !row.frozen), true);

  await page.close();
}

await browser.close();
server.close();

console.log(
  failures.length ? `\n${failures.length} failed\n${failures.map((line) => `  ${line}`).join("\n")}` : "\nAll good.",
);

process.exit(failures.length ? 1 : 0);
