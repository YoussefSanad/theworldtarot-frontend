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

/** A page on `path` + `query`, with the write answered by `answer`. */
async function open(path, query, answer = api({ message: "ok" })) {
  const page = await browser.newPage();
  const sent = [];

  await page.route("**/sanctum/csrf-cookie", (route) => route.fulfill(api(null, 204)));
  await page.route("**/api/v1/me", (route) => route.fulfill(api({ message: "Unauthenticated." }, 401)));
  for (const endpoint of ["set-password", "reset-password"]) {
    await page.route(`**/api/v1/${endpoint}`, (route) => {
      if (route.request().method() === "OPTIONS") return route.fulfill(api(null, 204));
      sent.push({ endpoint, body: JSON.parse(route.request().postData() ?? "null") });
      return route.fulfill(answer);
    });
  }
  /* A hostile target must never reach the real network. */
  await page.route((url) => url.hostname === "evil.com", (route) => route.abort());
  await page.goto(`${ORIGIN}${path}${query}`, { waitUntil: "networkidle" });

  return { page, sent };
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

await browser.close();
server.close();

if (failures.length > 0) {
  console.log(`\n${failures.length} failed:\n${failures.map((line) => `  ✗ ${line}`).join("\n")}`);
  process.exit(1);
}

console.log("\nThe password pages send people back to sign in, and on to where they were going.");
