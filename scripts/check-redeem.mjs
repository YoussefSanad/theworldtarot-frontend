/**
 * Drives `/redeem/` through every state a **querent** can land in.
 *
 * `npm run build && npm run check:redeem` — serves `out/` and loads the real
 * exported bundle, intercepting `POST /api/v1/en/gifts/lookup` and
 * `.../gifts/redeem` to answer with each case in turn. No backend and no real
 * gift: the page's whole input is an address, a typed code, and what the API
 * says about it, and all three are supplied here.
 *
 * This exists because none of what F5 asks for can be checked by the type
 * checker or by `node --test`. `lib/gifts.test.ts` proves the two calls — the
 * paths, the bodies, and which status means what — and everything below is a
 * fact about a rendered page:
 *
 * - that **arrival looks a code up and does not spend it**, which is the one
 *   thing on this page that cannot be taken back. Email scanners and link
 *   prefetchers follow links, there is no expiry to reclaim a spent gift with
 *   and no refund, so a redemption fired on load is a present given to whatever
 *   opened the mail first
 * - that what stands there is a **reading page with the commerce taken out** —
 *   the name, the artwork and what arrives, and no price, no wallet row, no
 *   checkout button and no `Gift a Reading`
 * - that the three states say three different things, and that **no fourth
 *   state mentions expiry**, because gift codes do not expire and the concept
 *   must not enter the product through a sentence
 * - that a reading this build has **no page for still redeems**, since refusing
 *   to render is refusing to redeem
 * - that a spent code **lands on `/checkout/complete/`** and says the same four
 *   things there, which is #82 and is the one assertion here that is about a
 *   second page
 *
 * ## The code is a credential, and this counts where it goes
 *
 * A gift code arrives in a query string, which
 * `docs/adr/0003-redemption-is-a-page-of-its-own.md` accepts knowingly: a
 * static export cannot pre-render a path segment per code. What it does not
 * accept is a *second* place it leaks to, so every run checks that a code typed
 * into the box never reaches an address the browser visits.
 *
 * **A redirect is one of those addresses**, which is why that rule is now a
 * check on every run rather than on the typed one alone: the redemption
 * replaces the address, and the thing it must carry there is a random handle
 * naming a record in the tab. The code may appear in `/redeem/`'s own query
 * string, because that is the link the mail sent, and nowhere else at all.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const root = join(process.cwd(), "out");
const PORT = 4323;
const PAGE = `http://localhost:${PORT}/redeem/`;

/** The code as the mail prints it, and as the backend answers it. */
const CODE = "K7M4-9PQR-2XYZ";
/** The same code typed off that mail by somebody who does not type dashes. */
const AS_TYPED = "  k7m4 9pqr 2xyz  ";

const LOOKED = {
  code: CODE,
  product: "month-ahead",
  name: "THE MONTH AHEAD",
  short_description: "One month, five cards.",
  long_description: "A written reading of the weeks to come.",
  redeemed: false,
  redeemed_at: null,
};

const ASKED = {
  product: "month-ahead",
  name: "THE MONTH AHEAD",
  question: "What should I focus on this month?",
  querent_email: "sam@example.com",
  asked_at: "2026-12-24T10:03:11+00:00",
};

/**
 * Everything the commerce half draws, which is what `/redeem/` must not.
 *
 * Read off the rendered page rather than off the component tree: what ADR 0003
 * promises is that a querent sees no way to buy anything, and the way that
 * regresses is somebody putting `ReadingOrder` back in the slot.
 */
const SELLS = [
  ["a checkout button", "[data-hosted-checkout]"],
  ["a gift toggle", "button[aria-pressed]"],
];

/** No expired state, and no sentence that invents one. */
const EXPIRY = /expir/i;

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

/**
 * Opens the page, answers the two endpoints as told, and hands back what was
 * asked and what is on screen.
 *
 * `type` is a code entered by hand rather than carried by the address, which is
 * the road somebody reading the printed characters off the mail takes. `fill`
 * is the question form, and running it is what spends the code — nothing else
 * in here does, which is the point of the counts that come back.
 */
