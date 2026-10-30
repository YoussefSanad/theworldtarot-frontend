/**
 * Drives the Viewing Room through every access state, in a real browser
 * against the real export.
 *
 * `npm run build && npm run check:viewing-room` — serves `out/` and answers
 * `/me` itself, so nothing here needs a staging session or a real customer.
 *
 * It exists because **none of this page's acceptance criteria can be reached
 * by the type checker or by `node --test`**. That a member never sees a frame
 * of the paywall; that the room really is inert behind it; that removing the
 * attribute by hand still plays nothing; that a locked card announces itself;
 * that four fast clicks leave the right film selected; that the gold button
 * survives a 360px viewport with the keyboard up. Every one of them is a fact
 * about a laid-out page.
 *
 * **The sentences below are copied from `src/content/viewing-room.ts`
 * deliberately.** A check that imported them could not tell the difference
 * between the page rendering the right words and the page rendering whatever
 * the words had become.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const root = join(process.cwd(), "out");
/* 4321-4323 belong to the other checks, so all of them can run at once. */
const PORT = 4324;
const ROOM = `http://localhost:${PORT}/viewing-room/`;

/** `src/content/viewing-room.ts`, verbatim. */
const HEADING = "Unlock the Viewing Room";
const ACTION = "ENTER THE VIEWING ROOM";
const PRICE = "$29 — One-time payment";
const SIGN_IN = "Sign in Here.";
const SWITCH = "Sign out / switch account";
const HINT = "Click any card to experience the Living Tarot";
const COMING_SOON = "coming soon";

const MEMBER = {
  id: 7,
  name: null,
  email: "jane@example.com",
  created_at: "2026-08-12T10:04:00+00:00",
  has_viewing_room_access: true,
};
const NO_PASS = { ...MEMBER, has_viewing_room_access: false };

/**
 * The deck, as `GET /{locale}/cards` answers it.
 *
 * **Faked here because the page now fetches it**, where phase one bundled it
 * into the export. That moves two things into this check's hands that used to
 * be facts about the build: which cards exist, and which of them have films.
 *
 * `in_viewing_room: false` on three of them, spread through the deck rather
 * than bunched at the end, so the coming-soon treatment is exercised in
 * passing rather than only at one edge. The names are the Major Arcana's; the
 * ids are deliberately **not** `number + 1`, so a mapping that confused the
 * two would fail here rather than look right by coincidence.
 */
const DECK = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
  "The High Priest", "The Lovers", "The Chariot", "Strength", "The Hermit",
  "The Wheel", "Justice", "The Hangman", "Death", "Temperance",
  "The Devil", "The Tower", "The Star", "The Moon", "The Sun",
  "Judgement", "The World",
].map((name, number) => ({
  id: 100 + number,
  number,
  name,
  short_description: `${name}, briefly.`,
  long_description: `The longer meaning of ${name}.`,
  image: `/cards/library/${number}.webp`,
  in_viewing_room: !["The Hangman", "The Tower", "Judgement"].includes(name),
}));

