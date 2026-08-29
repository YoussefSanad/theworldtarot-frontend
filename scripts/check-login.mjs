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

/** The masthead's account control in each of its two states. */
const SIGN_IN_ICON = 'header a[aria-label="Sign in"]';
const SIGNED_IN_NAME = "header span[title]";
const SIGN_OUT = 'header button:has-text("Sign out")';

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
 * page: a visitor is a 401, and the same tab after a sign in is a customer.
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

/** What the masthead is drawing, in one shape for either state. */
async function masthead(page) {
  return {
    signIn: await page.locator(SIGN_IN_ICON).count(),
    name: (await page.locator(SIGNED_IN_NAME).count())
      ? (await page.locator(SIGNED_IN_NAME).first().textContent()).trim()
      : "",
    signOut: await page.locator(SIGN_OUT).count(),
  };
}

console.log("\nthe page exists and the masthead reaches it");
{
  const { page } = await open();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });

  const href = await page.getAttribute(SIGN_IN_ICON, "href");
  expect("visitor", "the masthead's account control points at the built route", href, "/login/");

  await page.click(SIGN_IN_ICON);
  await page.waitForURL(LOGIN);
  expect("visitor", "and reaches it", page.url(), LOGIN);
  expect("visitor", "which asks for an address and a password", await page.locator(`${EMAIL}, ${PASSWORD}`).count(), 2);
  await page.close();
}

console.log("\na claimed account signs in, and the masthead says so");
{
  let signedIn = false;
  const { page, sent } = await open({ me: () => (signedIn ? api(CUSTOMER) : api({ message: "Unauthenticated." }, 401)) });
  await page.goto(LOGIN, { waitUntil: "networkidle" });

  expect("signing in", "the masthead starts on the visitor's icon", await masthead(page), {
    signIn: 1, name: "", signOut: 0,
  });

  await signIn(page);
  await page.waitForURL(`http://localhost:${PORT}/readings/`);
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
  expect("signing in", "and lands where a signed-in customer has somewhere to be", page.url(), `http://localhost:${PORT}/readings/`);
  expect("signing in", "the masthead now shows the customer", await masthead(page), {
    signIn: 0, name: "Jane Doe", signOut: 1,
  });

  await page.click(SIGN_OUT);
  await page.waitForSelector(SIGN_IN_ICON);
  expect("signing out", "and goes back to offering a sign in", await masthead(page), {
    signIn: 1, name: "", signOut: 0,
  });

  /* The session really is gone: a fresh load asks again and is told no. */
  signedIn = false;
  await page.reload({ waitUntil: "networkidle" });
  expect("signing out", "which survives a reload", await masthead(page), { signIn: 1, name: "", signOut: 0 });
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
    Both arms are checked because the browser only sometimes gets to read the
    wait, and the difference is not the page's doing.

    `Retry-After` is not one of the seven CORS-safelisted response headers, so
    a cross-origin caller reads it only when the API answers
    `Access-Control-Expose-Headers: Retry-After`. The backend does not:
    `config/cors.php` has `'exposed_headers' => []` (read 29 August 2026). So
    against staging today `response.headers.get("Retry-After")` is `null`
    however faithfully the 429 carries the header, and the page falls back to
    the wording that does not name a number.

    That fallback is the behaviour under test, not a compromise — #49 asks that
    six tries "answer the 429's wait rather than the refusal", and both of these
    sentences are a wait rather than the refusal. The second arm is here so the
    day the backend exposes the header, the page is already right and this
    check already says so.
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

await browser.close();
server.close();

if (failures.length > 0) {
  console.log(`\n${failures.length} failed:\n${failures.map((line) => `  ✗ ${line}`).join("\n")}`);
  process.exit(1);
}

console.log("\nThe sign in page signs people in, and refuses everybody the same way.");
