/**
 * Drives the sign in page through everything #49 asks of it, in a real browser
 * against the real export.
 *
 * `npm run build && npm run check:login` — serves `out/` and answers the member
 * account endpoints itself, so nothing here needs a staging session or a real
 * customer.
 *
 * It exists for the same reason `check-panel.mjs` does: **none of the criteria
 * on that ticket can be checked by the type checker or by `node --test`.** That
 * a wrong password, an unknown address and an unclaimed account are one
 * sentence on screen; that six tries answer the wait instead of the refusal;
 * that asking for a link reads identically for an address we have and one we do
 * not; that the masthead changes when somebody signs in and changes back when
 * they leave. Every one of them is a fact about a laid-out page and the
 * requests it makes.
 *
 * **The sentences below are copied from `src/content/login.ts` deliberately.**
 * The point of most of these states is the exact words a person reads — a check
 * that imported them could not tell the difference between the page rendering
 * the right string and the page rendering whatever the string had become.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const root = join(process.cwd(), "out");
/* 4322 is `check-confirmation.mjs`'s. Its own, so the two can run at once. */
const PORT = 4323;
const LOGIN = `http://localhost:${PORT}/login/`;

/*
  The masthead's account control, which is a dropdown trigger rather than a
  link since the account menu landed.

  **`data-account-menu` rather than the label or the element.** This used to be
  `header a[aria-label="Sign in"]`, and both halves of that stopped being true:
  it is a `button` now, and its accessible name is the customer's own once
  somebody is signed in. The attribute is the hook the component carries for
  exactly this, the way `LocaleMenu` and the checkout button do — the words are
  copy, and copy changes.

  `="row"` is the desktop rendering. `SiteHeader` draws a second one inside the
  mobile drawer with `="drawer"`, and only one of the two is on screen at a
  time, so an unqualified attribute selector would match both.
*/
const ACCOUNT_TRIGGER = 'header [data-account-menu="row"]';
/*
  The account's name, which lives **inside the open panel** and no longer beside
  the trigger. The masthead printed it next to the mark until the panel took
  the job over: a nameless buyer's label is their address, far longer than the
  row can spare, and it arrived truncated and shoving its neighbours about.
  Reading it now costs a press, which is the trade.
*/
const SIGNED_IN_NAME = 'header [aria-labelledby] p span[title]';
/*
  Signing out, which is two presses now: the control, then the confirmation.

  **Both buttons read exactly "Sign out"** — `loginCopy.menu.signOut` and
  `signOutConfirm.confirm` are the same two words, deliberately, because the
  second is the first carried out. They are never on screen together, since the
  confirmation replaces the contents it was opened from, so one text selector
  would do for both; they are named apart here so a test reads as the two steps
  a person takes. `text-is` rather than `has-text` to avoid also matching the
  question above them, which contains the same words.
*/
/*
  Signing out is one button that confirms itself: pressed once it arms —
  the word fades to a door mark and the glow turns amber — and pressed again
  it goes. There is no second control to cancel with; it disarms on a timer.

  Matched on `data-sign-out` rather than on its text, because the text is one
  of three stacked faces and is `opacity-0` in two of them. The attribute also
  carries which face is showing, so the middle state can be asserted rather
  than guessed at from a colour.
*/
const SIGN_OUT = "header [data-sign-out]";
const SIGN_OUT_ARMED = 'header [data-sign-out="armed"]';

/*
  Every one of these is scoped to `main`, and both scopes are load-bearing
  rather than tidiness. `SiteFooter`'s newsletter carries its own
  `input[type="email"]`, so an unscoped field selector counts and fills the
  wrong form. And Next's route announcer — `#__next-route-announcer__` — is a
  `role="alert"` element that is already in the document before anything is
  submitted, so an unscoped `waitForSelector` returns at once on an empty div
  and reads "" instead of waiting for the page to say something.
*/
const EMAIL = 'main input[type="email"]';
const PASSWORD = 'main input[type="password"]';
const SUBMIT = 'main button[type="submit"]';
const ALERT = 'main [role="alert"]';
const FORGOT = 'main button:has-text("Forgotten your password?")';

const CUSTOMER = {
  id: 12,
  name: "Jane Doe",
  email: "jane@example.com",
  created_at: "2026-08-12T10:04:00+00:00",
  has_viewing_room_access: false,
};

