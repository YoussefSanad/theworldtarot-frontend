/**
 * Drives the reading page's payment panel through every state it can be in, and
 * presses Buy Now in each of them.
 *
 * `npm run build && npm run check:panel` — serves `out/` and loads the real
 * exported bundle once per state, answering the product endpoint 200, 404 and
 * 500 in turn. Each answer is **held until the loading state has been
 * measured**, so the race between the fetch and the assertion cannot decide the
 * result.
 *
 * This exists because the things the ticket asks for cannot be checked by the
 * type checker or by `node --test`: that the panel does not move under a
 * customer's thumb while the price is in flight, that no order can be placed
 * from a price no server agreed to, and that one press places an order, pays
 * it, remembers it and leaves. All of them are facts about a laid-out page and
 * the requests it makes. See `docs/plans/hosted-checkout.md`.
 *
 * ## The whole checkout is answered here, not just the catalogue
 *
 * `/orders` and `/orders/{token}/pay` are intercepted too, which is what lets
 * the live state be **pressed** rather than merely inspected — and pressed
 * without placing a real order against staging every time somebody runs this.
 * The redirect it is handed points back at this server carrying a `cs_...` in
 * its path, so the navigation can be followed and the record read out of the
 * tab it survived in.
 *
 * ## The wallet assertions are gone, and the negative replaced them
 *
 * There is no express checkout element on this page while the card road stands
 * alone, so there is nothing to assert the collapse of. **What is asserted
 * instead is that no Stripe iframe mounts on the reading page in any state, and
 * that nothing fetches js.stripe.com.** It is worth more than it looks: Stripe.js
 * is not loaded on this road at all, and a check that would notice it coming
 * back is the check that catches a half-finished wallet ticket shipping by
 * accident. #48 is where it comes back on purpose, with its own assertions.
 *
 * `npm run check:panel -- --live` drops the interception and lets the page talk
 * to the API in `.env.local`, which is the one thing the intercepted run cannot
 * prove: that the endpoint answers this product key at all. **It presses
 * nothing**, because there a press would place a real order. It serves on
 * **port 3000 deliberately** — that is the origin staging's
 * `CORS_ALLOWED_ORIGINS` carries, so any other port fails as an opaque network
 * error rather than as a CORS message.
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

/** The client's frames. Buy Now wears the same treatment and is one of them. */
const GHOST = "#get-my-reading .checkout-option";

/** The one control that can take money. Selected by its hook, not its words. */
const BUY = "#get-my-reading [data-buy-now]";

const GIFT = '#get-my-reading button:has-text("gift a reading")';

/**
 * Proof Stripe.js built an element. **Page-wide rather than inside the panel**:
 * the claim is that nothing on this page mounts one, and an element that
 * appeared somewhere else on it would be the same accident.
 */
const STRIPE_FRAME = 'iframe[name^="__privateStripeFrame"]';

/** What the customer types, and what has to survive as far as the order line. */
const QUESTION = "What should I focus on this month?";

/**
 * Where the browser is sent instead of Stripe. It carries a `cs_...` in its
 * **path**, which is where `sessionIdFrom` reads one, and it lands back on this
 * server — which answers 404 for it, and 404 is a page like any other to assert
 * an address on.
 */
const SESSION_ID = "cs_test_a1B2c3";
const SESSION_URL = `http://localhost:${PORT}/stripe-stands-here/${SESSION_ID}`;

const PAY_TOKEN = "kQ3rN8xvT1sLb0Zy";

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

/**
 * Key order is not a fact about a record. `JSON.stringify` disagrees, so
 * objects are serialised with their keys sorted — otherwise moving a field in
 * a type fails a check that is measuring something else entirely.
 */
function stable(value) {
  return JSON.stringify(value, (_, held) =>
    held && typeof held === "object" && !Array.isArray(held)
      ? Object.fromEntries(Object.entries(held).sort(([a], [b]) => a.localeCompare(b)))
      : held,
  );
}

