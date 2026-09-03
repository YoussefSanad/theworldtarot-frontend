/**
 * Drives the reading page's payment panel through every state it can be in, and
 * presses the checkout button in each of them.
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
 * ## The wallet assertions are back, and what they can and cannot prove
 *
 * **No headless browser will ever see a wallet button here.** Stripe draws one
 * only in Safari with a card in Wallet, or in Chrome signed into Google Pay, on
 * a registered payment method domain — and a headless Chromium on `localhost`
 * fails all three. So what is asserted is everything around the button: that
 * the element **mounts** on `live`, that the row quotes the API's money, that
 * it **collapses to nothing** — no height and no gap — where the browser has no
 * wallet, and that **no unpriced state mounts one**.
 *
 * That last one is the negative #45 left behind, kept and narrowed twice. A
 * Stripe iframe on a withdrawn product or on an unreachable API is what a
 * half-finished wallet ticket shipping by accident looks like, and it is still
 * worth catching. ~~In gift mode as well.~~ **Gift mode came off that list on
 * 30 August 2026**, at the client's request: the row stays through the toggle,
 * and what is asserted there is the opposite of what used to be — that the
 * element survives both presses without being torn down and rebuilt, and that
 * an order placed in that mode says on its line who the gift is for.
 *
 * **The collapse is measured rather than inferred.** The row is a child of a
 * flex column with a `gap`, and a gap applies to a zero-height child as much as
 * to any other — so "height 0" and "leaves no gap" are two different facts and
 * only the panel's own height proves the second.
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

/** The client's frames. The checkout button wears the same treatment and is one of them. */
const GHOST = "#get-my-reading .checkout-option";

/** The one control that can take money. Selected by its hook, not its words. */
const HOSTED = "#get-my-reading [data-hosted-checkout]";

const GIFT = '#get-my-reading button:has-text("Gift a Reading")';

/**
 * The same button on the way back. Its label is the way out rather than a state
 * to infer — `gift.leave` — which is exactly why `GIFT` cannot select it: in
 * gift mode the words that one matches are not on the page.
 */
const LEAVE = '#get-my-reading button:has-text("A Reading for Myself")';

/**
 * Proof Stripe.js built an element. **Page-wide rather than inside the panel**:
 * in the states that must not mount one, an element appearing anywhere else on
 * the page would be the same accident.
 */
const STRIPE_FRAME = 'iframe[name^="__privateStripeFrame"]';

/**
 * The wallet row. Selected by its hook rather than by its `aria-label`, which
 * names a price and would stop matching the moment the catalogue changed one.
 * **A collapsed row and an absent one are the two things this check has to tell
 * apart**, so the count and the height are read separately.
 */
const WALLET = "#get-my-reading [data-express-checkout]";

/** What the customer types, and what has to survive as far as the order line. */
const QUESTION = "What should I focus on this month?";

/**
 * Gift mode's fields, and the single string three of them have to arrive as.
 *
 * `POST /orders` has no field for any of them, so `orderNoteIn` composes them
 * into the line's `question` — the field the admin orders table already prints.
 * The composition is unit-tested in `lib/order-note.test.ts`; what only a
 * browser can settle is that the composition runs against **this** form,
 * reached from the payment controls' own nodes, which is what the press below
 * proves.
 *
 * **`MISTYPED` is the fourth field's whole reason.** The buyer never receives
 * the code, so a confirmation that disagrees with the address has to refuse the
 * press — through `setCustomValidity` and the form's one `reportValidity()`,
 * which is a browser behaviour and provable nowhere else in this repository.
 *
 * Restated here as literals rather than imported. An assertion that computed
 * its expectation the way the code does would pass whatever the code did.
 */
