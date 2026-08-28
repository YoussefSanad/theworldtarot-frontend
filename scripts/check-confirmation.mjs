/**
 * Drives `/checkout/complete/` through every state a customer can land in.
 *
 * `npm run build && npm run check:confirmation` — serves `out/` and loads the
 * real exported bundle, intercepting Stripe's own retrieval endpoint to answer
 * with each PaymentIntent status in turn. No backend and no real payment: the
 * screen's whole input is a client secret and what Stripe says about it, and
 * both are supplied here.
 *
 * This exists because none of what the ticket asks for can be checked by the
 * type checker or by `node --test`. They are all facts about a rendered page
 * reached by an address: that a reload says the same thing, that a second
 * purchase in this tab cannot show the first one's result, that landing with
 * nothing recoverable is honest rather than broken — and that **no state on
 * this screen claims a reading has been sent**, which is the one sentence the
 * confirmation may never contain and the easiest one to add by accident.
 *
 * The pay token assertion is the other reason. It is a credential, and the
 * check watches every URL the browser visits, not just the one we navigate to.
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

const FIRST = { id: "pi_3First", secret: "pi_3First_secret_aaa", money: { currency: "eur", amount: 4900 } };
const SECOND = { id: "pi_3Second", secret: "pi_3Second_secret_bbb", money: { currency: "eur", amount: 7500 } };

/**
 * Anything that would be a lie on a screen rendered from a payment intent.
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

function intent({ id, secret, money }, status) {
  return {
    id,
    object: "payment_intent",
    status,
    client_secret: secret,
    amount: money.amount,
    currency: money.currency,
  };
}

/**
 * Opens a page with a seeded tab, answers Stripe's retrieval, and reads the
 * screen back.
 *
 * `record` is what a payment panel would have written before confirming;
 * `query` is what Stripe would have put in the address on a redirect return.
 * Either can be absent, which is how the two arrival paths — and the arrival
 * with nothing at all — are told apart.
 */
async function drive(state, { record, query, answers }) {
  console.log(`\n${state}`);

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const visited = [];

  page.on("request", (request) => visited.push(request.url()));
  page.on("framenavigated", (frame) => visited.push(frame.url()));

  if (record) {
    await page.addInitScript((value) => {
      sessionStorage.setItem("checkout", value);
    }, JSON.stringify(record));
  }

  /*
    Stripe.js retrieves an intent with the publishable key alone over this
    endpoint. Intercepting it is what lets one script assert every status
    without a real card, a real bank and a real webhook behind each one.
  */
  await page.route("**/v1/payment_intents/**", async (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    const answer = answers[id];

    if (!answer) return route.fulfill({ status: 404, body: JSON.stringify({ error: { message: "no such intent" } }) });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(answer),
    });
  });

  const url = query ? `${PAGE}?${new URLSearchParams(query)}` : PAGE;

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Settled is "not the checking heading any more", which is a page-side fact
  // rather than a timeout: a real Stripe.js load is slower than any fixed wait
  // that would not also make this script slow on every run.
  await page
    .waitForFunction(
      () => {
        const heading = document.querySelector("h1");
        return heading !== null && !/^Checking/.test(heading.textContent ?? "");
      },
      null,
      { timeout: 20000 },
    )
    .catch(() => {});

  const read = async () => ({
    heading: (await page.locator(HEADING).first().innerText().catch(() => "")).trim(),
    text: (await page.locator("main").innerText().catch(() => "")).trim(),
  });

  const shown = await read();

  // The reload criterion, taken literally: the same address again, nothing
  // cleared in between, and the same words back.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .waitForFunction(
      () => {
        const heading = document.querySelector("h1");
        return heading !== null && !/^Checking/.test(heading.textContent ?? "");
      },
      null,
      { timeout: 20000 },
    )
    .catch(() => {});

  const reloaded = await read();

  await page.close();

  return { shown, reloaded, visited };
}

const SUCCEEDED = { [FIRST.id]: intent(FIRST, "succeeded") };