function expect(state, what, actual, wanted) {
  const ok = stable(actual) === stable(wanted);
  if (!ok) failures.push(`${state}: ${what} was ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);

  console.log(`  ${ok ? "✓" : "✗"} ${what}: ${JSON.stringify(actual)}`);
}

const ORDER = {
  id: 41,
  status: "pending",
  currency: "EUR",
  total_amount: 7000,
  lines: [{ product: "month-ahead", unit_amount: 7000, quantity: 1, question: QUESTION }],
  pay_token: PAY_TOKEN,
};

/**
 * A fulfilled cross-origin answer. The API is on another origin, so a reply
 * with no `Access-Control-Allow-Origin` is one the browser hands the page as a
 * network failure — which would make every state below look like `unreachable`.
 */
function api(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    headers: {
      "Access-Control-Allow-Origin": `http://localhost:${PORT}`,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Accept, X-XSRF-TOKEN",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

/**
 * Loads the page, measures the resting state, lets the API answer, and reads
 * the panel back.
 *
 * `settled` is a page-side predicate rather than a timeout. A fixed wait is
 * long enough for a route handler and not for a real round trip to staging,
 * which is exactly the kind of flake that gets a check disbelieved.
 */
async function drive(
  state,
  response,
  settled,
  { gift = false, press = false, cancelled, payAnswer, holdWrites = false } = {},
) {
  console.log(`\n${state}`);

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  /*
    A checkout the customer walked away from at Stripe. They come back to an
    ordinary page load with nothing in the address to say where they have been,
    so the record written before they left is the only evidence there is.
  */
  if (cancelled) {
    await page.addInitScript((value) => {
      sessionStorage.setItem("checkout", value);
    }, JSON.stringify(cancelled));
  }

  /*
    Stripe validates its options inside the iframe and reports a bad one by
    throwing, not by rejecting a promise anybody awaits. Nothing here mounts a
    Stripe element any more, so this is now watching for one appearing rather
    than for one misbehaving — either way it is the same line of evidence.
  */
  const thrown = [];

  page.on("pageerror", (error) => thrown.push(error.message.split("\n")[0]));
  page.on("console", (message) => {
    const text = message.text();

    if (message.type() === "error" && /IntegrationError|Stripe/.test(text)) thrown.push(text.split("\n")[0]);
  });

  /** Every address the page asks for, so a request that must not happen can be named. */
  const asked = [];
  const placed = [];
  const paid = [];

  page.on("request", (request) => asked.push(request.url()));

  let release = () => {};
  let releaseOrder = () => {};
  let releasePay = () => {};

  /* The two writes one press makes, each answerable on this script's schedule. */
  const orderHeld = new Promise((resolve) => (releaseOrder = resolve));
  const payHeld = new Promise((resolve) => (releasePay = resolve));

  if (!live) {
    const held = new Promise((resolve) => (release = resolve));

    await page.route("**/api/v1/*/products/**", async (route) => {
      await held;
      await route.fulfill(response);
    });

    // The handshake `api-write.ts` makes before every write.
    await page.route("**/sanctum/csrf-cookie", (route) => route.fulfill(api({}, 204)));

    // Anchored patterns: this one matches the endpoint and never the `/pay`
    // under it, because a glob has to match the whole address.
    await page.route("**/api/v1/orders", async (route) => {
      placed.push(JSON.parse(route.request().postData() ?? "null"));
      // Held, where the point is to read the button while the first round trip
      // is still in flight.
      if (holdWrites) await orderHeld;
      await route.fulfill(api(ORDER, 201));
    });

    await page.route("**/api/v1/orders/*/pay", async (route) => {
      paid.push({
        url: route.request().url(),
        body: JSON.parse(route.request().postData() ?? "null"),
      });
      if (holdWrites) await payHeld;
      await route.fulfill(payAnswer ?? api({ type: "redirect", redirect_url: SESSION_URL }));
    });
  }

  await page.goto(PAGE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(RESTING);

  const resting = {
    height: Math.round(await page.$eval(PANEL, (node) => node.getBoundingClientRect().height)),
    visibleControls: await page.locator("#get-my-reading button:visible").count(),
    // Present in the layout, holding its height, while being none of those
    // things — which is what `invisible` and `inert` together buy.
    buyNow: await page.locator(BUY).count(),
    // A control inside an `inert` subtree is not reachable by a pointer, a tab,
    // a screen reader or `element.click()`, which is the whole claim.
    reachableControls: await page
      .locator("#get-my-reading button")
      .evaluateAll((nodes) => nodes.filter((node) => !node.closest("[inert]")).length),
  };

  release();
  await page.waitForFunction(settled, null, { timeout: 15000 });

  if (gift) await page.locator(GIFT).click();

  /*
    Typed before the press, and read off the form by the press itself. In gift
    mode there is no question field in the DOM at all — the sections are
    mutually exclusive — so this is skipped rather than made conditional inside
    the page.
  */
  const question = await page.locator("#get-my-reading textarea[name=question]").count();

  const answered = {
    height: Math.round(await page.$eval(PANEL, (node) => node.getBoundingClientRect().height)),
    visibleControls: await page.locator("#get-my-reading button:visible").count(),
    price: (await page.locator(PRICE).first().innerText().catch(() => "")).trim(),
    question,
    /** What is in the box before anything is typed into it. */
    restored: await page
      .locator("#get-my-reading textarea[name=question]")
      .inputValue()
      .catch(() => null),
    counter: (await page.locator("#get-my-reading p.tabular-nums").first().innerText().catch(() => "")).trim(),
    recipient: await page.locator("#get-my-reading input[name=recipientEmail]").count(),
    anchor: await page.locator("#get-my-reading").count(),
    ghosts: await page.locator(GHOST).count(),
    // Whitespace-flattened: the label and the amount are two spans that the
    // column lays out one above the other, and where the line breaks is not
    // what this is asserting.
    buyNow: (await page.locator(BUY).first().innerText().catch(() => "")).trim().replace(/\s+/g, " "),
    /* Announced as unavailable is how the two inert cases say so out loud. */
    buyNowDisabled: await page.locator(BUY).first().getAttribute("aria-disabled").catch(() => null),
    panel: (await page.locator("#get-my-reading").innerText().catch(() => "")).trim(),
    stripeFrames: await page.locator(STRIPE_FRAME).count(),
  };

  if (question > 0 && press) await page.locator("#get-my-reading textarea[name=question]").fill(QUESTION);

  let landed = null;
  let record = null;
  /** What the button says while each of the two round trips is in flight. */
  const pressing = [];

  const label = async () =>
    (await page.locator(BUY).first().innerText().catch(() => "")).trim().replace(/\s+/g, " ");

  if (press) {
    /*
      `force`, because a button announcing itself unavailable is exactly the one
      worth pressing: it is `aria-disabled` rather than `disabled` — the client
      rejected a disabled control as reading like a bug — so a customer's
      pointer really does land on it and really does press it. Playwright's
      actionability check would refuse to reproduce the only case this proves.
    */
    await page.locator(BUY).first().click({ force: true });

    /*
      Two round trips happen before the browser leaves, and the button holds a
      pending state across both. Each is held here in turn, so what the button
      says during each is read rather than inferred from how fast a stub
      answers.
    */
    if (holdWrites) {
      await page
        .waitForFunction(
          () => document.querySelector("[data-buy-now]")?.getAttribute("aria-busy") === "true",
          null,
          { timeout: 5000 },
        )
        .catch(() => {});

      pressing.push(await label());

      releaseOrder();
      await page.waitForFunction(() => true);
      await page.waitForTimeout(300);

      pressing.push(await label());

      releasePay();
    }

    /*
      Either the browser leaves, or it does not and that is the assertion. The
      wait is short and its failure is a legitimate answer rather than an error,
      which is why the address is read afterwards rather than thrown from here.
    */
    await page.waitForURL((url) => url.href.includes(SESSION_ID), { timeout: 8000 }).catch(() => {});

    landed = page.url();
    // sessionStorage is the tab's, not the document's, so it survives the
    // navigation the same way it survives the round trip to Stripe.
    record = await page.evaluate(() => sessionStorage.getItem("checkout")).catch(() => null);
  }

  /** The button once everything has settled — for a refusal, where it stays. */
  const afterwards = press && landed === PAGE ? await label().catch(() => "") : null;

  /** Whatever the panel says after a press that went nowhere. */
  const afterPanel =
    press && landed === PAGE
      ? (await page.locator("#get-my-reading").innerText().catch(() => "")).trim()
      : "";

  await page.close();

  return {
    afterPanel,
    resting,
    settled: answered,
    thrown,
    placed,
    paid,
    pressing,
    landed,
    afterwards,
    record: record === null ? null : JSON.parse(record),
    stripeJs: asked.filter((url) => url.includes("js.stripe.com")),
    orderCalls: asked.filter((url) => url.includes("/api/v1/orders")),
  };
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

const PRICED = api(PRODUCT);
const WITHDRAWN = api({ message: "Not found." }, 404);
const BROKEN = api({ message: "Server error." }, 500);

/** The price line has said something — live or fallback, either settles it. */
const priced = () => {
  const node = document.querySelector("#get-my-reading p.font-display");

  return Boolean(node) && node.innerText.trim().length > 0;
};

/** Nothing is for sale: the whole order came off the page. */
const unsold = () => document.querySelectorAll("#get-my-reading form").length === 0;

/** True of every state, and the reason half of them are driven at all. */
function assertNoStripeOnThePage(state, result) {
  expect(state, "Stripe raised nothing", result.thrown, []);
  expect(state, "no Stripe element is mounted", result.settled.stripeFrames, 0);
  expect(state, "and js.stripe.com is never fetched", result.stripeJs, []);
}

const sold = await drive("live — a priced product", PRICED, priced, {
  press: !live,
  holdWrites: !live,
});

assertNoStripeOnThePage("live", sold);
expect("live", "Buy Now is in the layout while loading", sold.resting.buyNow, 1);
expect("live", "no control is reachable while loading", sold.resting.reachableControls, 0);
expect("live", "and none is visible either", sold.resting.visibleControls, 0);
/*
  Not "does not move". The panel is three frames rather than five and nothing
  in it is drawn by a wallet vendor any more, so the height that settles is the
  height that was reserved. What must never happen is growth: a panel that only
  ever shrinks never puts a control under a finger reaching for something else.
*/
expect("live", "the panel never grows", sold.settled.height <= sold.resting.height, true);
expect("live", "the API's price, in the API's currency", sold.settled.price, "€70");
expect("live", "three frames: Buy Now, redeem, gift", sold.settled.ghosts, 3);
expect("live", "Buy Now is labelled with the price", sold.settled.buyNow, "Buy Now €70");
expect("live", "and is offered rather than announced as unavailable", sold.settled.buyNowDisabled, "false");

if (live) {
  await browser.close();
  server.close();

  console.log(failures.length === 0 ? "\nThe live catalogue prices this page." : "");
  process.exit(failures.length === 0 ? 0 : 1);
}

/*
  One press, and everything it is supposed to do. The order carries the question
  and no identity — Stripe's page collects the buyer's email after the order
  exists — the payment names the page to come back to, the record is written
  before the browser leaves, and the browser leaves.
*/
expect("live", "one press places one order", sold.placed.length, 1);
expect("live", "in the API's currency, with the question on the line", sold.placed[0], {
  currency: "EUR",
  lines: [{ product: "month-ahead", quantity: 1, question: QUESTION }],
});
expect("live", "and no name or email, which the page never collected", sold.placed[0] && "email" in sold.placed[0], false);
expect("live", "then pays it, addressing the order by its pay token", sold.paid.length && sold.paid[0].url.endsWith(`/api/v1/orders/${PAY_TOKEN}/pay`), true);
expect("live", "naming the page to come back to, as a product key", sold.paid[0]?.body, { return_to: "month-ahead" });
/*
  The criterion the two held answers exist for: the pending state is held across
  both round trips, not just the first. A button that looked idle between them
  is a button pressed twice, which is a second order for the same reading.
*/
expect("live", "the button holds a pending state across both round trips", sold.pressing, [
  "Taking you to checkout…",
  "Taking you to checkout…",
]);
expect("live", "the browser goes where Stripe said", sold.landed, SESSION_URL);
expect("live", "and the checkout was remembered before it went", sold.record, {
  payToken: PAY_TOKEN,
  money: { currency: "EUR", amount: 7000 },
  sessionId: SESSION_ID,
  productKey: "month-ahead",
  question: QUESTION,
});

const ahead = await drive("shipped ahead of the backend — an instruction we cannot read", PRICED, priced, {
  press: true,
  payAnswer: api({ type: "conjured_by_a_later_backend" }),
});

assertNoStripeOnThePage("ahead", ahead);
/*
  The window where this frontend has shipped and the backend has not, and the
  window after the backend grows a method this build has never seen. A checkout
  that crashed here would fail for a customer whose order is perfectly fine.
*/
expect("ahead", "the order was placed and the payment asked for", ahead.paid.length, 1);
expect("ahead", "the browser goes nowhere", ahead.landed, PAGE);
expect("ahead", "the panel says so, and says nothing was charged", /could not start the checkout, and nothing has been charged/i.test(ahead.afterPanel), true);
expect("ahead", "and the button is pressable again", ahead.afterwards, "Buy Now €70");
/* Nothing to paint a confirmation from, because nothing was confirmed. */
expect("ahead", "nothing was remembered", ahead.record, null);

const gifted = await drive("gifting — a recipient rather than a question", PRICED, priced, {
  gift: true,
  press: true,
});

assertNoStripeOnThePage("gifting", gifted);
expect("gifting", "the recipient's fields replace the question", gifted.settled.recipient, 1);
expect("gifting", "and there is no question in the form at all", gifted.settled.question, 0);
expect("gifting", "the frames still stand", gifted.settled.ghosts, 3);
expect("gifting", "Buy Now says it is unavailable", gifted.settled.buyNowDisabled, "true");
expect("gifting", "and says why", /gifting is not open yet/i.test(gifted.settled.panel), true);
/*
  The assertion this state exists for. `POST /orders` has no field for a
  recipient email or a gift message, so one live button here charges somebody
  for a gift delivered to themselves.
*/
expect("gifting", "and no order can be placed", gifted.orderCalls, []);
expect("gifting", "so the browser stays where it is", gifted.landed, PAGE);

const gone = await drive("withdrawn — a 404", WITHDRAWN, unsold);

assertNoStripeOnThePage("withdrawn", gone);
expect("withdrawn", "no price", gone.settled.price, "");
expect("withdrawn", "no controls", gone.settled.visibleControls, 0);
expect("withdrawn", "no question either", gone.settled.question, 0);
expect("withdrawn", "the closing call to action still lands", gone.settled.anchor, 1);

const dead = await drive("unreachable — a 500", BROKEN, priced, { press: true });

assertNoStripeOnThePage("unreachable", dead);
expect("unreachable", "the bundled price, as copy", dead.settled.price, "$75");
/*
  The frame stays whole — a visitor arriving while the API is down should not
  meet a hole where the checkout is. None of the three can take money.
*/
expect("unreachable", "the frames stand, all of them duds", dead.settled.ghosts, 3);
expect("unreachable", "Buy Now quotes nothing", dead.settled.buyNow, "Buy Now");
expect("unreachable", "and says it is unavailable", dead.settled.buyNowDisabled, "true");
/*
  The assertion this state exists for. `reading.price` is the string "$75" for a
  reading the catalogue prices at EUR 7000: no currency, and a number nobody has
  verified today. An order placed from it would be an order at an amount no
  server ever agreed to, so no request is possible at all.
*/
expect("unreachable", "and no request is possible", dead.orderCalls, []);
expect("unreachable", "so the browser stays where it is", dead.landed, PAGE);

/**
 * A record for a checkout that was cancelled at Stripe. Everything the page
 * needs to put the question back is in it, and the page it belongs to is named.
 */
function cancelledCheckout(productKey) {
  return {
    payToken: PAY_TOKEN,
    money: { currency: "EUR", amount: 7000 },
    sessionId: SESSION_ID,
    productKey,
    question: QUESTION,
  };
}

const back = await drive("cancelled — back from Stripe, having paid nothing", PRICED, priced, {
  cancelled: cancelledCheckout("month-ahead"),
});

assertNoStripeOnThePage("cancelled", back);
/*
  The one thing a redirect makes easy to get wrong, and the worst thing this
  flow can do: losing several sentences of typed question silently.
*/
expect("cancelled", "the question is back in the box", back.settled.restored, QUESTION);
expect("cancelled", "and the counter agrees with it", back.settled.counter, `${QUESTION.length}/500`);
expect("cancelled", "the panel is offering the reading again", back.settled.buyNowDisabled, "false");

const elsewhere = await drive("cancelled elsewhere — a record from another reading", PRICED, priced, {
  cancelled: cancelledCheckout("three-card"),
});

/*
  A question belongs to the reading it was asked of. Restored onto a different
  one it is a sentence appearing in a box the visitor did not type it in.
*/
expect("another reading", "nothing is restored", elsewhere.settled.restored, "");
expect("another reading", "and the counter starts at nothing", elsewhere.settled.counter, "0/500");

await browser.close();
server.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} failed:\n${failures.map((line) => `  ${line}`).join("\n")}`);
  process.exit(1);
}

console.log("\nEvery state behaves, and one press buys a reading.");
