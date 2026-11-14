/**
 * Drives the two password pages (`/set-password/`, `/reset-password/`) for
 * #132: where the sign-in link goes after the page has done its job.
 *
 * `npm run build && npm run check:set-password` — serves `out/` and fakes the
 * API itself, so nothing here needs staging or a real customer.
 *
 * `token`, `email` and `next` are read independently from the query string. A
 * same-site `next` rides on to the sign-in link, on the done panel and on the
 * dead-link failure; a hostile or absent one leaves the link exactly `/login/`.
 * The write never carries `next`: it is ours, not the backend's.
 *
 * #150: a finished claim with a safe `next` signs in with the password just
 * chosen and goes straight there; if that sign in fails it falls back to the
 * done panel. Reset never signs in, and a claim with no safe `next` does not.
 * The shared signed-in state comes from the login response, never from a later
 * `/me` read; a visitor who already has a session is not signed in again; and
 * the claim form shows whose account is being claimed. A sign in only follows
 * a fresh `/me` that answers 401 right before it: when the page's own read or
 * that fresh one fails, hangs, or finds a customer, nobody is signed in and the
 * success screen carries the sign-in link instead.
 *
 * #177: since YoussefSanad/TheWorldTarot#124 the write itself signs the
 * customer in and answers login's customer body plus its `message`. On both
 * pages that answer is the signed-in customer: no `/login`, no `/me`, a safe
 * `next` or else `landingFor` (pass holder to the Viewing Room, everybody else
 * home), and a different customer already signed in is replaced. **Every #150
 * case above answers the write with `{ message }` alone, which is a backend from
 * before #124**, so they are the proof that this site still behaves as it did
 * against that backend.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const root = join(process.cwd(), "out");
/* 4322–4324 belong to the other checks. */
const PORT = 4325;
const ORIGIN = `http://localhost:${PORT}`;

const PASSWORD = 'main input[type="password"]';
const SUBMIT = 'main button[type="submit"]';
const ALERT = 'main [role="alert"]';
/* The sign-in link on either panel; both flows share this prompt wording. */
const SIGN_IN_LINK = 'main a[href^="/login/"]';