async function drive(state, { code, lookup, redeem, type, fill, lands = false }) {
  console.log(`\n${state}`);

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const visited = [];
  const lookups = [];
  const redemptions = [];

  page.on("request", (request) => visited.push(request.url()));
  page.on("framenavigated", (frame) => visited.push(frame.url()));

  await page.route("**/sanctum/csrf-cookie", (route) => route.fulfill(api({}, 204)));

  await page.route("**/api/v1/*/gifts/lookup", async (route) => {
    lookups.push(route.request().postData());
    await route.fulfill(lookup ?? api(LOOKED));
  });

  await page.route("**/api/v1/*/gifts/redeem", async (route) => {
    redemptions.push(route.request().postData());
    await route.fulfill(redeem ?? api(ASKED));
  });

  await page.goto(code ? `${PAGE}?code=${encodeURIComponent(code)}` : PAGE, {
    waitUntil: "domcontentloaded",
  });

  if (type !== undefined) {
    await page.fill("input[name='code']", type);
    await page.click("button[type='submit']");
  }

  // Settled is "the page is no longer waiting on a lookup", which is a
  // page-side fact rather than a timeout.
  await page
    .waitForFunction(() => !/Looking up/.test(document.body.textContent ?? ""), null, { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(250);

  let entriesBefore = null;

  /** What is on the page before anything has been submitted. */
  const arrived = {
    text: (await page.locator("main").innerText().catch(() => "")).trim(),
    spent: redemptions.length,
    asks: await page.locator("[data-field='question']").count(),
  };

  if (fill) {
    for (const [field, value] of Object.entries(fill)) {
      await page.fill(`[data-field='${field}']`, value);
    }

    /*
      The tab's history depth before the submit, so the assertion below is
      "nothing was added" rather than a number that depends on what Playwright's
      own blank first page does to `history.length`.
    */
    if (lands) entriesBefore = await page.evaluate(() => history.length);

    await page.click("button[type='submit']");

    /*
      A redemption leaves this page (#82) and the two refusals stay on it, so
      the wait is for the address rather than for a frame — the runs that do
      not navigate would otherwise each pay a timeout to learn nothing.
    */
    if (lands) {
      await page
        .waitForFunction(() => location.pathname === "/checkout/complete/", null, { timeout: 20000 })
        .catch(() => {});
    }

    await page.waitForTimeout(400);
  }

  const sells = {};
  for (const [what, selector] of SELLS) sells[what] = await page.locator(selector).count();

  /*
    Counted rather than read out of the text, because a field is a placeholder
    and a `sr-only` label — neither of which is prose on the page. What is being
    asked is whether the visitor has somewhere to type, which is a question
    about elements.
  */
  const offers = {
    code: await page.locator("input[name='code']").count(),
    question: await page.locator("[data-field='question']").count(),
  };

  const shown = (await page.locator("main").innerText().catch(() => "")).trim();
  const landed = page.url();

  /**
   * **`replace`, not `push`**, measured twice and by neither of the obvious
   * means.
   *
   * `goBack`'s own answer is `null` for a same-document history navigation
   * whichever call was made — there is no main resource response to hand back
   * either way — and `history.length` is a depth rather than a count of this
   * page's doing, since Playwright's blank first page is an entry too. So what
   * is read is the **change** in that depth across the submit, which `replace`
   * leaves at zero and `push` moves by one, and then where back actually goes:
   * anywhere but the form the code was spent in.
   */
  const history = lands
    ? await (async () => {
        const added = (await page.evaluate(() => window.history.length)) - entriesBefore;

        await page.goBack().catch(() => {});
        await page.waitForTimeout(200);

        return { added, back: page.url() };
      })()
    : null;

  await page.close();

  return { arrived, shown, landed, history, sells, offers, lookups, redemptions, visited };
}

const runs = [
  {
    state: "The link from the mail: a code in the address, and nothing spent",
    input: { code: CODE },
    assert: ({ arrived, shown, sells }) => {
      /*
        **The assertion this whole page is arranged around.** Resolving a code
        must not spend it, or a visitor who opens the link and closes the tab
        has lost their present — and with no expiry and no refunds there is
        nothing to put that right with. Email scanners and link prefetchers
        follow links, so the thing being guarded against is not a person.
      */
      expect("linked", "spends nothing on arrival", arrived.spent, 0);
      expect("linked", "and asks for the question instead", arrived.asks, 1);

      // A reading page, not a bare question box: the querent never chose this
      // reading, so the name, what arrives and the testimonial are exactly what
      // they most need. See ADR 0003.
      expect("linked", "names the reading", /Month Ahead Reading/.test(shown), true);
      expect("linked", "says what arrives with it", /Thoughtful written interpretation/i.test(shown), true);

      // And everything that sells is gone.
      expect("linked", "draws no checkout button", sells["a checkout button"], 0);
      expect("linked", "and no gift toggle", sells["a gift toggle"], 0);
      expect("linked", "quotes no price", /\$75|€|£/.test(shown), false);
      expect("linked", "and does not offer to gift the reading", /Gift a Reading/i.test(shown), false);

      // Shown so the visitor can see what was resolved from what they typed.
      expect("linked", "shows the code it resolved", shown.includes(CODE), true);
      expect("linked", "and mentions no expiry", EXPIRY.test(shown), false);
    },
  },
  {
    state: "The question is asked, which spends the code and ends on the confirmation",
    input: {
      code: CODE,
      lands: true,
      fill: {
        question: "What should I focus on this month?",
        querentEmail: "sam@example.com",
        querentName: "Sam",
      },
    },
    assert: ({ arrived, shown, landed, history, offers, redemptions, visited }) => {
      expect("asking", "spent nothing until the form was submitted", arrived.spent, 0);
      expect("asking", "then spends it exactly once", redemptions.length, 1);
      /*
        **The querent's own address, never the recipient's.** A forwarded gift
        is enough to part those two people, and inheriting the address the gift
        was sent to would deliver the reading to whoever forwarded it. The page
        has no way to inherit it — the lookup does not answer it — and this is
        what proves the form is what travelled.
      */
      expect("asking", "sends what the querent typed", JSON.parse(redemptions[0]), {
        code: CODE,
        question: "What should I focus on this month?",
        querent_email: "sam@example.com",
        querent_name: "Sam",
      });

      /*
        **#82: both roads through the shop end in the same room.** A buyer's
        confirmation was a page and a querent's was a panel inside the reading
        page they were given; the querent now lands where the buyer does.
      */
      expect("asking", "lands on the confirmation", new URL(landed).pathname, "/checkout/complete/");
      /*
        And is reached by a **handle**, not by the credential. ADR 0003 permits
        the code in the link the mail sent and licenses nothing else; the record
        is in the tab and the address names it.
      */
      expect("asking", "carrying a handle and nothing else", /^\?redeemed=[A-Za-z0-9%-]+$/.test(new URL(landed).search), true);
      expect("asking", "having added no history entry", history.added, 0);
      expect("asking", "so back is no way to a form whose code is spent", /\/redeem\//.test(history.back), false);

      /*
        The four things that screen owes the querent, read off the confirmation
        rather than off the panel that used to draw them.
      */
      expect("asking", "confirms from that answer and not a second call", /on its way/i.test(shown), true);
      expect("asking", "names the reading it was for", /Month Ahead Reading/.test(shown), true);
      expect("asking", "names where the reading will be sent", /sam@example\.com/.test(shown), true);
      expect("asking", "echoes back what was asked", /What should I focus on this month\?/.test(shown), true);
      /*
        The window is the reading's own line, stated as a property of the
        reading rather than as a promise this call makes. The promise is made
        once, in the mail the backend sends the querent.
      */
      expect("asking", "states the reading's delivery window", /within 24 hours/i.test(shown), true);
      /*
        **And asks nothing about a payment.** `POST /orders/status` reports one,
        and the payment behind a redeemed gift happened months earlier to
        somebody else — `API_CONTRACT.md` says so in as many words. There is no
        amount on this road for the same reason.
      */
      expect("asking", "asks the orders endpoint nothing", visited.filter((url) => url.includes("/orders/status")), []);
      expect("asking", "and quotes no money", /€|\$|£/.test(shown), false);
      expect("asking", "and there is nothing left to ask with", offers.question, 0);
    },
  },
  {
    state: "A code somebody has already spent",
    input: { code: CODE, lookup: api({ ...LOOKED, redeemed: true, redeemed_at: "2026-12-24T10:03:11+00:00" }) },
    assert: ({ arrived, shown }) => {
      /*
        **Said plainly and not hidden behind the unknown code's answer.** It is
        a state the real recipient has to be told about; what closes the
        guessing oracle that creates is the entropy in the code, plus the
        backend's throttle. ADR 0003 decides it.
      */
      expect("spent", "says it has already been redeemed", /Already Redeemed/i.test(shown), true);
      expect("spent", "and says when", /December 24, 2026/.test(shown), true);
      expect("spent", "offers nothing to ask with", arrived.asks, 0);
      expect("spent", "still shows the reading it was for", /Month Ahead Reading/.test(shown), true);
      expect("spent", "and never says it expired", EXPIRY.test(shown), false);
    },
  },
  {
    state: "A code that resolves to nothing",
    input: { code: "NOPE-NOPE-NOPE", lookup: api({ message: "No present was found for that code." }, 404) },
    assert: ({ shown, offers }) => {
      // A code that never existed, one mistyped past reading, and one whose
      // money never arrived all land here, because the backend answers all
      // three the same way.
      expect("unknown", "says it could not find a gift", /could not find a gift/i.test(shown), true);
      expect("unknown", "and offers the box again", offers.code, 1);
      expect("unknown", "naming no reading it does not know", /Month Ahead/.test(shown), false);
      expect("unknown", "and no expiry", EXPIRY.test(shown), false);
    },
  },
  {
    state: "The lookup cannot be made at all",
    input: { code: CODE, lookup: api({ message: "Server error." }, 500) },
    assert: ({ shown }) => {
      /*
        **A 503 says nothing about the code**, and telling somebody their
        present does not exist because a server was down is the one thing this
        page must not do.
      */
      expect("unreachable", "says it could not check the code", /could not check that code/i.test(shown), true);
      expect("unreachable", "and does not call it a bad one", /could not find a gift/i.test(shown), false);
    },
  },
  {
    state: "Too many tries in a minute",
    input: { code: CODE, lookup: api({ message: "Too many attempts." }, 429) },
    assert: ({ shown }) => {
      // Also not an answer about the code, and separate from the sentence above
      // because there is something the visitor can do about this one: wait.
      expect("throttled", "says to wait", /wait a minute/i.test(shown), true);
      expect("throttled", "and does not call the code bad", /could not find a gift/i.test(shown), false);
    },
  },
  {
    state: "Typed off the mail, with its spaces and its lower case",
    input: { type: AS_TYPED },
    assert: ({ shown, lookups, visited }) => {
      /*
        **Forgiving by not being strict.** The backend uppercases, strips
        everything that is not a letter or a digit, and reads `I`/`L` as `1` and
        `O` as `0`, so this code resolves. `API_CONTRACT.md` asks us not to
        reproduce that rule — a second implementation of an alphabet is a second
        one to drift — so what leaves the browser is what was typed, trimmed and
        nothing else.
      */
      expect("typed", "sends what was typed, trimmed and not normalised", JSON.parse(lookups[0]), {
        code: "k7m4 9pqr 2xyz",
      });
      expect("typed", "and shows the printed form the backend answered", shown.includes(CODE), true);
      /*
        **A hand-typed code reaches no address.** The link's own `?code=` is a
        cost ADR 0003 accepts for a credential that has to travel in a link;
        putting a typed one there as well would be a browser history entry and a
        `Referer` nobody asked for.
      */
      expect(
        "typed",
        "and never reaches an address the browser visits",
        visited.filter((url) => /9pqr/i.test(url)),
        [],
      );
    },
  },
  {
    state: "A reading this build has never drawn a page for",
    input: {
      code: CODE,
      /*
        `one-card` is in the backend's catalogue and has no `ReadingPage` here.
        A code for a **withdrawn** product is the other case that lands here,
        and it redeems for the same reason: the person paid. Refusing to render
        is refusing to redeem.
      */
      lookup: api({ ...LOOKED, product: "one-card", name: "ONE CARD", long_description: "A single card, read in full." }),
      /*
        The **redemption's** own answer names the product too, and it is the one
        the confirmation reads: the record is written from what spending the
        code returned, not from what looking it up did.
      */
      redeem: api({ ...ASKED, product: "one-card", name: "ONE CARD", question: "What should I know?" }),
      lands: true,
      fill: { question: "What should I know?", querentEmail: "sam@example.com", querentName: "" },
    },
    /*
      Read off `arrived`, which is the page before the submit: this run now
      spends the code and leaves, so the reading it drew is only on screen at
      the first of the two reads.
    */
    assert: ({ arrived, shown, redemptions }) => {
      expect("no page", "falls back to the API's own name", /ONE CARD/.test(arrived.text), true);
      expect("no page", "and its own description", /A single card, read in full\./.test(arrived.text), true);
      expect("no page", "renders no other reading's copy", /Month Ahead/.test(arrived.text), false);
      expect("no page", "still asks for a question", arrived.asks, 1);
      expect("no page", "and still redeems", redemptions.length, 1);
      // Optional, exactly as a buyer's name is. An empty box sends no name at
      // all rather than an empty string a validator would read as one.
      expect("no page", "sending no name where none was given", "querent_name" in JSON.parse(redemptions[0]), false);
      /*
        **The same fallback at the other end.** The confirmation names the
        reading from the product key on the record, through `readingPageFor`,
        so a key this build has drawn no page for names no reading and states
        no window — rather than a blank, a key, or the last name it knows.
      */
      expect("no page", "confirms without naming a reading it has no page for", /Your reading is being written/i.test(shown), true);
      expect("no page", "and states no window it has no line for", /within 24 hours/i.test(shown), false);
      expect("no page", "and never renders the key itself", /one-card/i.test(shown), false);
      expect("no page", "nor some other reading's name", /Month Ahead/.test(shown), false);
    },
  },
  {
    state: "Two tabs, and this one lost the race",
    input: {
      code: CODE,
      redeem: api({ message: "Already redeemed.", errors: { code: ["Already redeemed."] } }, 409),
      fill: { question: "What should I know?", querentEmail: "sam@example.com", querentName: "" },
    },
    assert: ({ shown }) => {
      /*
        The code was good when this page looked it up and was spent in between.
        Redemption is atomic against a row lock, so exactly one submit wins —
        and the loser has to be told **which** refusal it was, because "you
        mistyped it" and "this has already been used" are different facts about
        somebody's present. That is the whole reason the backend answers 409
        here rather than 404.
      */
      expect("raced", "says the gift has already been redeemed", /Already Redeemed/i.test(shown), true);
      expect("raced", "rather than that it could not be found", /could not find a gift/i.test(shown), false);
      expect("raced", "and does not claim a reading is coming", /on its way/i.test(shown), false);
    },
  },
  {
    state: "A refused redemption that says nothing about the code",
    input: {
      code: CODE,
      redeem: api({ message: "The question field is required.", errors: {} }, 422),
      fill: { question: "What should I know?", querentEmail: "sam@example.com", querentName: "" },
    },
    assert: ({ shown, offers }) => {
      /*
        **It has to say the code is unspent.** Somebody holding a non-expiring
        bearer credential who cannot tell whether they have just used it is in a
        worse position than the failure itself puts them in.
      */
      expect("refused", "says the code has not been used", /has not been used/i.test(shown), true);
      expect("refused", "and leaves the question where they typed it", offers.question, 1);
    },
  },
  {
    state: "Typed off the mail and then spent, so the code touches no address at all",
    input: {
      type: AS_TYPED,
      lands: true,
      fill: {
        question: "What should I focus on this month?",
        querentEmail: "sam@example.com",
        querentName: "",
      },
    },
    assert: ({ landed, shown, redemptions, visited }) => {
      /*
        The strictest form of ADR 0003's rule, end to end. This run's code never
        arrives in an address — it is typed — so unlike every other run here,
        **no** address the browser visits may contain it, the redirect the
        redemption makes least of all. The general check below allows
        `/redeem/`'s own query string, because that is the link the mail sends;
        this run allows nothing.
      */
      expect("typed and spent", "spends the code that was typed", JSON.parse(redemptions[0]).code, "k7m4 9pqr 2xyz");
      expect("typed and spent", "lands on the confirmation", new URL(landed).pathname, "/checkout/complete/");
      expect("typed and spent", "and the code is in no address at all", visited.filter((url) => /9pqr/i.test(url)), []);
      expect("typed and spent", "the confirmation reads off the record it was handed", /sam@example\.com/.test(shown), true);
      // The printed form was on the panel and is not on the confirmation: the
      // code is spent, and a screen that shows a spent credential is showing
      // somebody a string that can do nothing.
      expect("typed and spent", "and shows no gift code", shown.includes(CODE), false);
    },
  },
  {
    state: "Arriving with no code at all",
    input: {},
    assert: ({ arrived, shown, offers, lookups }) => {
      expect("bare", "asks nothing of the backend", lookups.length, 0);
      expect("bare", "offers the box", offers.code, 1);
      expect("bare", "and no question field", arrived.asks, 0);
      // The one thing on the entry screen that is a promise about the field
      // rather than about the gift, and it is true: the backend normalises.
      expect("bare", "saying the spacing does not matter", /Capitals and spacing do not matter/i.test(shown), true);
    },
  },
];

/**
 * Every address the browser visited that carries the code, bar `/redeem/`'s own
 * query string.
 *
 * That one is the link the mail sends, and ADR 0003 accepts it knowingly: a
 * link carries its credential in its URL or it is not a link. **It licenses
 * nothing else** — not a typed code, and from #82 not the redirect a redemption
 * makes either, which carries a random handle naming a record in the tab.
 *
 * An address that will not parse is reported rather than skipped: it is not one
 * this check can clear, and the safe reading of "we could not tell" here is a
 * failure.
 */
function codeInAddresses(visited) {
  return visited.filter((url) => {
    if (!/9pqr/i.test(url)) return false;

    try {
      return new URL(url).pathname !== "/redeem/";
    } catch {
      return true;
    }
  });
}

for (const run of runs) {
  const result = await drive(run.state, run.input);

  run.assert(result);

  /*
    Every state, not only the ones that mention a code: gift codes do not
    expire, and a sentence inventing the concept is exactly the kind of thing
    that arrives in a copy change rather than in a decision.
  */
  expect(run.state, "mentions no expiry anywhere", EXPIRY.test(result.shown), false);
  /*
    And every state, not only the typed one. A redirect is an address the
    browser visits, so the road a spent code takes to `/checkout/complete/` is
    inside this rule rather than beside it.
  */
  expect(run.state, "puts the code in no address but the link's own", codeInAddresses(result.visited), []);
}

await browser.close();
server.close();

if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
}

console.log("\nAll good.");
