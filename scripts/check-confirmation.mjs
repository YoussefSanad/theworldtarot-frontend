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
 *
 * ## Both roads land here, and the held answer proves opposite things about them
 *
 * From 29 August 2026 a payment can also arrive from the **wallet**, with
 * `payment_intent` in the address instead of `session_id` and a client secret
 * in the record instead of a Session id.
 *
 * The same held answer is the instrument for both, and what it measures inverts
 * between them. `success_url` is reached only after Stripe has taken the
 * payment, so the first read on the **card** road must already say `received`.
 * `return_url` is reached **whatever happened** — a declined wallet card and an
 * abandoned 3D Secure step land on it exactly as a success does — so the first
 * read on the **wallet** road must say nothing at all. A green tick shown to
 * somebody who was never charged is the one thing a payment surface may never
 * do, and it is invisible to every check that reads the screen only once it has
 * settled.
 *
 * The wallet runs therefore read the screen at a different moment: not "once
 * the heading is no longer `Checking`", which on that road would wait out the
 * hold, but **the instant the backend has been asked** — by which point the
 * screen has done everything it is going to do before the answer arrives.
 *
 * `redirect_status` is in those addresses because Stripe puts it there, and one
 * run sets it to `failed` against a backend saying `succeeded`. The screen is
 * required to believe the backend: that is the party that settles the order,
 * and the query string is the party that was redirected.
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

/**
 * The wallet road's two payments. The **secret** is what the record holds and
 * the **id** is what the address carries; `paymentIntentFrom` derives the second
 * from the first, so these two fields have to agree the way a real pair does or
 * the run is testing the guard against a mismatch it invented.
 */
const WALLET_FIRST = {
  intentId: "pi_3Wallet1",
  clientSecret: "pi_3Wallet1_secret_XyZ789",
  money: { currency: "EUR", amount: 4900 },
};
const WALLET_SECOND = {
  intentId: "pi_3Wallet2",
  clientSecret: "pi_3Wallet2_secret_AbC123",
  money: { currency: "EUR", amount: 7500 },
};

/** What Buy Now wrote before the browser left for Stripe. */
function record({ sessionId, money }) {
  return { payToken: PAY_TOKEN, money, sessionId, productKey: "month-ahead", question: "What next?" };
}

/**
 * What the wallet road wrote before it confirmed. **No `sessionId`** — that
 * absence is not tidiness, it is the field `checkoutFor` refuses this record on.
 */
function walletRecord({ clientSecret, money }) {
  return { payToken: PAY_TOKEN, money, productKey: "month-ahead", question: "What next?", clientSecret };
}

/**
 * The address `stripe.confirmPayment` returns to, as Stripe builds it.
 *
 * All three parameters are Stripe's, including the secret — which is in the
 * address whether we like it or not, and is exactly why the screen reads the
 * **id** beside it instead. `redirect_status` is what Stripe thinks happened,
 * and this screen is required not to read it.
 */