const SIGNATURE = "Mum";
const RECIPIENT = "alice@example.com";
const MISTYPED = "alicia@example.com";
const GIFT_MESSAGE = "Happy birthday — thought this one was you.";
const GIFT_NOTE = `Gift from ${SIGNATURE} — send this reading to ${RECIPIENT}\n\nThe buyer's message: ${GIFT_MESSAGE}`;

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
  {
    gift = false,
    giftBack = false,
    press = false,
    blank = false,
    mistyped = false,
    cancelled,
    payAnswer,
    holdWrites = false,
    wallet = true,
  } = {},
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

    /*
      What this environment offers, which is what decides whether the wallet row
      is drawn at all. `wallet: false` is an environment that configured no
      Stripe — a laptop, where nobody has the keys — and the panel must draw the
      card button alone rather than a wallet that would fail on its first call.
    */
    await page.route("**/api/v1/payment-methods", (route) =>
      route.fulfill(api({ methods: wallet ? ["stripe", "stripe_wallet"] : [] })),
    );

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
    hosted: await page.locator(HOSTED).count(),
    // A control inside an `inert` subtree is not reachable by a pointer, a tab,
    // a screen reader or `element.click()`, which is the whole claim.
    reachableControls: await page
      .locator("#get-my-reading button")
      .evaluateAll((nodes) => nodes.filter((node) => !node.closest("[inert]")).length),
  };

  release();
  await page.waitForFunction(settled, null, { timeout: 15000 });

  /*
    **Stripe settles later than the price does**, and by a margin that is not
    small: the element's iframe is attached around half a second after the panel
    has painted, and on a cold first page load it has taken four. Reading the
    frames at `settled` is reading a race, and that race is what made "the
    express checkout element mounts" fail on 29 August 2026 against a page that
    mounts it perfectly well.

    Bounded, and its expiry is a legitimate answer rather than an error. The
    states that must mount nothing wait the deadline out, which is not waste:
    it is twelve seconds of opportunity for a mount that should not happen to be
    caught happening.
  */
  await page
    .waitForFunction(
      () => document.querySelectorAll('iframe[name^="__privateStripeFrame"]').length > 0,
      null,
      { timeout: 12000 },
    )
    .catch(() => {});

  /*
    After the wait, so gifting is a row whose element had already mounted when
    the toggle went down — which is what makes "it is still the same element"
    a fact worth reading — rather than one the click beat to the DOM.
  */
  if (gift) await page.locator(GIFT).click();

  /*
    Typed before the press, and read off the form by the press itself. In gift
    mode there is no question field in the DOM at all — the sections are
    mutually exclusive — so this is skipped rather than made conditional inside
    the page.
  */
  const question = await page.locator("#get-my-reading [data-field=question]").count();

  const answered = {
    height: Math.round(await page.$eval(PANEL, (node) => node.getBoundingClientRect().height)),
    visibleControls: await page.locator("#get-my-reading button:visible").count(),
    price: (await page.locator(PRICE).first().innerText().catch(() => "")).trim(),
    question,
    /** What is in the box before anything is typed into it. */
    restored: await page
      .locator("#get-my-reading [data-field=question]")
      .inputValue()
      .catch(() => null),
    counter: (await page.locator("#get-my-reading p.tabular-nums").first().innerText().catch(() => "")).trim(),
    recipient: await page.locator("#get-my-reading [data-field=recipientEmail]").count(),
    /*
      The two fields #71 added, counted separately from the address between
      them. The **gift signature** and the confirmation are each required, and a
      section that drew one of the three would refuse every press for a reason
      no assertion here could name.
    */
    signature: await page.locator("#get-my-reading [data-field=giftSignature]").count(),
    confirmation: await page.locator("#get-my-reading [data-field=confirmEmail]").count(),
    /*
      **The half of "the panel may not shift" that this section still keeps**,
      and the row count that pays part of the other half. #71 put four fields
      where there were two, and no arrangement of them matches the question
      field's height any more — so what is held is the 607px width, which is
      what stops the panel changing shape as well as size on the toggle. The
      height it does change by is reported under this state rather than
      asserted; there is no number to hold it to that would not simply be
      today's copy written down twice.
    */
    boxWidth: await page
      .locator("#get-my-reading section > div")
      .first()
      .evaluate((node) => Math.round(node.getBoundingClientRect().width))
      .catch(() => -1),
    messageRows: await page
      .locator("#get-my-reading [data-field=giftMessage]")
      .evaluate((node) => node.rows)
      .catch(() => -1),
    anchor: await page.locator("#get-my-reading").count(),
    ghosts: await page.locator(GHOST).count(),
    /*
      The client's 30 August revision: the gift frame stands at 84% of the
      payment frames' width, where all five used to share one. A **ratio**
      rather than a pixel — the column is laid out in `cqw`, so every width in
      it moves with the viewport and only their proportion is a constant.

      It was two frames at that width until #62 took the redeem one off the
      panel on 31 August 2026. The probe below reads *the first frame that is
      not the checkout button*, which was redeem and is now the gift — the same number
      either way, since the two shared it.
    */
    giftFrameRatio: await page.evaluate(() => {
      const buy = document.querySelector("#get-my-reading [data-hosted-checkout]");
      const narrow = [...document.querySelectorAll("#get-my-reading .checkout-option")].find(
        (node) => node !== buy,
      );

      if (!buy || !narrow) return null;

      return Math.round((narrow.getBoundingClientRect().width / buy.getBoundingClientRect().width) * 100);
    }),
    // Whitespace-flattened: the label and the amount are two spans that the
    // column lays out one above the other, and where the line breaks is not
    // what this is asserting.
    hosted: (await page.locator(HOSTED).first().innerText().catch(() => "")).trim().replace(/\s+/g, " "),
    /* Announced as unavailable is how the two inert cases say so out loud. */
    hostedDisabled: await page.locator(HOSTED).first().getAttribute("aria-disabled").catch(() => null),
    panel: (await page.locator("#get-my-reading").innerText().catch(() => "")).trim(),
    stripeFrames: await page.locator(STRIPE_FRAME).count(),
    /*
      The element's own frame, inside the panel. Distinct from `stripeFrames`,
      which is page-wide and therefore also counts the fraud-signal frame
      `Stripe()` appends to the body the moment it is constructed — a frame that
      belongs to the script rather than to any element, and **outlives every
      element that is unmounted**. Page-wide zero is the stronger claim and is
      still asserted wherever Stripe.js is never fetched at all; where it has
      been, this is the one that can tell a mounted element from a loaded script.
    */
    panelStripeFrames: await page.locator(`#get-my-reading ${STRIPE_FRAME}`).count(),
    /*
      The **identity** of those frames, which is the one thing their count
      cannot give. Stripe names each frame it mounts `__privateStripeFrame` plus
      a number it does not reuse, so the same names on both sides of a toggle is
      one element that was never unmounted — where a count of 1 reads identically
      whether the element survived or was destroyed and rebuilt. Sorted, so DOM
      order is not part of the claim.
    */
    walletFrames: (
      await page.locator(`#get-my-reading ${STRIPE_FRAME}`).evaluateAll((nodes) => nodes.map((node) => node.name))
    ).sort(),
    /* Present in the layout at all — the row, not the button inside it. */
    walletRow: await page.locator(WALLET).count(),
    /*
      Zero where this browser has no wallet, which is every browser this check
      runs in. Rounded, because a collapsed box measured against a `cqw` column
      answers in fractions of a pixel.
    */
    walletHeight: Math.round(
      await page.locator(WALLET).first().evaluate((node) => node.getBoundingClientRect().height).catch(() => -1),
    ),
    /* The API's money, in the accessible name — the sheet is where it is shown. */
    walletLabel: await page.locator(WALLET).first().getAttribute("aria-label").catch(() => null),
    /*
      A collapsed row is not reachable by a pointer, a tab or a screen reader.
      Read as "is it inside an inert subtree", which is what actually decides it.
    */
    walletReachable: await page
      .locator(`${WALLET} *`)
      .evaluateAll((nodes) => nodes.filter((node) => !node.closest("[inert]")).length)
      .catch(() => 0),
  };

  if (question > 0 && press) await page.locator("#get-my-reading [data-field=question]").fill(QUESTION);

  /*
    Gift mode's four, filled the same way and read by the same press. Three of
    them are what the order line is composed from there, and an order placed
    from a form nobody typed into would prove the plumbing and none of the
    composition.

    `mistyped` fills the confirmation with a different address, which is the one
    state that has to be refused **after** the buyer has typed in every box: a
    fault no `required` can catch, and the only one this panel decides itself.
  */
  if (answered.recipient > 0 && press && !blank) {
    await page.locator("#get-my-reading [data-field=giftSignature]").fill(SIGNATURE);
    await page.locator("#get-my-reading [data-field=recipientEmail]").fill(RECIPIENT);
    await page.locator("#get-my-reading [data-field=confirmEmail]").fill(mistyped ? MISTYPED : RECIPIENT);
    await page.locator("#get-my-reading [data-field=giftMessage]").fill(GIFT_MESSAGE);
  }

  /*
    What a wallet press would put on the order line, read the way `orderNoteIn`
    reads it: from the row's own node, up to the form, and out of the form's
    data.

    **The wallet button cannot be pressed here** — no headless browser draws one
    — so this is the only place the wallet road's own reading can be proved at
    all, and it is not a detail. A wallet payment that dropped what was typed
    would deliver a reading nobody asked a question of, or a gift naming nobody,
    and the customer would have no way of knowing until it arrived.

    What it actually guards is the row staying **inside** the order form. The
    form is `ReadingOrder`'s and the row is several components down from it; a
    later refactor that lifted the row out by one level would break every wallet
    payment's question silently, and nothing else here would notice.

    **Every field, raw.** `orderNoteIn` picks between them by which section is
    mounted, and composing here as well would be this script keeping its own
    copy of the rule — so what is read is what the form holds, and the composing
    is proved by the order the press actually places.

    **By `data-field`, which is the half of this that has already been wrong
    once.** The two address fields go to the browser under `CountedField`'s
    opaque `useId` name so Chrome does not offer the purchaser their own
    address, so `new FormData(form)` — what this read, and what `orderNoteIn`
    read, from 30 August to 3 September 2026 — answers `null` for a field that
    is sitting right there. Reading it the way the code reads it is the point;
    reading it the way the code *used* to is how a check passes green on a panel
    that has silently turned every gift into a self-purchase.
  */
  const walletFormReads = await page
    .locator(WALLET)
    .first()
    .evaluate((node) => {
      const form = node.closest("form");

      if (!form) return null;

      // `null` for a field that is not in this section at all, which is the
      // distinction the row's own reader turns on.
      const read = (name) => form.querySelector(`[data-field="${name}"]`)?.value ?? null;

      return {
        question: read("question"),
        giftSignature: read("giftSignature"),
        recipientEmail: read("recipientEmail"),
        confirmEmail: read("confirmEmail"),
        giftMessage: read("giftMessage"),
      };
    })
    .catch(() => null);

  let landed = null;
  let record = null;
  /** What the button says while each of the two round trips is in flight. */
  const pressing = [];

  const label = async () =>
    (await page.locator(HOSTED).first().innerText().catch(() => "")).trim().replace(/\s+/g, " ");

  if (press) {
    /*
      `force`, because a button announcing itself unavailable is exactly the one
      worth pressing: it is `aria-disabled` rather than `disabled` — the client
      rejected a disabled control as reading like a bug — so a customer's
      pointer really does land on it and really does press it. Playwright's
      actionability check would refuse to reproduce the only case this proves.
    */
    await page.locator(HOSTED).first().click({ force: true });

    /*
      Two round trips happen before the browser leaves, and the button holds a
      pending state across both. Each is held here in turn, so what the button
      says during each is read rather than inferred from how fast a stub
      answers.
    */
    if (holdWrites) {
      await page
        .waitForFunction(
          () => document.querySelector("[data-hosted-checkout]")?.getAttribute("aria-busy") === "true",
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

  /*
    **The way back, taken last.** Every other fact has been read by this point,
    so a click this late cannot move a measurement above it — which is the only
    reason a second press belongs in the same page as the first.

    ~~It proves the half of the gate that removal cannot: `!gifting` takes the
    row away, and a row that left and stayed gone would satisfy every assertion
    before this one.~~ **There is no gate left to prove half of.** What the
    return leg answers now is the question the forward leg cannot: the row is
    present in gift mode, but is it the *same* row — one mounted element that
    was never disturbed — or one React destroyed and Stripe rebuilt behind the
    toggle? A rebuild is a second `js.stripe.com` element and a second mount for
    the customer to watch flicker, so the element's own frame is counted here
    beside the row.

    The row is React's to re-render rather than Stripe's to re-fetch, so what is
    waited for is the row attaching and not an iframe arriving inside it — and
    the wait's expiry is a legitimate answer, left to the counts below rather
    than thrown from here.
  */
  let returned = null;

  if (gift && giftBack) {
    await page.locator(LEAVE).click();
    await page.locator(WALLET).waitFor({ state: "attached", timeout: 5000 }).catch(() => {});

    returned = {
      walletRow: await page.locator(WALLET).count(),
      walletFrames: (
        await page.locator(`#get-my-reading ${STRIPE_FRAME}`).evaluateAll((nodes) => nodes.map((node) => node.name))
      ).sort(),
      question: await page.locator("#get-my-reading [data-field=question]").count(),
      recipient: await page.locator("#get-my-reading [data-field=recipientEmail]").count(),
      signature: await page.locator("#get-my-reading [data-field=giftSignature]").count(),
      confirmation: await page.locator("#get-my-reading [data-field=confirmEmail]").count(),
    };
  }

  await page.close();

  return {
    returned,
    afterPanel,
    resting,
    walletFormReads,
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
  /*
    What draws `Gift a Reading` from 3 September 2026 (#73). The toggle is the
    catalogue's answer rather than this repository's, so a stub that omitted
    this would put the whole panel into the state a non-giftable product is in
    and every gift assertion below would fail on a page that is working.
  */
  is_giftable: true,
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

/**
 * True of every state: whatever Stripe does or does not mount, it must not
 * complain. An `IntegrationError` is how a bad option reports itself — thrown
 * inside the iframe rather than rejecting a promise anybody awaits — and it
 * renders nothing at all while looking exactly like a device with no wallet.
 */
function assertStripeIsQuiet(state, result) {
  expect(state, "Stripe raised nothing", result.thrown, []);
}

/**
 * The states with no wallet row in them. Nothing mounts, and **js.stripe.com is
 * not even fetched** — a page with no wallet button to draw has no business
 * asking Stripe's fraud signals to watch it.
 *
 * That last one is the assertion that earns its place. It failed on 29 August
 * 2026 in all three of these states at once, and what it had caught was real:
 * `@stripe/stripe-js`'s main entry point injects the script from its own top
 * level, so importing it anywhere fetched it everywhere, however carefully
 * `lib/stripe.ts` deferred its own `loadStripe`. Nothing visible was wrong,
 * which is exactly why nothing else would have found it.
 */
function assertNoWallet(state, result) {
  assertStripeIsQuiet(state, result);
  expect(state, "no wallet row at all", result.settled.walletRow, 0);
  expect(state, "no Stripe element is mounted", result.settled.stripeFrames, 0);
  expect(state, "and js.stripe.com is never fetched", result.stripeJs, []);
}

const sold = await drive("live — a priced product", PRICED, priced, {
  press: !live,
  holdWrites: !live,
});

assertStripeIsQuiet("live", sold);
/*
  The wallet row, and everything about it a headless browser can settle. The
  button itself cannot be seen here: Stripe draws one only in Safari with a card
  in Wallet, or Chrome signed into Google Pay, on a registered payment method
  domain — and this fails all three.
*/
expect("live", "the wallet row is drawn above the checkout button", sold.settled.walletRow, 1);
expect("live", "the express checkout element mounts", sold.settled.stripeFrames > 0, true);
expect("live", "and quotes the API's money, not the bundled copy", sold.settled.walletLabel, "Pay €70 with a saved wallet");
/*
  The criterion this state exists for, and the half that is easy to get wrong.
  Zero height is not enough: the row is a child of a flex column with a gap, and
  a gap applies to a zero-height child like any other.
*/
expect("live", "with no wallet here, the row collapses to nothing", sold.settled.walletHeight, 0);
expect("live", "and nothing in it is reachable", sold.settled.walletReachable, 0);
/*
  The wallet road's question, proved where it can be: not by pressing a button
  that will never be drawn here, but by walking the path `orderNoteIn` walks
  from the node it is actually handed. Both roads have to reach the order line
  with the same sentence.
*/
expect("live", "the wallet row reads the same question off the same form", sold.walletFormReads, {
  question: QUESTION,
  // Absent rather than empty, and that is the discriminator: the two sections
  // are mutually exclusive, so a form holding a question holds none of the
  // gift's four.
  giftSignature: null,
  recipientEmail: null,
  confirmEmail: null,
  giftMessage: null,
});
expect("live", "the checkout button is in the layout while loading", sold.resting.hosted, 1);
expect("live", "no control is reachable while loading", sold.resting.reachableControls, 0);
expect("live", "and none is visible either", sold.resting.visibleControls, 0);
/*
  Not "does not move". The panel is three frames rather than five and nothing
  in it is drawn by a wallet vendor any more, so the height that settles is the
  height that was reserved. What must never happen is growth: a panel that only
  ever shrinks never puts a control under a finger reaching for something else.
*/
expect("live", "the panel never grows", sold.settled.height <= sold.resting.height, true);
/*
  "Leaving no gap", measured rather than asserted about. The loading state draws
  no wallet row at all, so a collapsed row that still took its share of the
  column's `gap-[0.4em]` would show up here as the panel growing — which is the
  only way that fact can be seen from outside.
*/
expect("live", "and the collapsed row costs the column nothing", sold.settled.height, sold.resting.height);
expect("live", "the API's price, in the API's currency", sold.settled.price, "€70");
expect("live", "two frames: checkout, gift", sold.settled.ghosts, 2);
/*
  The label alone, and the same string in every state the button is drawn in.
  The amount left this button on 29 August 2026: the panel says the price once,
  in the line above, and a second telling here wrapped the longest label on the
  panel onto two lines. So this is no longer the assertion that the button
  quotes the API — `sold.settled.price` above is — it is the assertion that it
  quotes nothing at all.
*/
expect("live", "the checkout button is labelled, and quotes no amount", sold.settled.hosted, "Pay Another Way");
expect("live", "and is offered rather than announced as unavailable", sold.settled.hostedDisabled, "false");
/*
  The frames are no longer one width. The checkout button and the wallet row
  above it keep the column's 498px; the two under the Stripe line were pulled in to 84% of it
  on 30 August 2026 at the client's request. This is the assertion that the
  narrowing landed on those two and did not reach the road that takes money.
*/
expect("live", "the gift frames stand at 84% of the payment frames", sold.settled.giftFrameRatio, 84);

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
/*
  `method` is not decoration and not a default the backend can assume: the two
  roads mint different things — a Checkout Session here, a PaymentIntent for the
  wallet — and `/pay` is told which by name. See `lib/orders.ts` and the
  backend's #43.
*/
expect("live", "naming its road and the page to come back to", sold.paid[0]?.body, {
  return_to: "month-ahead",
  method: "stripe",
});
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

assertStripeIsQuiet("ahead", ahead);
expect("ahead", "the wallet row still stands beside the refused card road", ahead.settled.walletRow, 1);
/*
  The window where this frontend has shipped and the backend has not, and the
  window after the backend grows a method this build has never seen. A checkout
  that crashed here would fail for a customer whose order is perfectly fine.
*/
expect("ahead", "the order was placed and the payment asked for", ahead.paid.length, 1);
expect("ahead", "the browser goes nowhere", ahead.landed, PAGE);
expect("ahead", "the panel says so, and says nothing was charged", /could not start the checkout, and nothing has been charged/i.test(ahead.afterPanel), true);
expect("ahead", "and the button is pressable again", ahead.afterwards, "Pay Another Way");
/* Nothing to paint a confirmation from, because nothing was confirmed. */
expect("ahead", "nothing was remembered", ahead.record, null);

const gifted = await drive("gifting — the wallet stays, and the order says who it is for", PRICED, priced, {
  gift: true,
  press: true,
});

/*
  Not `assertNoWallet`, and from 30 August 2026 not even close to it. This state
  **is** the live state with a different section above the buttons: the row
  mounted an element before the toggle went down and is still holding it after,
  which is precisely what this state used to exist to forbid.
*/
assertStripeIsQuiet("gifting", gifted);
expect("gifting", "the recipient's fields replace the question", gifted.settled.recipient, 1);
expect("gifting", "and there is no question in the form at all", gifted.settled.question, 0);
expect("gifting", "the frames still stand", gifted.settled.ghosts, 2);
/*
  **The fault the client reported, and the reason the gate came off.** The
  wallet button vanished from under a thumb the instant the gift toggle went
  down. The row is as much of that button as a headless browser can see, and its
  absence was the whole of the bug.
*/
expect("gifting", "the wallet row is still drawn above the checkout button", gifted.settled.walletRow, 1);
expect("gifting", "still holding the element it mounted", gifted.settled.panelStripeFrames > 0, true);
expect("gifting", "and still quoting the API's money", gifted.settled.walletLabel, "Pay €70 with a saved wallet");
/*
  The checkout button came off the same gate in the same change. One live control beside one
  inert one is the odder panel of the two, and the note underneath answers for
  neither of them any more.
*/
expect("gifting", "the checkout button is buyable here too", gifted.settled.hostedDisabled, "false");
/*
  Counted rather than merely found, because **once** is the fact worth holding:
  a second note is the option this was built instead of, and a presence test
  passes just as green with two of them.

  **What it can and cannot prove.** It counts one sentence, so a second note in
  different words goes by it untouched. What it catches is the regression that
  would actually happen, which is this sentence growing a twin.
*/
expect("gifting", "and the note says what is different, once", (gifted.settled.panel.match(/still being set up/gi) ?? []).length, 1);
expect("gifting", "promising a person rather than a delay", /arrange delivery with you by email/i.test(gifted.settled.panel), true);
/*
  **The negative that keeps the copy honest.** Both superseded wordings told the
  customer there was no way to pay for a gift, and the panel now takes their
  money — so the sentence that used to be the point of this state is the one
  thing it may never say again. A revision that reinstated it would leave a
  refusal standing under a button that charges.
*/
expect("gifting", "and never that gifting cannot be paid for", /no way to pay/i.test(gifted.settled.panel), false);
/*
  The wallet road's own read, from the row's node up to the form — the only
  proof there is that a wallet press in gift mode would carry the recipient,
  since no headless browser draws a button to press. Raw, because composing here
  would be this script keeping a second copy of `orderNoteIn`'s rule.
*/
expect("gifting", "the wallet row reads the recipient off the same form", gifted.walletFormReads, {
  // Absent, not empty: the two sections are mutually exclusive, and it is this
  // field's absence that tells `orderNoteIn` which one it is looking at.
  question: null,
  giftSignature: SIGNATURE,
  recipientEmail: RECIPIENT,
  confirmEmail: RECIPIENT,
  giftMessage: GIFT_MESSAGE,
});
/*
  **The confirmation is read and never sent**, which the line below settles by
  carrying `GIFT_NOTE` and nothing else. It is a check on what the buyer typed
  rather than a second thing they told us, and there is nowhere for it to go:
  `POST /orders` has one free-text field per line and three things are already
  composed into it.
*/
/*
  **The assertion this state now exists for.** `POST /orders` has no field for a
  recipient or a message, so an order placed here carries them or carries
  nothing — and an order carrying nothing is indistinguishable from somebody
  buying a reading for themselves, which is the reading Jennifer would act on.
*/
/*
  **All four boxes, or the section asks for less than it needs.** The signature
  and the confirmation are each required and each refuses a press on its own, so
  a section that drew three of the four would fail every gift purchase with a
  browser message pointing at a field nobody could see.
*/
expect("gifting", "the section asks who the gift is from", gifted.settled.signature, 1);
expect("gifting", "and takes the address twice", gifted.settled.confirmation, 1);
/*
  **The message box is the only thing paying for the two new fields**, and it
  pays in rows: three to two, with its `min-h` dropped to the two-row box so the
  row count is not inert. It is the only optional field on either section, which
  is what makes its height the one worth spending.
*/
expect("gifting", "and the message box gave up a row to make room", gifted.settled.messageRows, 2);
/*
  **The half of the constraint that still holds.** The gift section was meant to
  match the question field's 607px box in both directions and now matches it in
  one: four required boxes and a textarea are more height than the question
  field has, whatever is done with them. The width is what keeps the panel from
  changing shape as well as size when the visitor toggles, and it is a `cqw` of
  the panel rather than a share of the column so that it is the frame's own
  number on both sections.
*/
expect("gifting", "the fields keep the question box's width", gifted.settled.boxWidth, sold.settled.boxWidth);
/*
  Reported rather than asserted. The panel grows on the toggle — it did before
  #71 and it grows further after it — and the cost is worth seeing on every run,
  but there is no number to hold it to that would not be today's copy written
  down a second time and failed by the client's next revision.
*/
console.log(`  · the toggle costs the panel ${gifted.settled.height - sold.settled.height}px (${sold.settled.height} → ${gifted.settled.height})`);
expect("gifting", "the press places one order", gifted.placed.length, 1);
expect("gifting", "carrying the recipient and the message as the line's one string", gifted.placed[0]?.lines?.[0]?.question, GIFT_NOTE);
expect("gifting", "then pays it by the same road a self-purchase takes", gifted.paid[0]?.body, {
  return_to: "month-ahead",
  method: "stripe",
});
expect("gifting", "and the browser goes where Stripe said", gifted.landed, SESSION_URL);
/*
  Written before the navigation, as on every other road, and **flagged**. The
  note is kept — support and the confirmation both want to know what was bought
  and for whom — but `questionFor` refuses to hand it back to the question
  textarea after a cancelled checkout, and this flag is the only thing that
  tells it a composed note from a typed sentence. See `lib/checkout-session.ts`.
*/
expect("gifting", "with the gift remembered before it went, and marked as one", gifted.record, {
  payToken: PAY_TOKEN,
  money: { currency: "EUR", amount: 7000 },
  sessionId: SESSION_ID,
  productKey: "month-ahead",
  question: GIFT_NOTE,
  gift: true,
});

const unaddressed = await drive("gifting — a gift addressed to nobody cannot be paid for", PRICED, priced, {
  gift: true,
  press: true,
  blank: true,
});

/*
  **The state the guard exists for**, and the one that was reachable until 30
  August 2026 in the same change that made gift mode buyable. Nothing submits
  this form, so the `required` on the recipient's address is enforced by nobody
  unless something asks — and without asking, a buyer toggles to gift, presses,
  and is charged for a gift addressed to no one. `giftNote` would have recorded
  the absence rather than prevented it.

  Pressed with the fields left as the toggle produced them, which is the whole
  point: this is not a malformed address, it is a buyer who never typed one.
*/
assertStripeIsQuiet("unaddressed", unaddressed);
expect("unaddressed", "the recipient's field is there and empty", unaddressed.settled.recipient, 1);
expect("unaddressed", "and so is the signature above it", unaddressed.settled.signature, 1);
expect("unaddressed", "and the confirmation below it", unaddressed.settled.confirmation, 1);
expect("unaddressed", "no order is placed", unaddressed.orderCalls, []);
expect("unaddressed", "nothing is paid for", unaddressed.paid, []);
expect("unaddressed", "the browser stays where it is", unaddressed.landed, PAGE);
/*
  And the button is not left holding a pending state for a press it refused —
  which would read as a checkout in flight that never arrives.
*/
expect("unaddressed", "and the button is pressable again", unaddressed.afterwards, "Pay Another Way");

const mistyped = await drive("gifting — an address confirmed as a different address cannot be paid for", PRICED, priced, {
  gift: true,
  press: true,
  mistyped: true,
});

/*
  **The fault no `required` can catch**, and the reason the address is taken
  twice at all. Every box on this section is filled: the signature, an address,
  a confirmation, a message. The browser is perfectly happy with all four — the
  confirmation is a well-formed email in a required box — and the panel refuses
  the press anyway, because the buyer never receives the code and a typo here
  sends a paid, non-expiring bearer credential to a stranger.

  **Refused the same way the empty address is**, which is the whole design of
  it. The mismatch is written onto the confirmation field with
  `setCustomValidity` and comes out of the form's one `reportValidity()` call in
  `orderFormAccepts`; nothing raises an error of its own. A parallel branch in a
  payment control is how a buyer authorises with their face for a gift the form
  had already rejected — and on the wallet road, which no headless browser can
  press, nothing downstream of that branch would ever be run here.
*/
assertStripeIsQuiet("mistyped", mistyped);
expect("mistyped", "every field on the section is filled in", mistyped.walletFormReads, {
  question: null,
  giftSignature: SIGNATURE,
  recipientEmail: RECIPIENT,
  confirmEmail: MISTYPED,
  giftMessage: GIFT_MESSAGE,
});
expect("mistyped", "no order is placed", mistyped.orderCalls, []);
expect("mistyped", "nothing is paid for", mistyped.paid, []);
expect("mistyped", "the browser stays where it is", mistyped.landed, PAGE);
expect("mistyped", "and the button is pressable again", mistyped.afterwards, "Pay Another Way");

/*
  **A page of its own, and it has to be.** The press above leaves for Stripe,
  so there is no panel on the other side of it to toggle back — which is exactly
  why the old single state could assert both: nothing it pressed ever went
  anywhere.
*/
const toggled = await drive("gifting — the row survives the toggle, both ways", PRICED, priced, {
  gift: true,
  giftBack: true,
});

assertStripeIsQuiet("toggling", toggled);
expect("toggling", "the row is there with the gift toggle down", toggled.settled.walletRow, 1);
expect("toggling", "and still there on the way back out", toggled.returned.walletRow, 1);
/*
  **The half no count can settle**, and the reason the frames are read by name.
  A row rebuilt behind each toggle counts 1 exactly as a row left alone does,
  and the difference is a second Stripe mount the customer watches flicker every
  time they change their mind.

  Two assertions rather than one, because equality alone passes just as green on
  a panel with no frames in it at all: the first says there was something to
  survive, and the second that it did.
*/
expect("toggling", "the element has frames of its own with the toggle down", toggled.settled.walletFrames.length > 0, true);
expect("toggling", "and they are the same frames on the way back, never rebuilt", toggled.returned.walletFrames, toggled.settled.walletFrames);
expect("toggling", "with the question field the recipient's replaced", toggled.returned.question, 1);
expect("toggling", "and the recipient's fields gone with it", toggled.returned.recipient, 0);
/*
  All four, counted. The hard rule is that the purchaser never leaves a gift
  field in a form they are buying for themselves — the two sections are mutually
  exclusive in the DOM rather than hidden from each other with CSS, and a
  signature left behind would ride to the backend on a self-purchase's line.
*/
expect("toggling", "including the signature", toggled.returned.signature, 0);
expect("toggling", "and the confirmation", toggled.returned.confirmation, 0);

const gone = await drive("withdrawn — a 404", WITHDRAWN, unsold);

assertNoWallet("withdrawn", gone);
expect("withdrawn", "no price", gone.settled.price, "");
expect("withdrawn", "no controls", gone.settled.visibleControls, 0);
expect("withdrawn", "no question either", gone.settled.question, 0);
expect("withdrawn", "the closing call to action still lands", gone.settled.anchor, 1);

const dead = await drive("unreachable — a 500", BROKEN, priced, { press: true });

assertNoWallet("unreachable", dead);
expect("unreachable", "the bundled price, as copy", dead.settled.price, "$75");
/*
  The frame stays whole — a visitor arriving while the API is down should not
  meet a hole where the checkout is. Neither of the two can take money.
*/
expect("unreachable", "the frames stand, all of them duds", dead.settled.ghosts, 2);
expect("unreachable", "the checkout button is the same label it is everywhere", dead.settled.hosted, "Pay Another Way");
expect("unreachable", "and says it is unavailable", dead.settled.hostedDisabled, "true");
/*
  The assertion this state exists for. `reading.price` is the string "$75" for a
  reading the catalogue prices at EUR 7000: no currency, and a number nobody has
  verified today. An order placed from it would be an order at an amount no
  server ever agreed to, so no request is possible at all.
*/
expect("unreachable", "and no request is possible", dead.orderCalls, []);
expect("unreachable", "so the browser stays where it is", dead.landed, PAGE);

const unoffered = await drive("no wallet offered — an environment with no Stripe", PRICED, priced, {
  wallet: false,
});

/*
  The criterion the payment methods endpoint exists for. Locally that answer is
  hand settlement alone — nobody has the keys on a laptop — and an offered method
  with no credentials behind it is a button that fails at the worst moment a shop
  has. The card button survives being wrong about this by redirecting to a page
  that says so; the wallet does not.
*/
assertNoWallet("no wallet offered", unoffered);
expect("no wallet offered", "the card button stands alone", unoffered.settled.ghosts, 2);
expect("no wallet offered", "and still takes money", unoffered.settled.hostedDisabled, "false");

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

assertStripeIsQuiet("cancelled", back);
/*
  The one thing a redirect makes easy to get wrong, and the worst thing this
  flow can do: losing several sentences of typed question silently.
*/
expect("cancelled", "the question is back in the box", back.settled.restored, QUESTION);
expect("cancelled", "and the counter agrees with it", back.settled.counter, `${QUESTION.length}/500`);
expect("cancelled", "the panel is offering the reading again", back.settled.hostedDisabled, "false");

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