/*
  A buyer who claimed the account checkout made for them, which is the ordinary
  paying customer rather than an edge case: nothing on the hosted page road asks
  a name, so `YoussefSanad/TheWorldTarot#52` made the backend answer `null`
  instead of inventing one from the address.

  `node --test` proves what `customerLabel` answers. What it cannot reach is
  this: that the masthead draws the answer rather than an empty span beside a
  link, which is how the backend's defect was reported in the first place.
*/
const NAMELESS = { ...CUSTOMER, id: 31, name: null, email: "jennifer@example.com" };

/** `src/content/login.ts`, verbatim. */
const REFUSED =
  "Those details do not sign you in. If you bought a reading and have not chosen a password yet, ask for a link below and choose one now.";
const BRIEFLY = "That is a few too many tries. Wait a moment and try once more.";
const INVALID_ADDRESS = "That does not look like an email address. Check it and try again.";
const ASKED =
  "If we have an account for that address, a link is on its way. Look for it in the next few minutes.";

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

/**
 * A fulfilled cross-origin answer. The API is on another origin, so a reply
 * with no `Access-Control-Allow-Origin` reaches the page as a network failure
 * and every state below would read as `unknownFailure`.
 */
function api(body, status = 200, headers = {}) {
  return {
    status,
    contentType: "application/json",
    headers: {
      "Access-Control-Allow-Origin": `http://localhost:${PORT}`,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Accept, X-XSRF-TOKEN",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      ...headers,
    },
    body: body === null ? "" : JSON.stringify(body),
  };
}

/**
 * A page with the account endpoints answered.
 *
 * `me` is a function rather than a value because it changes underneath a single
 * page: nobody signed in is a 401, and the same tab after a sign in is a customer.
 */
async function open({ login, me = () => api({ message: "Unauthenticated." }, 401) } = {}) {
  const page = await browser.newPage();
  const sent = [];

  await page.route("**/sanctum/csrf-cookie", (route) => route.fulfill(api(null, 204)));
  await page.route("**/api/v1/me", (route) => route.fulfill(me()));
  await page.route("**/api/v1/logout", (route) => route.fulfill(api(null, 204)));
  await page.route("**/api/v1/login", (route) => {
    sent.push({ path: "/login", body: JSON.parse(route.request().postData() ?? "null") });
    return route.fulfill(login ?? api(CUSTOMER));
  });
  await page.route("**/api/v1/forgot-password", (route) => {
    sent.push({ path: "/forgot-password", body: JSON.parse(route.request().postData() ?? "null") });
    /* Always 200 and always the same body, whatever the address. */
    return route.fulfill(
      api({ message: "If we have an account for that address, a reset link is on its way." }),
    );
  });

  return { page, sent };
}

async function signIn(page, { email = "jane@example.com", password = "a long one" } = {}) {
  await page.fill(EMAIL, email);
  await page.fill(PASSWORD, password);
  await page.click(SUBMIT);
}

/**
 * What the masthead is drawing, in one shape for either state.
 *
 * `signIn` reads the trigger's name rather than counting a link, because the
 * control is always present now and its *name* is what says which state it is
 * in — `aria-label` is the customer's own once there is a session.
 *
 * **`signOut` counts a real control, which means opening the panel.** A review
 * caught an earlier version deriving it from the same label as `signIn`, so it
 * only ever meant "the name is not 'Sign in'" — a build that drew the signed-in
 * panel with no way out of it would still have reported a sign out and passed.
 * The panel is left exactly as it was found, so a caller that was not expecting
 * it to open does not see one.
 */
async function masthead(page) {
  const trigger = page.locator(ACCOUNT_TRIGGER);
  const label = (await trigger.count()) ? await trigger.getAttribute("aria-label") : null;

  if (label === null) return { signIn: 0, name: "", signOut: 0 };
  if (label === "Sign in") return { signIn: 1, name: "", signOut: 0 };

  /* Both the name and the way out are behind the panel now, so one open
     answers for both rather than opening twice. */
  const wasOpen = (await trigger.getAttribute("aria-expanded")) === "true";
  if (!wasOpen) await trigger.click();

  const signOut = await page.locator(SIGN_OUT).count();
  const name = (await page.locator(SIGNED_IN_NAME).count())
    ? (await page.locator(SIGNED_IN_NAME).first().textContent()).trim()
    : "";

  if (!wasOpen) await page.keyboard.press("Escape");

  return { signIn: 0, name, signOut };
}