function walletQuery({ intentId, clientSecret }, redirectStatus) {
  return {
    payment_intent: intentId,
    payment_intent_client_secret: clientSecret,
    redirect_status: redirectStatus,
  };
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
async function drive(state, { stored, query, answer, settle = 400, readWhileAsking = false }) {
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

  /*
    Resolved the moment the backend is asked, which is the wallet road's answer
    to "when has the screen finished painting what it paints before it knows".
    On that road the answer is "nothing", so there is no heading change to wait
    for and waiting for one would wait out the hold below.
  */
  let sawRequest = () => {};
  const requested = new Promise((resolve) => (sawRequest = resolve));

  await page.route("**/sanctum/csrf-cookie", (route) => route.fulfill(api({}, 204)));

  await page.route("**/api/v1/orders/status", async (route) => {
    sawRequest();
    await held;
    await route.fulfill(answer ?? api({ status: "succeeded" }));
  });

  const url = query ? `${PAGE}?${new URLSearchParams(query)}` : PAGE;

  await page.goto(url, { waitUntil: "domcontentloaded" });

  if (readWhileAsking) {
    /*
      The wallet road, where the correct first paint is the `Checking` heading
      the export already ships — so "not `Checking` any more" is a wait that
      only ever expires. What is waited for instead is the **request**: once the
      backend has been asked, everything the screen does before the answer has
      been done, and the short settle after it is the paint that would give a
      premature `received` away.
    */
    await requested;
    await page.waitForTimeout(200);
  } else {
    // Settled is "not the checking heading any more", which is a page-side fact
    // rather than a timeout.
    await page.waitForFunction(settledHeading, null, { timeout: 20000 }).catch(() => {});
  }

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
  /*
    ## The wallet road

    Everything from here down lands on `return_url` rather than `success_url`,
    and the difference between those two addresses is the whole reason these
    runs exist. See the header.
  */
  {
    state: "Back from a wallet payment, on an address that is reached whatever happened",
    input: {
      stored: walletRecord(WALLET_FIRST),
      query: walletQuery(WALLET_FIRST, "succeeded"),
      readWhileAsking: true,
    },
    assert: ({ painted, shown, verifications }) => {
      /*
        The assertion this whole road exists for, and the inverse of the card
        road's first one. Read after the backend has been asked and before it
        has answered: at that instant the screen knows nothing, and a screen
        that has painted a green tick has painted it on the strength of a
        redirect that happens to failed payments too.
      */
      expect("wallet paid", "says nothing until the backend has answered", /^Checking/.test(painted.heading), true);
      expect("wallet paid", "and paints no receipt on the strength of the redirect", /has been received/i.test(painted.text), false);
      expect("wallet paid", "nor the amount it is holding in the record", /€49/.test(painted.text), false);
      expect("wallet paid", "then says the payment was received", /payment has been received/i.test(shown.heading), true);
      expect("wallet paid", "and restates the amount from the record", /€49/.test(shown.text), true);
      expect("wallet paid", "having asked exactly once", verifications, 1);
    },
  },
  {
    state: "Stripe's redirect says failed and our backend says succeeded",
    input: {
      stored: walletRecord(WALLET_FIRST),
      query: walletQuery(WALLET_FIRST, "failed"),
      readWhileAsking: true,
    },
    assert: ({ shown }) => {
      /*
        `redirect_status` is Stripe telling the browser what it thinks happened.
        The backend is the party that settles the order, and it is the only one
        this screen trusts about money — so a disagreement is resolved in its
        favour, in the direction that is easy to get wrong by reading the
        address because the address is right there.
      */
      expect("wallet redirect", "believes the backend rather than the address", /payment has been received/i.test(shown.heading), true);
    },
  },
  {
    state: "A wallet card declined — the backend says nothing was collected",
    input: {
      stored: walletRecord(WALLET_FIRST),
      query: walletQuery(WALLET_FIRST, "failed"),
      answer: api({ status: "requires_payment_method" }),
      readWhileAsking: true,
    },
    assert: ({ painted, shown }) => {
      // The customer this road's caution is for: charged nothing, and never
      // shown a word suggesting otherwise, not even for the half second the
      // card road would have.
      expect("wallet declined", "showed no receipt on the way past", /has been received/i.test(painted.text), false);
      expect("wallet declined", "says no payment was taken", /no payment was taken/i.test(shown.heading), true);
      expect("wallet declined", "and says nothing has been charged", /nothing has been charged/i.test(shown.text), true);
    },
  },
  {
    state: "The backend cannot reach Stripe — a 503, on the road with nothing to stand on",
    input: {
      stored: walletRecord(WALLET_FIRST),
      query: walletQuery(WALLET_FIRST, "succeeded"),
      answer: api({ message: "Stripe could not be reached." }, 503),
      readWhileAsking: true,
    },
    assert: ({ shown }) => {
      /*
        The one asymmetry on this screen, measured. The card road stands its
        ground on a 503 because it already has something true on screen; this
        road has painted nothing, so it has nothing to stand on and hedges
        instead. Both are the same rule — never say more than is known — and
        they produce opposite screens.
      */
      expect("wallet 503", "says it could not check the payment", /could not check your payment/i.test(shown.heading), true);
      expect("wallet 503", "and that this says nothing about whether you were charged", /says nothing about whether you were charged/i.test(shown.text), true);
      expect("wallet 503", "and claims no receipt", /has been received/i.test(shown.text), false);
    },
  },
  {
    state: "A status this build has never heard of, on the road that cannot assume",
    input: {
      stored: walletRecord(WALLET_FIRST),
      query: walletQuery(WALLET_FIRST, "succeeded"),
      answer: api({ status: "requires_something_stripe_adds_in_2027" }),
      readWhileAsking: true,
    },
    assert: ({ shown }) => {
      /*
        The card road leaves its true screen alone here. This road has no screen
        to leave alone, so the unrecognised status is mapped like any other
        unfinished one: not finished, nothing charged yet, and no claim either
        way.
      */
      expect("wallet unknown status", "says the payment is not finished", /payment is not finished/i.test(shown.heading), true);
      expect("wallet unknown status", "and never that it was received", /has been received/i.test(shown.text), false);
    },
  },
  {
    state: "A second wallet payment in this tab, with the first one's address",
    input: {
      stored: walletRecord(WALLET_SECOND),
      query: walletQuery(WALLET_FIRST, "succeeded"),
    },
    assert: ({ shown, verifications }) => {
      expect("two wallet payments", "shows nothing of the other payment", /cannot show/i.test(shown.heading), true);
      expect("two wallet payments", "and never its amount", /€75/.test(shown.text), false);
      expect("two wallet payments", "and asks the backend nothing", verifications, 0);
    },
  },
  {
    state: "A wallet address, with a card purchase's record in the tab",
    input: { stored: record(FIRST), query: walletQuery(WALLET_FIRST, "succeeded") },
    assert: ({ shown, verifications }) => {
      /*
        The two guards refusing each other's records, which is what having two
        of them buys. A card record has no client secret to derive an intent id
        from, so there is no comparison to make and nothing to show — rather
        than a comparison against a field that happens to be absent.
      */
      expect("card record, wallet address", "refuses the other road's record", /cannot show/i.test(shown.heading), true);
      expect("card record, wallet address", "and never its amount", /€49/.test(shown.text), false);
      expect("card record, wallet address", "and asks the backend nothing", verifications, 0);
    },
  },
  {
    state: "A card address, with a wallet payment's record in the tab",
    input: { stored: walletRecord(WALLET_FIRST), query: { session_id: FIRST.sessionId } },
    assert: ({ shown, verifications }) => {
      expect("wallet record, card address", "refuses the other road's record", /cannot show/i.test(shown.heading), true);
      expect("wallet record, card address", "and asks the backend nothing", verifications, 0);
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
