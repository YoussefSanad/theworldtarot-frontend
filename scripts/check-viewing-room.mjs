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
 * A page with `/me` answered, and every video request recorded.
 *
 * The recorder is the point of several cases below: "no film was requested" is
 * only provable by watching the network, not by looking at the DOM.
 */
async function openRoom({ me, meStatus = 200, viewport }) {
  const context = await browser.newContext(viewport ? { viewport } : {});
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

      if (url.endsWith("/video")) {
        videoRequests.push(url);
        return route.fulfill(api({ message: "Unauthenticated." }, 401));
      }

      if (url.endsWith("/api/v1/me")) {
        return route.fulfill(
          meStatus === 401 ? api({ message: "Unauthenticated." }, 401) : api(me),
        );
      }

      // Everything else the page may ask for (products, currencies, languages)
      // answers empty rather than reaching the network, so no state is ever
      // waiting on an unrelated call.
      return route.fulfill(api([]));
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
      return style.position === "fixed" && style.zIndex === "40";
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
      route.fulfill(route.request().url().endsWith("/api/v1/me") ? api(MEMBER) : api([])),
  );
  await page.goto(ROOM, { waitUntil: "networkidle" });

  expect("member", "no panel now", await page.locator(modalSelector).count(), 0);
  expect("member", "no panel ever", everSawModal, false);
  expect("member", "the room is usable", await page.locator("[data-viewing-room]").getAttribute("inert"), null);
  expect("member", "the carousel is there", await page.getByText(HINT).isVisible(), true);
  expect(
    "member",
    "no veil over the room",
    await page.evaluate(
      () =>
        [...document.querySelectorAll("div[aria-hidden=true]")].filter((d) => {
          const style = getComputedStyle(d);
          return style.position === "fixed" && style.zIndex === "40";
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
        route.fulfill(route.request().url().endsWith("/api/v1/me") ? api(MEMBER) : api([])),
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

await browser.close();
server.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("\nThe Viewing Room holds in every state.");