const TOKEN = "tok_abc123";
const EMAIL = "jane@example.com";
const NEXT = "/viewing-room/";
const HOSTILE = ["//evil.com", "https://evil.com", "javascript:alert(1)", "/.//evil.com"];

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
  if (!ok) {
    failures.push(`${state}: ${what} was ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);
  }

  console.log(`  ${ok ? "✓" : "✗"} ${what}: ${JSON.stringify(actual)}`);
}

function api(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    headers: {
      "Access-Control-Allow-Origin": ORIGIN,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Accept, X-XSRF-TOKEN",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: body === null ? "" : JSON.stringify(body),
  };
}

const DEAD_LINK = api(
  { message: "This password reset token is invalid.", errors: { token: ["This password reset token is invalid."] } },
  422,
);

const CUSTOMER = {
  id: 12,
  name: "Jane Doe",
  email: EMAIL,
  created_at: "2026-08-12T10:04:00+00:00",
  has_viewing_room_access: false,
};

const LOGIN_SUCCEEDS = api(CUSTOMER);

/* #177: a pass holder, and somebody else already signed in in the browser. */
const PASS_HOLDER = { ...CUSTOMER, has_viewing_room_access: true };
const SOMEONE_ELSE = {
  id: 99,
  name: "Someone Else",
  email: "someone@example.com",
  created_at: "2026-08-12T10:04:00+00:00",
  has_viewing_room_access: false,
};

/** A write from a backend with TheWorldTarot#124: it signed `customer` in. */
function signedInBy(customer) {
  return api({ ...customer, message: "Your account is ready. You can sign in now." });
}
const LOGIN_REFUSED = api(
  { message: "These credentials do not match our records.", errors: { email: ["These credentials do not match our records."] } },
  422,
);

/**
 * A page on `path` + `query`, with the write answered by `answer` and a sign in
 * answered by `login`. `login` defaults to a refusal, so a claim that tries to
 * sign in and fails still ends on the success screen.
 *
 * `options.alreadySignedIn` answers `/me` with a customer from the first read.
 * `options.meAfterLogin` is what `/me` does once a login has succeeded:
 * `"customer"` (default), `"fail"` (a 500) or `"hang"` (never answers).
 * `meAfterLogin` counts the `/me` requests made after that login.
 *
 * `options.me` scripts `/me` before any login: `load` is what it does until the
 * set-password write has been posted (the page's own read), `check` what it does
 * from then on (the fresh read right before a sign in). Each is `"unauthenticated"`
 * (401, default), `"customer"`, `"fail"` (500), `"abort"` (network failure) or
 * `"hang"` (never answers). `check` defaults to `load`; `alreadySignedIn` makes
 * `load` a customer. `counts.meAfterClaim` counts `/me` requests made once the
 * write has been posted and before a login has succeeded.
 *
 * #177: a write answering a customer body signs that customer in, as the
 * backend now does, and `/me` answers them from then on. `options.signedInAs`
 * is who `/me` answers for a session that existed before (default `CUSTOMER`).
 */
async function open(
  path,
  query,
  answer = api({ message: "ok" }),
  login = LOGIN_REFUSED,
  { alreadySignedIn = false, meAfterLogin = "customer", me = {}, signedInAs = CUSTOMER } = {},
) {
  const page = await browser.newPage();
  const sent = [];
  const logins = [];
  const counts = { meAfterLogin: 0, meAfterClaim: 0 };
  const meLoad = me.load ?? (alreadySignedIn ? "customer" : "unauthenticated");
  const meCheck = me.check ?? meLoad;
  let signedIn = alreadySignedIn;
  let loggedIn = false;
  let who = signedInAs;

  await page.route("**/sanctum/csrf-cookie", (route) => route.fulfill(api(null, 204)));
  await page.route("**/api/v1/me", (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill(api(null, 204));
    if (loggedIn) {
      counts.meAfterLogin += 1;
      if (meAfterLogin === "hang") return undefined;
      if (meAfterLogin === "fail") return route.fulfill(api({ message: "Server Error" }, 500));
    }

    if (!loggedIn) {
      const claimed = sent.length > 0;
      if (claimed) counts.meAfterClaim += 1;

      const mode = claimed ? meCheck : meLoad;
      if (mode === "hang") return undefined;
      if (mode === "abort") return route.abort();
      if (mode === "fail") return route.fulfill(api({ message: "Server Error" }, 500));
      if (mode === "customer") return route.fulfill(api(who));
      if (mode === "unauthenticated" && !signedIn) return route.fulfill(api({ message: "Unauthenticated." }, 401));
    }

    return route.fulfill(signedIn ? api(who) : api({ message: "Unauthenticated." }, 401));
  });
  await page.route("**/api/v1/login", (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill(api(null, 204));
    logins.push(JSON.parse(route.request().postData() ?? "null"));
    if (login.status < 400) {
      signedIn = true;
      loggedIn = true;
      who = CUSTOMER;
    }
    return route.fulfill(login);
  });
  for (const endpoint of ["set-password", "reset-password"]) {
    await page.route(`**/api/v1/${endpoint}`, (route) => {
      if (route.request().method() === "OPTIONS") return route.fulfill(api(null, 204));
      sent.push({ endpoint, body: JSON.parse(route.request().postData() ?? "null") });
      let answered = null;
      try {
        answered = JSON.parse(answer.body);
      } catch {
        /* Not JSON: the backend signed nobody in that this fake can see. */
      }
      if (answer.status < 400 && typeof answered?.email === "string") {
        who = { ...answered };
        delete who.message;
        signedIn = true;
        loggedIn = true;
      }
      return route.fulfill(answer);
    });
  }
  /* A hostile target must never reach the real network. */
  await page.route((url) => url.hostname === "evil.com", (route) => route.abort());
  /* A `/me` that never answers keeps the network from ever going idle. */
  const hangs = (me.load ?? "") === "hang";
  await page.goto(`${ORIGIN}${path}${query}`, { waitUntil: hangs ? "domcontentloaded" : "networkidle" });
  if (hangs) await page.waitForSelector(PASSWORD);

  return { page, sent, logins, counts };
}

async function submit(page, password = "a long new one") {
  const fields = page.locator(PASSWORD);
  await fields.nth(0).fill(password);
  await fields.nth(1).fill(password);
  await page.click(SUBMIT);
}

/** The sign-in link's href as a parsed URL, or `null` when nothing is drawn. */
async function signInLink(page) {
  try {
    await page.waitForSelector(SIGN_IN_LINK, { timeout: 2000 });
  } catch {
    return null;
  }

  return new URL(await page.getAttribute(SIGN_IN_LINK, "href"), ORIGIN);
}

function query({ token = TOKEN, email = EMAIL, next } = {}) {
  const params = new URLSearchParams();
  if (token !== null) params.set("token", token);
  if (email !== null) params.set("email", email);
  if (next !== undefined) params.set("next", next);
  return `?${params}`;
}

/** Asserts the link goes to sign in carrying `next`, or bare when it is `null`. */
function expectLink(state, link, next) {
  if (link === null) {
    expect(state, "a sign-in link is drawn", null, "a link");
    return;
  }

  expect(state, "the link goes to sign in", link.pathname, "/login/");
  expect(state, next === null ? "and carries no next" : "and carries where they were going", link.searchParams.get("next"), next);
  if (next === null) expect(state, "the href is exactly /login/", link.pathname + link.search, "/login/");
}

const FLOWS = [
  { name: "claim", path: "/set-password/", endpoint: "set-password" },
  { name: "reset", path: "/reset-password/", endpoint: "reset-password" },
];

for (const { name, path, endpoint } of FLOWS) {
  console.log(`\n${name}: a finished page offers sign in, and sign in remembers where they were going (#132)`);
  {
    const { page, sent } = await open(path, query({ next: NEXT }));
    await submit(page);
    await page.waitForSelector("main h1:has-text('ready'), main h1:has-text('changed')");

    expect(name, "the write goes to its own endpoint, once", sent.map((s) => s.endpoint), [endpoint]);
    expect(name, "and carries the link and the password unchanged, and no next", sent[0].body, {
      token: TOKEN,
      email: EMAIL,
      password: "a long new one",
      password_confirmation: "a long new one",
    });
    expectLink(`${name} done`, await signInLink(page), NEXT);
    await page.close();
  }

  console.log(`\n${name}: token, email and next are read independently`);
  {
    /* Order and an awkward email must not matter. */
    const { page, sent } = await open(path, `?next=%2Fviewing-room%2F&email=${encodeURIComponent("a+b@example.com")}&token=t%2Fk`);
    await submit(page);
    await page.waitForSelector("main h1:has-text('ready'), main h1:has-text('changed')");

    expect(name, "token and email arrive as sent", [sent[0].body.token, sent[0].body.email], ["t/k", "a+b@example.com"]);
    expectLink(`${name} reordered`, await signInLink(page), NEXT);
    await page.close();
  }

  console.log(`\n${name}: a refused submit keeps the form and the address`);
  {
    const { page } = await open(
      path,
      query({ next: NEXT }),
      api({ message: "The password field must be at least 12 characters.", errors: { password: ["too short"] } }, 422),
    );
    const before = page.url();
    await submit(page, "short");
    await page.waitForSelector("main p[id], main [role='alert']");

    expect(name, "the URL is unchanged", page.url(), before);
    expect(name, "the form is still there", await page.locator(PASSWORD).count(), 2);
    expect(name, "no sign-in link is offered for a field error", await page.locator(SIGN_IN_LINK).count(), 0);
    await page.close();
  }

  console.log(`\n${name}: a dead link's sign-in link carries next too`);
  {
    const { page } = await open(path, query({ next: NEXT }), DEAD_LINK);
    await submit(page);
    await page.waitForSelector(ALERT + ":not(:empty)");
    expectLink(`${name} dead (422 on token)`, await signInLink(page), NEXT);
    await page.close();
  }
  {
    const { page, sent } = await open(path, query({ token: null, next: NEXT }));
    await submit(page);
    await page.waitForSelector(ALERT + ":not(:empty)");
    expect(name, "a missing token never reaches the API", sent.length, 0);
    expectLink(`${name} dead (missing token)`, await signInLink(page), NEXT);
    await page.close();
  }

  console.log(`\n${name}: a hostile or absent next leaves the link as /login/`);
  for (const hostile of [...HOSTILE, undefined]) {
    const label = hostile === undefined ? "no next" : hostile;
    {
      const { page } = await open(path, query({ next: hostile }));
      await submit(page);
      await page.waitForSelector("main h1:has-text('ready'), main h1:has-text('changed')");
      expectLink(`${name} done, ${label}`, await signInLink(page), null);
      await page.close();
    }
    {
      const { page } = await open(path, query({ next: hostile }), DEAD_LINK);
      await submit(page);
      await page.waitForSelector(ALERT + ":not(:empty)");
      expectLink(`${name} dead, ${label}`, await signInLink(page), null);
      await page.close();
    }
  }
}

/*
  The masthead's account control, as in `check-login.mjs` — and both moved
  together.

  It was `header a[aria-label="Sign in"]` beside a `header span[title]`, and
  neither survives: the control is a dropdown trigger (a `button`, whose
  accessible name becomes the customer's own) and the name it used to print
  beside the mark now lives inside the panel. A nameless buyer's label is their
  address, which is far longer than the masthead row can spare.

  So `signIn` reads the trigger's name, and `name` opens the panel to read the
  account — leaving it exactly as it was found.
*/
const ACCOUNT_TRIGGER = 'header [data-account-menu="row"]';
const SIGNED_IN_NAME = 'header [aria-labelledby] p span[title]';

async function masthead(page) {
  const trigger = page.locator(ACCOUNT_TRIGGER);
  const label = (await trigger.count()) ? await trigger.getAttribute("aria-label") : null;

  if (label === null) return { signIn: 0, name: "" };
  if (label === "Sign in") return { signIn: 1, name: "" };

  const wasOpen = (await trigger.getAttribute("aria-expanded")) === "true";
  if (!wasOpen) await trigger.click();

  const name = (await page.locator(SIGNED_IN_NAME).count())
    ? (await page.locator(SIGNED_IN_NAME).first().textContent()).trim()
    : "";

  if (!wasOpen) await page.keyboard.press("Escape");

  return { signIn: 0, name };
}

const ORIGIN_PATH = (page) => new URL(page.url()).pathname;
const DONE = "main h1:has-text('ready'), main h1:has-text('changed')";

console.log("\nclaim: a safe next signs them in and goes straight there (#150)");
{
  const { page, sent, logins } = await open("/set-password/", query({ next: NEXT }), api({ message: "ok" }), LOGIN_SUCCEEDS);
  await submit(page);

  try {
    await page.waitForURL((url) => url.pathname.startsWith(NEXT), { timeout: 5000 });
  } catch {
    /* Reported by the assertions below. */
  }

  expect("claim signed in", "they land on where they were going", ORIGIN_PATH(page), NEXT);
  expect("claim signed in", "the sign in carries the pair they just chose and no device_name", logins, [
    { email: EMAIL, password: "a long new one" },
  ]);
  expect("claim signed in", "the password was set once", sent.map((s) => s.endpoint), ["set-password"]);
  await page.close();
}

console.log("\nclaim: a refused sign in falls back to the success screen (#150)");
{
  const { page, sent, logins } = await open("/set-password/", query({ next: NEXT }));
  await submit(page);
  await page.waitForSelector(DONE);

  expect("claim sign in refused", "a sign in was attempted", logins.length, 1);
  expect("claim sign in refused", "the password was set once", sent.map((s) => s.endpoint), ["set-password"]);
  expect("claim sign in refused", "they stay on the page", ORIGIN_PATH(page), "/set-password/");
  expectLink("claim sign in refused", await signInLink(page), NEXT);
  await page.close();
}

console.log("\nclaim: a hostile next never signs in or leaves the page (#150)");
for (const hostile of HOSTILE) {
  const { page, logins } = await open("/set-password/", query({ next: hostile }), api({ message: "ok" }), LOGIN_SUCCEEDS);
  await submit(page);
  await page.waitForSelector(DONE);

  expect("claim hostile", `${hostile}: no sign in is attempted`, logins.length, 0);
  expect("claim hostile", `${hostile}: they stay on the page`, ORIGIN_PATH(page), "/set-password/");
  expect("claim hostile", `${hostile}: the success screen is shown`, await page.locator("main h1:has-text('ready')").count(), 1);
  await page.close();
}

console.log("\nclaim: no next keeps the success screen, against a backend before TheWorldTarot#124 (#150)");
{
  const { page, logins } = await open("/set-password/", query(), api({ message: "ok" }), LOGIN_SUCCEEDS);
  await submit(page);
  await page.waitForSelector(DONE);

  expect("claim no next", "no sign in is attempted", logins.length, 0);
  expect("claim no next", "they stay on the page", ORIGIN_PATH(page), "/set-password/");
  expect("claim no next", "the success screen is shown", await page.locator("main h1:has-text('ready')").count(), 1);
  expectLink("claim no next", await signInLink(page), null);
  await page.close();
}

console.log("\nreset: no second sign in, against a backend before TheWorldTarot#124 (#150, #177)");
{
  const { page, logins } = await open("/reset-password/", query({ next: NEXT }), api({ message: "ok" }), LOGIN_SUCCEEDS);
  await submit(page);
  await page.waitForSelector(DONE);

  expect("reset", "no sign in is attempted", logins.length, 0);
  expect("reset", "they stay on the page", ORIGIN_PATH(page), "/reset-password/");
  expect("reset", "the changed screen is shown", await page.locator("main h1:has-text('changed')").count(), 1);
  expectLink("reset", await signInLink(page), NEXT);
  await page.close();
}

console.log("\nboth: the form shows whose account the link names (#150, #177)");
for (const { name, path } of FLOWS) {
  for (const [label, next] of [["with next", NEXT], ["without next", undefined]]) {
    const { page } = await open(path, query({ next }));
    await page.waitForSelector(PASSWORD);

    const text = await page.locator("main").innerText();
    expect(`${name} email shown`, `${label}: the visible page text includes the email`, text.includes(EMAIL), true);
    await page.close();
  }
}

console.log("\nclaim: the signed-in state is the login response, not a later /me read (#150)");
for (const meAfterLogin of ["fail", "hang"]) {
  const { page, logins, counts } = await open(
    "/set-password/",
    query({ next: NEXT }),
    api({ message: "ok" }),
    LOGIN_SUCCEEDS,
    { meAfterLogin },
  );
  const state = `claim /me ${meAfterLogin}s after login`;
  await submit(page);

  try {
    await page.waitForURL((url) => url.pathname.startsWith(NEXT), { timeout: 5000 });
    await page.waitForLoadState("networkidle");
  } catch {
    /* Reported by the assertions below. */
  }

  expect(state, "a sign in was attempted once", logins.length, 1);
  expect(state, "they land on where they were going", ORIGIN_PATH(page), NEXT);
  expect(state, "the masthead shows the customer from the login response", await masthead(page), {
    signIn: 0,
    name: CUSTOMER.name,
  });
  expect(state, "no /me read was needed after the login", counts.meAfterLogin, 0);
  await page.close();
}

console.log("\nclaim: a visitor who already has a session is not signed in again (#150)");
{
  const { page, sent, logins } = await open(
    "/set-password/",
    query({ next: NEXT }),
    api({ message: "ok" }),
    LOGIN_SUCCEEDS,
    { alreadySignedIn: true },
  );
  await submit(page);

  try {
    await page.waitForSelector(DONE, { timeout: 5000 });
  } catch {
    /* Reported by the assertions below. */
  }

  expect("claim already signed in", "no sign in is attempted", logins.length, 0);
  expect("claim already signed in", "the password was set once", sent.map((s) => s.endpoint), ["set-password"]);
  expect("claim already signed in", "they stay on the page", ORIGIN_PATH(page), "/set-password/");
  expect("claim already signed in", "the success screen is shown", await page.locator("main h1:has-text('ready')").count(), 1);
  expectLink("claim already signed in", await signInLink(page), NEXT);
  await page.close();
}

console.log("\nclaim: a safe next signs in only when /me answers 401 right before it (#150)");
{
  const { page, sent, logins, counts } = await open(
    "/set-password/",
    query({ next: NEXT }),
    api({ message: "ok" }),
    LOGIN_SUCCEEDS,
    { me: { load: "unauthenticated", check: "unauthenticated" } },
  );
  await submit(page);

  try {
    await page.waitForURL((url) => url.pathname.startsWith(NEXT), { timeout: 5000 });
    await page.waitForLoadState("networkidle");
  } catch {
    /* Reported by the assertions below. */
  }

  expect("claim /me 401 twice", "the password was set once", sent.map((s) => s.endpoint), ["set-password"]);
  expect("claim /me 401 twice", "/me was read again after the write, before the sign in", counts.meAfterClaim >= 1, true);
  expect("claim /me 401 twice", "the sign in carries the pair they just chose", logins, [
    { email: EMAIL, password: "a long new one" },
  ]);
  expect("claim /me 401 twice", "they land on where they were going", ORIGIN_PATH(page), NEXT);
  expect("claim /me 401 twice", "the masthead shows the customer from the login response", await masthead(page), {
    signIn: 0,
    name: CUSTOMER.name,
  });
  await page.close();
}

console.log("\nclaim: a failed initial /me never signs in, and falls back to the success screen (#150)");
for (const load of ["fail", "abort"]) {
  const state = `claim initial /me ${load === "fail" ? "500" : "aborted"}`;
  const { page, sent, logins } = await open(
    "/set-password/",
    query({ next: NEXT }),
    api({ message: "ok" }),
    LOGIN_SUCCEEDS,
    { me: { load } },
  );
  await submit(page);

  try {
    await page.waitForSelector(DONE, { timeout: 5000 });
  } catch {
    /* Reported by the assertions below. */
  }

  expect(state, "no sign in is attempted", logins.length, 0);
  expect(state, "the password was set once", sent.map((s) => s.endpoint), ["set-password"]);
  expect(state, "they stay on the page", ORIGIN_PATH(page), "/set-password/");
  expect(state, "the success screen is shown", await page.locator("main h1:has-text('ready')").count(), 1);
  expectLink(state, await signInLink(page), NEXT);
  await page.close();
}

console.log("\nclaim: an initial /me that never answers never signs in (#150)");
{
  /* The app gives /me 8s; this waits a few seconds, not that long, so only the
     absence of a sign in and of a redirect is asserted, not the fallback screen. */
  const { page, sent, logins } = await open(
    "/set-password/",
    query({ next: NEXT }),
    api({ message: "ok" }),
    LOGIN_SUCCEEDS,
    { me: { load: "hang" } },
  );
  await submit(page);
  await page.waitForTimeout(3000);

  expect("claim initial /me hangs", "no sign in is attempted", logins.length, 0);
  expect("claim initial /me hangs", "the password was set once", sent.map((s) => s.endpoint), ["set-password"]);
  expect("claim initial /me hangs", "they have not been sent on to where they were going", ORIGIN_PATH(page), "/set-password/");
  await page.close();
}

console.log("\nclaim: a session from another tab, found by the fresh /me, is not replaced (#150)");
{
  const { page, sent, logins, counts } = await open(
    "/set-password/",
    query({ next: NEXT }),
    api({ message: "ok" }),
    LOGIN_SUCCEEDS,
    { me: { load: "unauthenticated", check: "customer" } },
  );
  await submit(page);

  try {
    await page.waitForSelector(DONE, { timeout: 5000 });
  } catch {
    /* Reported by the assertions below. */
  }

  expect("claim other tab", "/me was read again after the write", counts.meAfterClaim >= 1, true);
  expect("claim other tab", "no sign in is attempted", logins.length, 0);
  expect("claim other tab", "the password was set once", sent.map((s) => s.endpoint), ["set-password"]);
  expect("claim other tab", "they stay on the page", ORIGIN_PATH(page), "/set-password/");
  expect("claim other tab", "the success screen is shown", await page.locator("main h1:has-text('ready')").count(), 1);
  expectLink("claim other tab", await signInLink(page), NEXT);
  await page.close();
}

/*
  #177. The backend signs the customer in on the write and answers who.
*/

async function landsOn(page, path) {
  try {
    await page.waitForURL((url) => url.pathname === path, { timeout: 5000 });
    await page.waitForLoadState("networkidle");
  } catch {
    /* Reported by the assertions that follow. */
  }
}

for (const { name, path, endpoint } of FLOWS) {
  console.log(`\n${name}: the backend signs them in, and a safe next is where they land (#177)`);
  {
    const { page, sent, logins, counts } = await open(path, query({ next: NEXT }), signedInBy(CUSTOMER), LOGIN_SUCCEEDS);
    const state = `${name} signed in by the write`;
    await submit(page);
    await landsOn(page, NEXT);

    expect(state, "they land on where they were going", ORIGIN_PATH(page), NEXT);
    expect(state, "the password was set once", sent.map((s) => s.endpoint), [endpoint]);
    expect(state, "no second sign in is made", logins.length, 0);
    expect(state, "no /me read was needed after the write", counts.meAfterLogin, 0);
    expect(state, "the masthead shows the customer the write answered", await masthead(page), {
      signIn: 0,
      name: CUSTOMER.name,
    });
    expect(state, "the address bar keeps no token or email", new URL(page.url()).search, "");
    await page.close();
  }

  console.log(`\n${name}: no next goes where a freshly signed-in customer goes (#177)`);
  for (const [who, landing] of [[PASS_HOLDER, "/viewing-room/"], [CUSTOMER, "/"]]) {
    const state = `${name} no next, ${who.has_viewing_room_access ? "pass holder" : "no pass"}`;
    const { page, logins } = await open(path, query(), signedInBy(who), LOGIN_SUCCEEDS);
    await submit(page);
    await landsOn(page, landing);

    expect(state, "they land where landingFor sends them", ORIGIN_PATH(page), landing);
    expect(state, "no second sign in is made", logins.length, 0);
    await page.close();
  }

  console.log(`\n${name}: a hostile next is ignored, and they land where landingFor sends them (#177)`);
  for (const hostile of HOSTILE) {
    const state = `${name} signed in, next ${hostile}`;
    const { page } = await open(path, query({ next: hostile }), signedInBy(PASS_HOLDER), LOGIN_SUCCEEDS);
    await submit(page);
    await landsOn(page, "/viewing-room/");

    expect(state, "they stay on this site", new URL(page.url()).origin, ORIGIN);
    expect(state, "and land in the Viewing Room, not the hostile target", ORIGIN_PATH(page), "/viewing-room/");
    await page.close();
  }

  console.log(`\n${name}: somebody else signed in in this browser is replaced (#177)`);
  {
    const state = `${name} replaces someone else`;
    const { page, logins } = await open(path, query({ next: NEXT }), signedInBy(CUSTOMER), LOGIN_SUCCEEDS, {
      alreadySignedIn: true,
      signedInAs: SOMEONE_ELSE,
    });
    expect(state, "before: the masthead shows the other customer", await masthead(page), {
      signIn: 0,
      name: SOMEONE_ELSE.name,
    });
    await submit(page);
    await landsOn(page, NEXT);

    expect(state, "they land on where they were going", ORIGIN_PATH(page), NEXT);
    expect(state, "no second sign in is made", logins.length, 0);
    expect(state, "after: the masthead shows the customer the link named", await masthead(page), {
      signIn: 0,
      name: CUSTOMER.name,
    });
    await page.close();
  }

  console.log(`\n${name}: a dead link is still a dead link (#177)`);
  {
    const state = `${name} dead link`;
    const { page, logins } = await open(path, query({ next: NEXT }), DEAD_LINK, LOGIN_SUCCEEDS);
    await submit(page);
    await page.waitForSelector(ALERT + ":not(:empty)");

    expect(state, "they stay on the page", ORIGIN_PATH(page), path);
    expect(state, "no sign in is attempted", logins.length, 0);
    expect(state, "the masthead still offers sign in", await masthead(page), { signIn: 1, name: "" });
    expectLink(state, await signInLink(page), NEXT);
    await page.close();
  }

  console.log(`\n${name}: a success whose answer cannot be read is still a success (#177)`);
  {
    const state = `${name} unreadable 200`;
    const unreadable = { ...api(null), body: "<html>a proxy page</html>", contentType: "text/html" };
    const { page, sent } = await open(path, query({ next: NEXT }), unreadable);
    await submit(page);

    try {
      await page.waitForSelector(DONE, { timeout: 5000 });
    } catch {
      /* Reported by the assertions below. */
    }

    expect(state, "the password was set once", sent.map((s) => s.endpoint), [endpoint]);
    expect(state, "the success screen is shown", await page.locator(DONE).count(), 1);
    expect(state, "no error claims the password was not set", await page.locator(ALERT + ":not(:empty)").count(), 0);
    expectLink(state, await signInLink(page), NEXT);
    await page.close();
  }
}

await browser.close();
server.close();

if (failures.length > 0) {
  console.log(`\n${failures.length} failed:\n${failures.map((line) => `  ✗ ${line}`).join("\n")}`);
  process.exit(1);
}

console.log("\nThe password pages send people back to sign in, and on to where they were going.");