console.log("\nthe page exists and the masthead reaches it");
{
  const { page } = await open();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });

  /*
    **The masthead opens a panel rather than going to a page.** It was a link to
    `/login/` until the account menu landed, and the panel is the point: a
    visitor signs in without leaving whatever they were reading.
  */
  expect("signed out", "the masthead's account control is a button, not a link",
    await page.locator('header a[aria-label="Sign in"]').count(), 0);

  await page.click(ACCOUNT_TRIGGER);
  await page.waitForSelector(`header ${PASSWORD.replace("main ", "")}`);
  expect("signed out", "it opens a panel in place", page.url(), `http://localhost:${PORT}/`);
  expect("signed out", "which asks for an address and a password",
    await page.locator(`header input[type="email"], header input[type="password"]`).count(), 2);

  /* The page is still there for the links that arrive cold. */
  await page.goto(LOGIN, { waitUntil: "networkidle" });
  expect("signed out", "and the page still exists for a link to reach",
    await page.locator(`${EMAIL}, ${PASSWORD}`).count(), 2);
  await page.close();
}

console.log("\na claimed account signs in, and the masthead says so");
{
  let signedIn = false;
  const { page, sent } = await open({ me: () => (signedIn ? api(CUSTOMER) : api({ message: "Unauthenticated." }, 401)) });
  await page.goto(LOGIN, { waitUntil: "networkidle" });

  expect("signing in", "the masthead starts on the signed-out icon", await masthead(page), {
    signIn: 1, name: "", signOut: 0,
  });

  await signIn(page);
  /* `landingFor`: no pass on this fixture, so the homepage. `/readings/` was
     where everybody landed before the landing rule existed. */
  await page.waitForURL(`http://localhost:${PORT}/`);
  signedIn = true;

  /*
    `device_name` is the whole of the choice between the two authentication
    styles: sending it hands this browser a bearer token and no session cookie,
    so the sign in would look like it worked and the next page load would be a
    stranger.
  */
  expect("signing in", "the write carries the pair and nothing else", sent, [
    { path: "/login", body: { email: "jane@example.com", password: "a long one" } },
  ]);
  expect("signing in", "and lands where the landing rule sends somebody with no pass",
    page.url(), `http://localhost:${PORT}/`);
  expect("signing in", "the masthead now shows the customer", await masthead(page), {
    signIn: 0, name: "Jane Doe", signOut: 1,
  });

  /*
    Signing out is three presses now: open the panel, ask, confirm. The
    confirmation is deliberate — the control sits one slip away from a
    customer's own name, in a panel they opened to read it.
  */
  await page.click(ACCOUNT_TRIGGER);
  await page.click(SIGN_OUT);
  await page.waitForSelector(SIGN_OUT_ARMED);
  /*
    **The account line is still there, and that is the point.** The
    confirmation used to replace it with a question, which took away the one
    thing the panel exists to show — which account is signed in — at the exact
    moment somebody was deciding whether to leave it. The button now carries
    its own confirmation instead: it arms in place, the line never moves.
  */
  expect("signing out", "asks before it acts, without taking the account away", await masthead(page), {
    signIn: 0, name: "Jane Doe", signOut: 1,
  });

  await page.click(SIGN_OUT);
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.getAttribute("aria-label") === "Sign in",
    ACCOUNT_TRIGGER,
  );
  expect("signing out", "and goes back to offering a sign in", await masthead(page), {
    signIn: 1, name: "", signOut: 0,
  });

  /* The session really is gone: a fresh load asks again and is told no. */
  signedIn = false;
  await page.reload({ waitUntil: "networkidle" });
  expect("signing out", "which survives a reload", await masthead(page), { signIn: 1, name: "", signOut: 0 });
  await page.close();
}

console.log("\na buyer with no name is still somebody, and the masthead says who");
{
  let signedIn = false;
  const { page } = await open({
    login: api(NAMELESS),
    me: () => (signedIn ? api(NAMELESS) : api({ message: "Unauthenticated." }, 401)),
  });
  await page.goto(LOGIN, { waitUntil: "networkidle" });

  await signIn(page, { email: "jennifer@example.com" });
  /* `landingFor`: no pass on this fixture, so the homepage. `/readings/` was
     where everybody landed before the landing rule existed. */
  await page.waitForURL(`http://localhost:${PORT}/`);
  signedIn = true;
  /* Waiting on the trigger's own name rather than on a sign-out button: that
     one lives inside the panel now and does not exist until it is opened. */
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.getAttribute("aria-label") !== "Sign in",
    ACCOUNT_TRIGGER,
  );

  expect("no name", "the masthead falls back to the address", await masthead(page), {
    signIn: 0, name: "jennifer@example.com", signOut: 1,
  });

  /*
    Both halves matter, and they moved into the panel with the name itself.
    The slot must not be blank, and it must not read "null" — the wire says
    `null` for a buyer who was never asked a name, and a component that
    interpolated it would put that word in front of every claimed customer on
    the site. The risk did not go away when the header stopped printing the
    label; it followed the label into the panel, so the guard follows too.
  */
  await page.click(ACCOUNT_TRIGGER);
  await page.waitForSelector(SIGNED_IN_NAME);

  const title = await page.getAttribute(SIGNED_IN_NAME, "title");
  expect("no name", "and its title is the same string rather than empty", title, "jennifer@example.com");
  expect("no name", "the word null is nowhere in the panel", (await page.textContent("header")).includes("null"), false);

  await page.click(SIGN_OUT);
  await page.click(SIGN_OUT);
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.getAttribute("aria-label") === "Sign in",
    ACCOUNT_TRIGGER,
  );
  expect("no name", "and they can still leave", await masthead(page), { signIn: 1, name: "", signOut: 0 });
  await page.close();
}

