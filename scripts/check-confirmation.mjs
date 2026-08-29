/**
 * Drives `/checkout/complete/` through every state a customer can land in.
 *
 * `npm run build && npm run check:confirmation` — serves `out/` and loads the
 * real exported bundle, intercepting `POST /api/v1/orders/status` to answer with
 * each PaymentIntent status in turn. No backend and no real payment: the
 * screen's whole input is an address, a record in the tab, and what our own
 * backend says about the payment, and all three are supplied here.
 *
 * This exists because none of what the ticket asks for can be checked by the
 * type checker or by `node --test`. They are all facts about a rendered page
 * reached by an address: that it says `received` **before** anything is asked
 * of the backend, that it corrects itself when the answer disagrees and stands
 * its ground when the answer is not an answer, that a second purchase in this
 * tab cannot show the first one's result, that landing with nothing recoverable
 * is honest rather than broken — and that **no state on this screen claims a
 * reading has been sent**, which is the one sentence the confirmation may never
 * contain and the easiest one to add by accident.
 *
 * The pay token assertion is the other reason. It is a credential, and the
 * check watches every URL the browser visits, not just the one we navigate to.
 *
 * ## The status answer is held, deliberately
 *
 * Every run holds the backend's reply until the screen has been read once. That
 * is what turns "renders optimistically" from a claim about the code into a
 * measurement: the words are read while the request is still in flight, and
 * again after it lands. A screen that waited for the answer would be caught by
 * the first read rather than by nothing at all.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const root = join(process.cwd(), "out");
const PORT = 4322;
const PAGE = `http://localhost:${PORT}/checkout/complete/`;

const HEADING = "h1";

/** A pay token, as the backend issues them. It may appear in no address. */
const PAY_TOKEN = "pay-token-that-must-never-be-in-a-url";

const FIRST = { sessionId: "cs_test_First", money: { currency: "EUR", amount: 4900 } };
const SECOND = { sessionId: "cs_test_Second", money: { currency: "EUR", amount: 7500 } };

/** What Buy Now wrote before the browser left for Stripe. */
function record({ sessionId, money }) {
  return { payToken: PAY_TOKEN, money, sessionId, productKey: "month-ahead", question: "What next?" };
}

/**
 * Anything that would be a lie on a screen rendered from a payment.
 *
 * Only the backend settles an order, on a verified webhook, and it may not have
 * happened yet. The receipt is allowed to be mentioned as something that will
 * arrive; a reading being on its way is not.
 */
const FULFILMENT_CLAIMS = /\breading is\b|\breading has\b|on its way to you|\bsent your reading\b|\byour reading\b/i;

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

/** The API is on another origin, so a fulfilled answer needs the CORS headers. */
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

const settledHeading = () => {
  const heading = document.querySelector("h1");

  return heading !== null && !/^Checking/.test(heading.textContent ?? "");
};

/**
 * Opens a page with a seeded tab, holds the backend's answer until the screen
 * has been read, then reads it again.
 *
 * `stored` is what Buy Now would have written before the browser left; `query`
 * is what Stripe puts in the address on the way back. Either can be absent,
 * which is how the arrival with nothing at all is told apart from the rest.
 */
async function drive(state, { stored, query, answer, settle = 400 }) {
  console.log(`\n${state}`);

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const visited = [];
  const asked = [];

  page.on("request", (request) => {
    visited.push(request.url());
    if (request.url().includes("/api/v1/orders/status")) asked.push(request.postData());
  });
  page.on("framenavigated", (frame) => visited.push(frame.url()));

  if (stored) {
    await page.addInitScript((value) => {
      sessionStorage.setItem("checkout", value);
    }, JSON.stringify(stored));
  }

  let release = () => {};
  const held = new Promise((resolve) => (release = resolve));

  await page.route("**/sanctum/csrf-cookie", (route) => route.fulfill(api({}, 204)));

  await page.route("**/api/v1/orders/status", async (route) => {
    await held;
    await route.fulfill(answer ?? api({ status: "succeeded" }));
  });

  const url = query ? `${PAGE}?${new URLSearchParams(query)}` : PAGE;

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Settled is "not the checking heading any more", which is a page-side fact
  // rather than a timeout.
  await page.waitForFunction(settledHeading, null, { timeout: 20000 }).catch(() => {});

  const read = async () => ({
    heading: (await page.locator(HEADING).first().innerText().catch(() => "")).trim(),
    text: (await page.locator("main").innerText().catch(() => "")).trim(),
  });

  /** What the customer sees while the backend is still being asked. */
  const painted = await read();

  release();

  // Long enough for the answer to land and the screen to correct itself, and
  // long enough that a screen which polled would have asked a second time.
  await page.waitForTimeout(settle);

  const shown = await read();
  const verifications = asked.length;

  // The reload criterion, taken literally: the same address again, nothing
  // cleared in between, and the same words back.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(settledHeading, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(settle);

  const reloaded = await read();

  await page.close();

  return {
    painted,
    shown,
    reloaded,
    verifications,
    visited,
    stripeJs: visited.filter((url) => url.includes("js.stripe.com")),
  };
}