/** The card the player opens on: the first with a film, which is The Fool. */
const FIRST_PLAYABLE = DECK[0];

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".otf": "font/otf", ".txt": "text/plain", ".ico": "image/x-icon",
  ".mp4": "video/mp4", ".m3u8": "application/vnd.apple.mpegurl",
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
  if (!ok) {
    failures.push(`${state}: ${what} was ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);
  }

  console.log(`  ${ok ? "✓" : "✗"} ${what}: ${JSON.stringify(actual)}`);
}

/** A fulfilled cross-origin answer; see `check-login.mjs` for why CORS matters. */
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
    body: body === null ? "" : JSON.stringify(body),
  };
}

/**
 * What the faked API answers for one URL.
 *
 * **One table, shared by `openRoom` and the two cases that route for
 * themselves.** Those two need an init script or a viewport set before they
 * navigate, so they cannot use `openRoom` — and they used to answer `api([])`
 * to everything but `/me`, which was harmless while the deck was bundled and
 * silently emptied the room the moment it was fetched. That is exactly the bug
 * this table exists to make impossible to reintroduce.
 *
 * `deck` is `"full"`, `"empty"` or `"unreachable"`.
 */
function answerFor(url, me, { deck = "full" } = {}) {
  /*
    **Refused, and first.** `openRoom` intercepts this before calling here, so
    it is reached only from the two cases that route for themselves — neither
    of which presses play today. It refuses rather than falling through to the
    catch-all's `[]`, because a player handed an empty array fails as a parse
    error somewhere inside the HLS source and reads as a broken player rather
    than as a mock nobody taught about this endpoint.
  */
  if (url.endsWith("/video")) {
    return api({ message: "Unauthenticated." }, 401);
  }

  if (url.endsWith("/api/v1/me")) {
    return me === null ? api({ message: "Unauthenticated." }, 401) : api(me);
  }

  /*
    **Checked after `/me` and before the catch-all**, and note that `/video`
    also lives under `/cards/` — the caller tests for that one first, because
    answering a playback request with a list of cards fails in a way that looks
    like the CDN rather than like a mock.
  */
  if (url.endsWith("/cards")) {
    if (deck === "unreachable") return api({ message: "Nope." }, 503);

    return api(deck === "empty" ? [] : DECK);
  }

  // Everything else the page may ask for (products, currencies, languages)
  // answers empty rather than reaching the network, so no state is ever
  // waiting on an unrelated call.
  return api([]);
}

/**
 * A page with `/me` and `/cards` answered, and every video request recorded.
 *
 * The recorder is the point of several cases below: "no film was requested" is
 * only provable by watching the network, not by looking at the DOM.
 *
 * `deck` is `"full"`, `"empty"` or `"unreachable"`. It exists because the deck
 * is fetched now rather than bundled, so "the carousel has cards in it" became
 * a fact about the network — and the two ways it can have none are states the
 * page draws different words for.
 */
async function openRoom({ me, meStatus = 200, viewport, deck = "full", reducedMotion = false }) {
  const context = await browser.newContext({
    ...(viewport ? { viewport } : {}),
    ...(reducedMotion ? { reducedMotion: "reduce" } : {}),
  });
  const page = await context.newPage();
  const videoRequests = [];

  /*
    **One predicate route rather than three globs.** The API lives on another
    origin (`NEXT_PUBLIC_API_BASE_URL`), and a glob pattern does not match an
    absolute cross-origin URL — the request goes to the real staging API
    instead, which answers with whatever session that host happens to have.
    That is not a hypothetical: it is what this check did first, and the
    signed-out case quietly tested a signed-in one.
  */
  await page.route(
    (url) => url.pathname.includes("/api/v1/"),
    (route) => {
      const url = route.request().url();

      // First, and before the deck: `/video` lives under `/cards/` too.
      if (url.endsWith("/video")) {
        videoRequests.push(url);
        return route.fulfill(api({ message: "Unauthenticated." }, 401));
      }

      return route.fulfill(answerFor(url, meStatus === 401 ? null : me, { deck }));
    },
  );

  await page.goto(ROOM, { waitUntil: "networkidle" });

  return { context, page, videoRequests };
}

const modalSelector = '[role="dialog"]';

/* ------------------------------------------------------------------ */
console.log("\nSigned out (401):");
{
  const { context, page, videoRequests } = await openRoom({ meStatus: 401 });

  expect("signed-out", "the panel is up", await page.locator(modalSelector).isVisible(), true);
  expect("signed-out", "it is a modal", await page.locator(modalSelector).getAttribute("aria-modal"), "true");
  expect("signed-out", "heading", await page.locator(`${modalSelector} h2`).innerText(), HEADING);
  expect("signed-out", "the buy button", await page.getByRole("button", { name: ACTION }).isVisible(), true);
  expect("signed-out", "the price", await page.getByText(PRICE, { exact: true }).isVisible(), true);
  expect("signed-out", "the sign-in link", await page.getByRole("link", { name: SIGN_IN }).isVisible(), true);

  const signIn = await page.getByRole("link", { name: SIGN_IN }).getAttribute("href");
  expect("signed-out", "sign-in returns to the room", signIn, "/login/?next=/viewing-room/");

  // The room is behind an inert container, so nothing in it is reachable.
  const roomInert = await page.evaluate(
    () => document.querySelector("[data-viewing-room]")?.hasAttribute("inert") ?? false,
  );
  expect("signed-out", "the room is inert", roomInert, true);

  /*
    The veil is a fixed sheet over the whole page, not a tint on the player:
    it was `absolute inset-0` inside the player's wrapper, so it dimmed the
    card and left the room either side of it bright behind a panel that is
    meant to be the only usable thing on screen.
  */
  const veil = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div[aria-hidden=true]")].find((d) => {
      const style = getComputedStyle(d);
      return style.position === "fixed" && style.zIndex === "20";
    });
    if (!el) return null;

    const box = el.getBoundingClientRect();
    return {
      covers: Math.round(box.width) >= innerWidth && Math.round(box.height) >= innerHeight,
      underPanel:
        Number(getComputedStyle(el).zIndex) <
        Number(getComputedStyle(document.querySelector('[role="dialog"]').closest("div.fixed")).zIndex),
    };
  });
  expect("signed-out", "the veil covers the page", veil?.covers, true);
  expect("signed-out", "and sits under the panel", veil?.underPanel, true);

  /*
    **A paywall blocks the content, never the way off the page.** The veil
    and the panel both used to cover the whole viewport, so a visitor who
    could not or would not buy was stuck with the back button — the nav was
    unreachable by pointer and the focus trap closed the keyboard route too.
    The masthead is the exit; the footer stays under the veil by choice.
  */
  const exits = await page.evaluate(() => {
    const onTop = (el) => {
      const box = el.getBoundingClientRect();
      const top = document.elementsFromPoint(box.x + box.width / 2, box.y + box.height / 2)[0];
      return !!top && (el === top || el.contains(top));
    };

    // The nav is tested at the top of the page, the footer at the bottom —
    // scrolling between them, because neither is on screen at the other's
    // scroll position.
    window.scrollTo(0, 0);
    const nav = document.querySelector("header a[href]");
    const navOk = !!nav && onTop(nav);

    window.scrollTo(0, document.body.scrollHeight);
    const foot = document.querySelector("footer a[href]");

    return { nav: navOk, footer: !!foot && onTop(foot) };
  });
  /*
    The masthead is the way out and stays above the veil. The footer is
    **deliberately covered**: it is not an escape route, and leaving it
    under the veil keeps the panel reading as modal rather than as a banner
    the page happens to be wearing.
  */
  expect("signed-out", "the masthead is still clickable", exits.nav, true);
  expect("signed-out", "the footer is covered", exits.footer, false);

  expect("signed-out", "no account line", await page.getByText(SWITCH).count(), 0);
  expect("signed-out", "nothing was requested", videoRequests.length, 0);

  // No <video> may carry a source in this state.
  const sources = await page.evaluate(() =>
    Array.from(document.querySelectorAll("video")).filter((v) => v.src || v.currentSrc).length,
  );
  expect("signed-out", "no video has a source", sources, 0);

  await context.close();
}

/* ------------------------------------------------------------------ */
console.log("\nSigned in without the pass:");
{
  const { context, page } = await openRoom({ me: NO_PASS });

  expect("no-pass", "the panel is up", await page.locator(modalSelector).isVisible(), true);
  // Scoped to the dialog: the masthead names the same address once signed in.
  const dialog = page.locator(modalSelector);
  expect("no-pass", "the account is named", await dialog.getByText(NO_PASS.email).isVisible(), true);
  expect("no-pass", "a way to switch", await page.getByRole("button", { name: SWITCH }).isVisible(), true);
  expect("no-pass", "no sign-in link", await page.getByRole("link", { name: SIGN_IN }).count(), 0);

  /*
    The real session must name the real address, never the stand-in the dev
    override uses — if that placeholder ever reached a signed-in customer it
    would be telling them they are somebody else.
  */
  expect(
    "no-pass",
    "the stand-in account is nowhere near a real session",
    await dialog.getByText("someone@example.com").count(),
    0,
  );

  await context.close();
}

/* ------------------------------------------------------------------ */
console.log("\nThe payment step (screen two):");
{
  const { context, page } = await openRoom({ me: NO_PASS });

  await page.getByRole("button", { name: ACTION }).click();

  expect("payment", "the panel stays one dialog", await page.locator(modalSelector).count(), 1);
  expect("payment", "the heading holds", await page.locator(`${modalSelector} h2`).innerText(), HEADING);
  expect("payment", "a way back", await page.getByRole("button", { name: "Back" }).isVisible(), true);
  expect("payment", "the buy button is gone", await page.getByRole("button", { name: ACTION }).count(), 0);

  await page.getByRole("button", { name: "Back" }).click();
  expect("payment", "back returns to screen one", await page.getByRole("button", { name: ACTION }).isVisible(), true);

  await context.close();
}

/* ------------------------------------------------------------------ */
console.log("\nMember:");
{
  const context = await browser.newContext();
  const page = await context.newPage();

  // Watched from the first paint rather than checked at the end: "the modal is
  // gone now" is not the criterion — the criterion is that it never appeared.
  let everSawModal = false;
  await page.exposeFunction("__sawModal", () => {
    everSawModal = true;
  });
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.querySelector('[role="dialog"]')) window.__sawModal?.();
    }).observe(document.documentElement, { childList: true, subtree: true });
  });

  await page.route(
    (url) => url.pathname.includes("/api/v1/"),
    (route) =>
      route.fulfill(answerFor(route.request().url(), MEMBER)),
  );
  await page.goto(ROOM, { waitUntil: "networkidle" });

  expect("member", "no panel now", await page.locator(modalSelector).count(), 0);
  expect("member", "no panel ever", everSawModal, false);
  expect("member", "the room is usable", await page.locator("[data-viewing-room]").getAttribute("inert"), null);
  expect("member", "the carousel is there", await page.getByText(HINT).isVisible(), true);
  expect("member", "all twenty-two arrived", await page.getByRole("button", { name: /tarot card from The World Tarot/ }).count(), DECK.length);

  /*
    **The player opens on a card with a film.** The deck's order is the
    backend's and its first card may be locked, so this is the one selection
    the page makes on the visitor's behalf and it must not open on a card
    whose play button refuses.
  */
  const opened = await page.locator('[aria-current="true"]').first().getAttribute("aria-label");
  expect("member", "it opens on a playable card", opened, `${FIRST_PLAYABLE.name} tarot card from The World Tarot`);
  expect(
    "member",
    "no veil over the room",
    await page.evaluate(
      () =>
        [...document.querySelectorAll("div[aria-hidden=true]")].filter((d) => {
          const style = getComputedStyle(d);
          return style.position === "fixed" && style.zIndex === "20";
        }).length,
    ),
    0,
  );

  await context.close();
}

/* ------------------------------------------------------------------ */
console.log("\nInert removed by hand (the gate is the backend, not the DOM):");
{
  const { context, page, videoRequests } = await openRoom({ meStatus: 401 });

  await page.evaluate(() => {
    document.querySelector("[data-viewing-room]")?.removeAttribute("inert");
    document.querySelector('[role="dialog"]')?.closest("div.fixed")?.remove();
  });

  const play = page.getByRole("button", { name: "Play this film" });
  if (await play.count()) await play.first().click({ force: true });
  await page.waitForTimeout(400);

  const playing = await page.evaluate(() =>
    Array.from(document.querySelectorAll("video")).some((v) => !v.paused && v.currentTime > 0),
  );
  expect("inert-removed", "nothing plays", playing, false);
  expect(
    "inert-removed",
    "any request the backend saw was refused",
    videoRequests.length === 0 || playing === false,
    true,
  );

  await context.close();
}

/* ------------------------------------------------------------------ */
console.log("\nComing-soon cards:");
{
  const { context, page } = await openRoom({ me: MEMBER });

  const locked = page.getByRole("button", { name: new RegExp(COMING_SOON, "i") });
  const count = await locked.count();
  expect("coming-soon", "some cards are locked", count > 0, true);
  expect("coming-soon", "they announce as disabled", await locked.first().getAttribute("aria-disabled"), "true");

  // Still reachable: removing them would shorten the deck for a keyboard.
  expect("coming-soon", "still focusable", await locked.first().evaluate((el) => {
    el.focus();
    return document.activeElement === el;
  }), true);

  await context.close();
}

/* ------------------------------------------------------------------ */
console.log("\nRapid switching:");
{
  const { context, page } = await openRoom({ me: MEMBER });

  /*
    Only the playable cards, by their alt text. The locked ones end in
    "— coming soon" and are excluded by the `$` anchor, which is deliberate:
    clicking one is supposed to do nothing, so including them would make the
    final assertion pass for the wrong reason.
  */
  const playable = page.locator('.carousel-slide button:not([aria-disabled="true"])');
  const total = await playable.count();
  expect("rapid-switch", "there are cards to switch between", total >= 4, true);

  // The names are read BEFORE the clicks: `aria-current` moves, and reading
  // the target afterwards would compare the selection against itself.
  const names = [];
  for (let i = 0; i < 4; i += 1) {
    names.push(await playable.nth(i).getAttribute("aria-label"));
    await playable.nth(i).click({ force: true });
  }

  const selectedCount = await page.locator('[aria-current="true"]').count();
  expect("rapid-switch", "exactly one card is selected", selectedCount, 1);

  const selectedName = await page.locator('[aria-current="true"]').getAttribute("aria-label");
  expect("rapid-switch", "the last clicked card won", selectedName, names[3]);
  expect("rapid-switch", "and it is a real label", typeof selectedName === "string", true);

  await context.close();
}

/* ------------------------------------------------------------------ */
console.log("\nSigning out from the no-pass panel:");
for (const logoutWorks of [true, false]) {
  const context = await browser.newContext();
  const page = await context.newPage();
  let signedOut = false;

  await page.route(
    (url) => url.pathname.includes("/api/v1/") || url.pathname.includes("/sanctum/"),
    (route) => {
      const url = route.request().url();

      if (url.endsWith("/logout")) {
        signedOut = logoutWorks;
        return logoutWorks ? route.fulfill(api(null, 204)) : route.abort();
      }
      if (url.endsWith("/api/v1/me")) {
        return route.fulfill(signedOut ? api({ message: "Unauthenticated." }, 401) : api(NO_PASS));
      }
      return route.fulfill(api([]));
    },
  );

  await page.goto(ROOM, { waitUntil: "networkidle" });

  const label = logoutWorks ? "logout succeeds" : "logout fails";
  await page.getByRole("button", { name: SWITCH }).click();
  await page.waitForTimeout(400);

  const dialog = page.locator(modalSelector);
  expect(label, "the panel is still up", await dialog.count(), 1);

  /*
    The point of both branches: whatever the network did, the visitor must end
    up on a panel that offers a way back in. A failed logout that leaves the
    old account named is the state the contract warns about — somebody buying
    a second pass under an address they were trying to leave.
  */
  expect(label, "the sign-in link is offered", await dialog.getByRole("link", { name: SIGN_IN }).count(), 1);
  expect(label, "the old account is no longer named", await dialog.getByText(NO_PASS.email).count(), 0);

  const focusInside = await page.evaluate(
    () => document.querySelector('[role="dialog"]')?.contains(document.activeElement) ?? false,
  );
  expect(label, "focus stays inside the dialog", focusInside, true);

  await context.close();
}


/* ------------------------------------------------------------------ */
console.log("\nThe panel stays a panel, not a page:");
{
  /*
    Her 713px is a third of a 2132px artboard, not of a screen. Transcribing
    her type sizes literally made this 66% of a 1080p viewport and 89% of a
    1280x800 laptop, which reads as a page rather than as something laid over
    a room. Desktop viewports are held to roughly half the height; the phone
    is exempt, because there the panel is the whole interaction and a cap
    would only clip the button.
  */
  for (const [width, height] of [[1280, 800], [1440, 900], [1920, 1080]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();

    await page.route(
      (url) => url.pathname.includes("/api/v1/"),
      (route) => route.fulfill(route.request().url().endsWith("/api/v1/me") ? api(NO_PASS) : api([])),
    );
    await page.goto(ROOM, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);

    const box = await page.locator(modalSelector).boundingBox();
    const share = box.height / height;
    expect(`${width}x${height}`, "the panel is about half the screen", share < 0.62, true);

    // And it fits, rather than hiding its own button behind a scrollbar.
    const fits = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog.scrollHeight <= dialog.clientHeight + 1;
    });
    expect(`${width}x${height}`, "the content fits without scrolling", fits, true);

    await context.close();
  }
}


/* ------------------------------------------------------------------ */
console.log("\nThe player keeps the card's shape at every width:");
{
  /*
    The one measurement that has to survive every breakpoint. 509x842 is
    1:1.654, and a player that quietly becomes a landscape box is the
    letterboxing the spec forbids, rotated 90 degrees — the card draws at its
    own ratio inside it and the rest of the box is empty.
  */
  const CARD = 842 / 509;

  for (const width of [360, 390, 430, 768, 1024, 1280, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();

    await page.route(
      (url) => url.pathname.includes("/api/v1/"),
      (route) =>
        route.fulfill(answerFor(route.request().url(), MEMBER)),
    );
    await page.goto(ROOM, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    const box = await page
      .locator("video")
      .first()
      .evaluateHandle((video) => video.parentElement)
      .then((handle) => handle.asElement().boundingBox());

    const ratio = box.height / box.width;
    expect(`${width}px`, "the player is the card's shape", Math.abs(ratio - CARD) < 0.02, true);

    await context.close();
  }
}


/* ------------------------------------------------------------------ */
console.log("\n360px with the keyboard up (Review Focus #5):");
{
  // 360x480 is roughly a 360 phone with the on-screen keyboard raised: the
  // case where a `vh`-sized panel puts its button under the browser chrome.
  const { context, page } = await openRoom({ meStatus: 401, viewport: { width: 360, height: 480 } });

  const button = page.getByRole("button", { name: ACTION });
  await button.scrollIntoViewIfNeeded();

  const box = await button.boundingBox();
  expect("360px", "the button is laid out", box !== null, true);
  expect("360px", "it is within the viewport", box !== null && box.y >= 0 && box.y + box.height <= 480, true);
  expect("360px", "it is a real tap target", box !== null && box.height >= 44, true);

  const scrollsSideways = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect("360px", "no horizontal page scroll", scrollsSideways, false);

  await context.close();
}

/* ------------------------------------------------------------------ */
/*
  The deck's own states, which are new with the wiring: it is fetched in the
  browser now rather than bundled into the export, so "there are cards" stopped
  being a fact about the build.

  **Both are checked for a member**, who is the only visitor who would notice:
  a signed-out one has the panel over the room either way. And both assert the
  page is still a page — the title and the closing call to action owe the
  backend nothing and must not vanish with the deck.
*/
console.log("\nA deck the backend has nothing in:");
{
  const { context, page, videoRequests } = await openRoom({ me: MEMBER, deck: "empty" });

  expect("empty-deck", "the room still says what it is", await page.getByText("The Living Tarot").first().isVisible(), true);
  expect("empty-deck", "it says the deck is coming", await page.getByText("The deck is being prepared.").isVisible(), true);
  expect("empty-deck", "no carousel to drag", await page.getByText(HINT).count(), 0);
  expect("empty-deck", "no player with no card to play", await page.locator("video").count(), 0);
  expect("empty-deck", "nothing was requested", videoRequests.length, 0);

  /*
    No retry here, deliberately: an empty deck is the backend's considered
    answer and asking again will not finish a film. A retry that cannot help
    is a button that teaches people the page is broken.
  */
  expect("empty-deck", "and no retry that could not help", await page.getByRole("button", { name: "Try again" }).count(), 0);

  await context.close();
}

console.log("\nA deck the backend could not answer:");
{
  const { context, page } = await openRoom({ me: MEMBER, deck: "unreachable" });

  expect("broken-deck", "the room still says what it is", await page.getByText("The Living Tarot").first().isVisible(), true);
  expect("broken-deck", "it says so", await page.getByText("The deck could not be loaded.").isVisible(), true);

  const retry = page.getByRole("button", { name: "Try again" });
  expect("broken-deck", "a retry is offered", await retry.isVisible(), true);

  /*
    And the retry actually re-asks. The route is rewritten to a working deck
    first, so this proves the request happens again rather than that the
    button merely exists — the failure mode being a retry wired to nothing,
    which looks identical until somebody presses it.
  */
  await page.route(
    (url) => url.pathname.includes("/api/v1/"),
    (route) => route.fulfill(answerFor(route.request().url(), MEMBER)),
  );
  await retry.click();

  await page.getByText(HINT).waitFor({ timeout: 5000 });
  expect("broken-deck", "pressing it brings the deck back", await page.getByText(HINT).isVisible(), true);
  expect("broken-deck", "and the player with it", await page.locator("video").count(), 1);

  await context.close();
}

/* ------------------------------------------------------------------ */
console.log("\nRunes:");
{
  /*
    Every measurement is a `getBoundingClientRect` at scroll 0, and a rotated
    rune's box is slightly larger than its glyph. That errs towards "the rune
    clashes", which is the safe direction for the clash checks and a
    sub-pixel difference for the edge counts, which have margin.

    The player is the stage's one child that is not the rune field; the
    carousel band is the full-width block that follows the player's `Container`.
  */
  const VIEWPORTS = [
    [360, 800], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 900], [1920, 1080],
  ];

  /** Everything the criteria need, read in one pass so the layout cannot move between reads. */
  const measure = () => {
    const rect = (el) => {
      const { left, right, top, bottom, width, height } = el.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const stage = document.querySelector("[data-rune-stage]");
    const field = document.querySelector("[data-rune-field]");
    const player = stage.querySelector(":scope > :not([data-rune-field])");
    const band = stage.parentElement.parentElement.nextElementSibling;
    const header = document.querySelector("[data-viewing-room] header");
    const runes = [...field.children].filter((el) => el.tagName.toLowerCase() === "svg");

    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      stage: rect(stage),
      player: rect(player),
      band: rect(band),
      bandIsFullWidth: band.matches("div.w-full") && !band.hasAttribute("data-rune-stage"),
      header: rect(header),
      runes: runes.map(rect),
      scrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      field: {
        ariaHidden: field.getAttribute("aria-hidden"),
        pointerEvents: getComputedStyle(field).pointerEvents,
        focusable: field.querySelectorAll(
          'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable], [focusable="true"]',
        ).length,
      },
    };
  };

  const meets = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const crossesTop = (r, p) => r.top < p.top && r.bottom > p.top;
  const crossesBottom = (r, p) => r.top < p.bottom && r.bottom > p.bottom;

  /** What every rune's computed style says, read on the page. */
  const runeStyles = () =>
    [...document.querySelectorAll("[data-rune-field] > svg")].map((el) => {
      const style = getComputedStyle(el);
      return { name: style.animationName, duration: style.animationDuration, opacity: style.opacity };
    });

  for (const [width, height] of VIEWPORTS) {
    const state = `${width}x${height}`;
    const { context, page } = await openRoom({ me: MEMBER, viewport: { width, height } });

    await page.locator("[data-rune-stage] video").first().waitFor({ state: "attached", timeout: 5000 });
    await page.waitForTimeout(600);

    const m = await page.evaluate(measure);

    // 1
    expect(state, "24 to 32 runes", m.runes.length >= 24 && m.runes.length <= 32, true);
    expect(state, "the field holds nothing but runes", await page.locator("[data-rune-field] > *:not(svg)").count(), 0);

    // 5
    expect(state, "the carousel band was found", m.bandIsFullWidth && m.band.width >= m.vw - 1, true);
    expect(state, "no rune meets the title", m.runes.filter((r) => meets(r, m.header)).length, 0);
    expect(state, "no rune meets the carousel band", m.runes.filter((r) => meets(r, m.band)).length, 0);

    // 7
    expect(state, "no horizontal page scroll", m.scrolls, false);

    // 9
    expect(state, "the field is aria-hidden", m.field.ariaHidden, "true");
    expect(state, "the field takes no pointer", m.field.pointerEvents, "none");
    expect(state, "nothing in the field is focusable", m.field.focusable, 0);

    // 10
    expect(state, "the stage is as wide as the player", Math.abs(m.stage.width - m.player.width) <= 1, true);

    // 3
    if (width >= 1280) {
      const left = m.runes.filter((r) => r.right <= m.player.left && r.left >= 0 && r.top >= 0 && r.bottom <= m.vh);
      const right = m.runes.filter((r) => r.left >= m.player.right && r.right <= m.vw && r.top >= 0 && r.bottom <= m.vh);

      expect(state, "3 or more runes wholly left of the player", left.length >= 3, true);
      expect(state, "3 or more runes wholly right of the player", right.length >= 3, true);
      expect(state, "2 or more runes cross the player's top edge", m.runes.filter((r) => crossesTop(r, m.player)).length >= 2, true);
      expect(state, "2 or more runes cross the player's bottom edge", m.runes.filter((r) => crossesBottom(r, m.player)).length >= 2, true);
    }

    // 4
    if (width <= 390) {
      const over = m.runes.filter(
        (r) =>
          (crossesTop(r, m.player) || crossesBottom(r, m.player)) &&
          (r.left + r.right) / 2 >= 0 &&
          (r.left + r.right) / 2 <= m.vw,
      );

      expect(state, "3 or more runes cross the player's top or bottom edge", over.length >= 3, true);
    }

    // 2
    if (width === 1280) {
      const before = await page.evaluate(runeStyles);

      expect(state, "every rune pulses", before.every((r) => r.name === "rune-pulse"), true);
      expect(state, "4 or more distinct durations", new Set(before.map((r) => r.duration)).size >= 4, true);

      // Read late, and again 1.2 s on: with several durations and delays, something has moved.
      await page.waitForTimeout(600);
      const first = (await page.evaluate(runeStyles)).map((r) => r.opacity);
      await page.waitForTimeout(1200);
      const second = (await page.evaluate(runeStyles)).map((r) => r.opacity);

      expect(state, "some rune's opacity moved in 1.2 s", first.some((o, i) => o !== second[i]), true);
    }

    await context.close();
  }

  // 6, and a positive control so the probe cannot pass by being blind.
  for (const [width, height] of [[1280, 900], [360, 800]]) {
    const state = `${width}x${height} signed out`;
    const { context, page } = await openRoom({ meStatus: 401, viewport: { width, height } });

    await page.waitForTimeout(600);
    await page.addStyleTag({
      content: "[data-rune-field], [data-rune-field] * { pointer-events: auto !important; }",
    });
    // Test only: inert content is skipped by hit-testing, so lift it and let stacking alone decide.
    await page.evaluate(() => document.querySelector("[data-viewing-room]")?.removeAttribute("inert"));

    const probe = () =>
      page.evaluate(() => {
        let probed = 0;
        const under = [];

        for (const el of document.querySelectorAll("[data-rune-field] > svg")) {
          const box = el.getBoundingClientRect();
          const x = box.left + box.width / 2;
          const y = box.top + box.height / 2;

          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;

          probed += 1;
          const top = document.elementFromPoint(x, y);

          if (!top || top.closest("[data-rune-field]")) under.push([Math.round(x), Math.round(y)]);
        }

        return { probed, under };
      });

    const hits = await probe();

    expect(state, "the room is no longer inert for the probe", await page.evaluate(() => document.querySelector("[data-viewing-room]")?.hasAttribute("inert")), false);
    expect(state, "some runes were in view to probe", hits.probed >= 1, true);
    expect(state, "no rune is the topmost thing at its own centre", hits.under, []);

    // Positive control: lift the rune stage above the veil (z-20) and the panel's full-viewport
    // wrapper (z-30) and the same probe must now find runes.
    await page.evaluate(() => {
      const stage = document.querySelector("[data-rune-stage]");

      stage.style.position = "relative";
      stage.style.zIndex = "40";
    });

    const lifted = await probe();

    expect(state, "control: the probe finds runes once the stage is above the veil", lifted.under.length >= 1, true);

    await context.close();
  }

  // 8
  for (const [width, height] of [[1280, 900], [360, 800]]) {
    const state = `${width}x${height} reduced motion`;
    const { context, page } = await openRoom({
      me: MEMBER,
      viewport: { width, height },
      reducedMotion: true,
    });

    await page.waitForTimeout(600);
    const styles = await page.evaluate(runeStyles);

    expect(state, "there are runes to read", styles.length >= 24, true);
    expect(state, "no rune animates", [...new Set(styles.map((r) => r.name))], ["none"]);
    expect(state, "every rune rests at 0.35", [...new Set(styles.map((r) => r.opacity))], ["0.35"]);

    await context.close();
  }
}

await browser.close();
server.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("\nThe Viewing Room holds in every state.");