console.log("\nthree different refusals, one sentence");
{
  /*
    The backend answers a wrong password, an address with no account, and an
    account whose owner has never chosen a password with the same status and the
    same message, and says it will not change. So the page cannot tell them
    apart — and this is the check that it never starts trying to.
  */
  const refusal = api(
    { message: "These credentials do not match our records.", errors: { email: ["These credentials do not match our records."] } },
    422,
  );
  const read = [];

  for (const attempt of ["a wrong password", "an address with no account", "an account never claimed"]) {
    const { page } = await open({ login: refusal });
    await page.goto(LOGIN, { waitUntil: "networkidle" });
    await signIn(page, { email: `${attempt.replace(/\s/g, "-")}@example.com` });
    await page.waitForSelector(ALERT);

    read.push((await page.textContent(ALERT)).trim());
    expect("refused", `${attempt} stays on the page`, page.url(), LOGIN);
    expect("refused", "and nothing is said against a field", await page.locator(`${EMAIL} + p, ${PASSWORD} + p`).count(), 0);
    await page.close();
  }

  expect("refused", "all three read the same", new Set(read).size, 1);
  expect("refused", "and it is the wording that names none of them", read[0], REFUSED);
}

console.log("\ntoo many tries answers the wait");
{
  /*
    Both arms are checked because the wait only reaches the page when the API
    says it may, and that is a backend setting rather than anything this page
    controls.

    `Retry-After` is not one of the seven CORS-safelisted response headers, so
    a cross-origin caller reads it only when the answer carries
    `Access-Control-Expose-Headers: Retry-After`. The backend now sends it —
    `config/cors.php` has `'exposed_headers' => ['Retry-After']`, added
    29 August 2026 for this ticket — so the second arm is the behaviour a
    rate-limited customer gets against staging, and it is the one #49 asks for.

    The first arm stays because the exposure is one line in another repo and
    nothing in this one would notice its removal. It is also what a customer
    reads whenever the header is simply absent, which the seam treats as
    ordinary. Losing the seconds must degrade to a sentence that still reads as
    a wait rather than to the refusal, and that is what it asserts.
  */
  const tooMany = { message: "Too Many Attempts." };

  {
    const { page } = await open({ login: api(tooMany, 429, { "Retry-After": "41" }) });
    await page.goto(LOGIN, { waitUntil: "networkidle" });
    await signIn(page);
    await page.waitForSelector(ALERT);

    const said = (await page.textContent(ALERT)).trim();
    expect("rate limited", "a wait the browser cannot read is still a wait", said, BRIEFLY);
    expect("rate limited", "and never the refusal", said === REFUSED, false);
    await page.close();
  }

  {
    const { page } = await open({
      login: api(tooMany, 429, {
        "Retry-After": "41",
        "Access-Control-Expose-Headers": "Retry-After",
      }),
    });
    await page.goto(LOGIN, { waitUntil: "networkidle" });
    await signIn(page);
    await page.waitForSelector(ALERT);

    const said = (await page.textContent(ALERT)).trim();
    expect("rate limited", "and one it can read names the seconds", said, "That is a few too many tries. Try again in 41 seconds.");
    expect("rate limited", "which is also never the refusal", said === REFUSED, false);
    await page.close();
  }
}