const runs = [
  {
    state: "Back from Stripe having paid, which is the only way this address is reached",
    input: { stored: record(FIRST), query: { session_id: FIRST.sessionId } },
    assert: ({ painted, shown }) => {
      // The whole of "no spinner": the words are already true before anything
      // has been asked of anybody.
      expect("paid", "says the payment was received before the backend answers", /payment has been received/i.test(painted.heading), true);
      expect("paid", "and restates the amount from the record", /€49/.test(painted.text), true);
      expect("paid", "and still does once it has", /payment has been received/i.test(shown.heading), true);
    },
  },
  {
    state: "The backend disagrees — the payment is still processing",
    input: {
      stored: record(FIRST),
      query: { session_id: FIRST.sessionId },
      answer: api({ status: "processing" }),
    },
    assert: ({ painted, shown }) => {
      expect("processing", "paints received first, as every arrival does", /payment has been received/i.test(painted.heading), true);
      expect("processing", "then corrects itself", /going through/i.test(shown.heading), true);
      expect("processing", "and no longer claims receipt", /has been received/i.test(shown.heading), false);
    },
  },
  {
    state: "The backend disagrees harder — nothing was collected",
    input: {
      stored: record(FIRST),
      query: { session_id: FIRST.sessionId },
      answer: api({ status: "requires_payment_method" }),
    },
    assert: ({ shown }) => {
      expect("unpaid", "says no payment was taken", /no payment was taken/i.test(shown.heading), true);
      expect("unpaid", "says nothing has been charged", /nothing has been charged/i.test(shown.text), true);
    },
  },
  {
    state: "The backend cannot reach Stripe — a 503",
    input: {
      stored: record(FIRST),
      query: { session_id: FIRST.sessionId },
      answer: api({ message: "Stripe could not be reached." }, 503),
    },
    assert: ({ shown }) => {
      /*
        A 503 says nothing whatsoever about the payment, and the payment is one
        Stripe had already taken before it sent the customer here. Replacing
        `received` with a hedge on the strength of not knowing would be the
        worst of both.
      */
      expect("503", "the optimistic paint stands", /payment has been received/i.test(shown.heading), true);
      expect("503", "and nothing hedges", /could not check|cannot show/i.test(shown.text), false);
    },
  },
  {
    state: "A status this build has never heard of",
    input: {
      stored: record(FIRST),
      query: { session_id: FIRST.sessionId },
      answer: api({ status: "requires_something_stripe_adds_in_2027" }),
    },
    assert: ({ shown }) => {
      expect("unknown status", "the optimistic paint stands", /payment has been received/i.test(shown.heading), true);
    },
  },
  {
    state: "A typed address, with a record from a real purchase sitting in the tab",
    input: { stored: record(FIRST) },
    assert: ({ shown, verifications }) => {
      expect("typed", "does not error", shown.heading !== "", true);
      expect("typed", "does not read as a confirmation", /received|thank you/i.test(shown.text), false);
      expect("typed", "says plainly it cannot show the payment", /cannot show/i.test(shown.heading), true);
      // Nothing names a payment, so there is nothing to ask about. The pay
      // token in that record is not a reason to go looking.
      expect("typed", "and asks the backend nothing", verifications, 0);
    },
  },
  {
    state: "A second purchase in this tab, with the first purchase's address",
    input: {
      // The record is the second purchase; the URL is the first. This is the
      // back button pressed part-way through buying again.
      stored: record(SECOND),
      query: { session_id: FIRST.sessionId },
    },
    assert: ({ shown }) => {
      expect("two purchases", "shows nothing of the other purchase", /cannot show/i.test(shown.heading), true);
      expect("two purchases", "and never its amount", /€75/.test(shown.text), false);
    },
  },
  {
    state: "Paid in a tab that could not keep the record",
    input: { query: { session_id: FIRST.sessionId } },
    assert: ({ shown }) => {
      /*
        Storage off, or the address opened somewhere else. There is no pay
        token, so there is nothing to ask and no amount to restate — and the
        receipt is the record that counts, which is what this copy says.
      */
      expect("no record", "is honest rather than broken", /cannot show/i.test(shown.heading), true);
      expect("no record", "and points at the receipt", /receipt/i.test(shown.text), true);
    },
  },
];

for (const run of runs) {
  const result = await drive(run.state, run.input);

  run.assert(result);

  expect(run.state, "says the same thing after a reload", result.reloaded, result.shown);
  expect(run.state, "never claims a reading is on its way", FULFILMENT_CLAIMS.test(result.shown.text), false);
  expect(
    run.state,
    "puts the pay token in no address the browser visits",
    result.visited.filter((url) => url.includes(PAY_TOKEN)),
    [],
  );
  /*
    Stripe.js is not loaded on this road. The confirmation was its other caller
    on the reading page's side of the flow, and a request to js.stripe.com
    appearing here again is the same accident `check:panel` watches for.
  */
  expect(run.state, "asks js.stripe.com for nothing", result.stripeJs, []);
}

/**
 * The divergence from the contract, measured rather than asserted in prose.
 *
 * `API_CONTRACT.md` says to poll `POST /orders/status` — a short interval for a
 * few seconds after the return, then back off. This screen does not, because it
 * starts at `received` rather than at "we do not know", and a poll could only
 * confirm what is on screen or mutate a message under somebody reading it.
 *
 * Three seconds is inside the window the contract's own advice describes, so a
 * screen that polled at all would have asked again by the time this reads.
 */
const patient = await drive("Three seconds later, having asked once", {
  stored: record(FIRST),
  query: { session_id: FIRST.sessionId },
  settle: 3000,
});

expect("no poll", "verifies exactly once and does not poll", patient.verifications, 1);
expect("no poll", "and still says the payment was received", /payment has been received/i.test(patient.shown.heading), true);

await browser.close();
server.close();

if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}

console.log("\nAll good.");