const runs = [
  {
    state: "A wallet payment that succeeded, read from this tab alone",
    input: {
      record: { payToken: PAY_TOKEN, money: { currency: "EUR", amount: 4900 }, clientSecret: FIRST.secret },
      answers: SUCCEEDED,
    },
    assert: ({ shown }) => {
      expect("succeeded", "says the payment was received", /payment has been received/i.test(shown.heading), true);
      expect("succeeded", "restates the amount", /€49/.test(shown.text), true);
    },
  },
  {
    state: "A redirect return from a 3D Secure challenge that succeeded",
    input: {
      query: { payment_intent: FIRST.id, payment_intent_client_secret: FIRST.secret, redirect_status: "succeeded" },
      answers: SUCCEEDED,
    },
    assert: ({ shown }) => {
      expect("redirect", "says the payment was received", /payment has been received/i.test(shown.heading), true);
      expect("redirect", "restates the amount with no record in the tab", /€49/.test(shown.text), true);
    },
  },
  {
    state: "A payment still processing",
    input: {
      record: { payToken: PAY_TOKEN, money: { currency: "EUR", amount: 4900 }, clientSecret: FIRST.secret },
      answers: { [FIRST.id]: intent(FIRST, "processing") },
    },
    assert: ({ shown }) => {
      expect("processing", "is told apart from received", /going through/i.test(shown.heading), true);
      expect("processing", "does not claim receipt", /has been received/i.test(shown.heading), false);
    },
  },
  {
    state: "A card that was declined — requires_payment_method",
    input: {
      record: { payToken: PAY_TOKEN, money: { currency: "EUR", amount: 4900 }, clientSecret: FIRST.secret },
      answers: { [FIRST.id]: intent(FIRST, "requires_payment_method") },
    },
    assert: ({ shown }) => {
      expect("declined", "says no payment was taken", /no payment was taken/i.test(shown.heading), true);
      expect("declined", "says nothing has been charged", /nothing has been charged/i.test(shown.text), true);
    },
  },
  {
    state: "Landed with nothing recoverable at all — the nothing_to_pay mistake",
    input: { answers: {} },
    assert: ({ shown }) => {
      expect("nothing", "does not error", shown.heading !== "", true);
      expect("nothing", "does not read as a confirmation", /received|thank you/i.test(shown.text), false);
      expect("nothing", "says plainly it cannot show the payment", /cannot show/i.test(shown.heading), true);
    },
  },
  {
    state: "A second purchase in this tab, with the first purchase's address",
    input: {
      // The record is the second purchase; the URL is the first. This is the
      // back button pressed part-way through buying again.
      record: { payToken: PAY_TOKEN, money: { currency: "EUR", amount: 7500 }, clientSecret: SECOND.secret },
      query: { payment_intent: FIRST.id, payment_intent_client_secret: FIRST.secret },
      answers: { [FIRST.id]: intent(FIRST, "succeeded"), [SECOND.id]: intent(SECOND, "requires_payment_method") },
    },
    assert: ({ shown }) => {
      expect("two purchases", "reports the intent in the address", /payment has been received/i.test(shown.heading), true);
      expect("two purchases", "shows that payment's amount", /€49/.test(shown.text), true);
      expect("two purchases", "never shows the other purchase's amount", /€75/.test(shown.text), false);
    },
  },
  {
    state: "The first purchase's tab, after a second purchase overwrote the record",
    input: {
      record: { payToken: PAY_TOKEN, money: { currency: "EUR", amount: 7500 }, clientSecret: SECOND.secret },
      answers: { [FIRST.id]: intent(FIRST, "succeeded"), [SECOND.id]: intent(SECOND, "requires_payment_method") },
    },
    assert: ({ shown }) => {
      expect("newest wins", "reports the newest purchase, not the first", /no payment was taken/i.test(shown.heading), true);
      expect("newest wins", "cannot show the first purchase's result", /has been received/i.test(shown.heading), false);
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
}

await browser.close();
server.close();

if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}

console.log("\nAll good.");