console.log("\nasking for a link says the same thing about every address");
{
  const read = [];
  const asked = [];

  for (const email of ["jane@example.com", "nobody-here@example.com"]) {
    const { page, sent } = await open();
    await page.goto(LOGIN, { waitUntil: "networkidle" });
    await page.click(FORGOT);

    expect("asking", `${email}: the password field is gone`, await page.locator(PASSWORD).count(), 0);

    await page.fill(EMAIL, email);
    await page.click(SUBMIT);
    await page.waitForSelector("main p");
    await page.waitForFunction((wanted) => document.body.textContent.includes(wanted), ASKED);

    read.push((await page.textContent("main p")).trim());
    asked.push(sent.at(-1));
    await page.close();
  }

  expect("asking", "the address goes on its own", asked.map((call) => call.path), ["/forgot-password", "/forgot-password"]);
  expect("asking", "an address we have and one we do not read identically", new Set(read).size, 1);
  expect("asking", "and it never claims anything was sent", read[0], ASKED);
}

console.log("\na mistyped address is answered by the panel that asked for it");
{
  /*
    The one refusal this panel can draw, and it used to draw the sign in's.

    `ForgotPasswordRequest` validates `email` as `required|string|email` and
    carries no `exists` rule on purpose, so a malformed address is the only 422
    this endpoint answers. The form sets `noValidate`, so the browser does not
    stop it first, and `readSignInFailure` reads every 422 not keyed to
    `password` as the vague refusal — which on this panel meant a person who
    mistyped their address was told "those details do not sign you in… ask for
    a link below", on a form with no password field, about the link they had
    just asked for.
  */
  const { page } = await open();
  await page.route("**/api/v1/forgot-password", (route) =>
    route.fulfill(
      api(
        {
          message: "The email field must be a valid email address.",
          errors: { email: ["The email field must be a valid email address."] },
        },
        422,
      ),
    ),
  );

  await page.goto(LOGIN, { waitUntil: "networkidle" });
  await page.click(FORGOT);
  await page.fill(EMAIL, "not-an-address");
  await page.click(SUBMIT);
  await page.waitForSelector(ALERT);

  const said = (await page.textContent(ALERT)).trim();
  expect("mistyped", "the panel answers about the address", said, INVALID_ADDRESS);
  expect("mistyped", "and never the sign in's refusal", said === REFUSED, false);
  await page.close();
}

console.log("\nthe page returns somebody to where they were sent from");
{
  /*
    `?next=` is the half of this road that survives the dropdown: a visitor who
    arrives at the page from a link — a mail, or the paywall on a phone — still
    has to be put back where they came from. `lib/return-path.ts` decides what
    counts; these are the two answers a person actually sees.
  */
  const { page } = await open();
  await page.goto(`${LOGIN}?next=/library/`, { waitUntil: "networkidle" });
  await signIn(page);
  await page.waitForURL(`http://localhost:${PORT}/library/`);
  expect("return path", "a signed-out visitor is sent on to the next they carried",
    page.url(), `http://localhost:${PORT}/library/`);
  await page.close();
}

{
  /* A `next` that leaves this site is refused, and the landing rule answers
     instead — the page must never be a way to bounce somebody off the domain. */
  const { page } = await open();
  await page.goto(`${LOGIN}?next=https://elsewhere.example/`, { waitUntil: "networkidle" });
  await signIn(page);
  await page.waitForURL(`http://localhost:${PORT}/`);
  expect("return path", "and an off-site next is dropped for the default",
    page.url(), `http://localhost:${PORT}/`);
  await page.close();
}

{
  /*
    **Already signed in, with a next: go straight there.** Somebody sent them
    here to get somewhere and they already hold the right to be there, so making
    them type a password they have already typed would be asking twice.
  */
  const { page } = await open({ me: () => api(CUSTOMER) });
  await page.goto(`${LOGIN}?next=/library/`, { waitUntil: "networkidle" });
  await page.waitForURL(`http://localhost:${PORT}/library/`);
  expect("return path", "a signed-in visitor with a next skips the form",
    page.url(), `http://localhost:${PORT}/library/`);
  await page.close();
}

{
  /*
    **Already signed in, without one: draw the form.** The only reason to open
    `/login/` while signed in is to become somebody else, so a redirect here
    would take away the one thing they came for.
  */
  const { page } = await open({ me: () => api(CUSTOMER) });
  await page.goto(LOGIN, { waitUntil: "networkidle" });
  await page.waitForSelector(EMAIL);
  expect("return path", "a signed-in visitor with no next still gets the form",
    page.url(), LOGIN);
  expect("return path", "which is how they switch accounts",
    await page.locator(`${EMAIL}, ${PASSWORD}`).count(), 2);
  await page.close();
}

await browser.close();
server.close();

if (failures.length > 0) {
  console.log(`\n${failures.length} failed:\n${failures.map((line) => `  ✗ ${line}`).join("\n")}`);
  process.exit(1);
}

console.log("\nThe sign in page signs people in, and refuses everybody the same way.");
