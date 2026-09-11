/**
 * Loads the export with a language stored and checks it hydrates cleanly, then
 * reads in that language.
 *
 * `npm run build && npm run check:locale` — serves `out/` and answers nothing
 * else, so the API is unreachable throughout.
 *
 * **The export is English and a stored Spanish is only known in the browser**,
 * so the first client render and the served HTML disagree about every word of
 * copy. React calls that a hydration failure, reports it on every page load,
 * and throws the served tree away. `LanguageBoundary` is what stops it: see its
 * own docblock. This is the check that goes red without it, which neither
 * `node --test` nor any other `check:*` can be, because none of them store a
 * language.
 *
 * The API is refused on purpose. `/languages` answering is what reconciles a
 * stored choice against the live list, and a run where it answered `[en]` would
 * forget Spanish and reload into English mid-check. Hydration happens before
 * any answer could land, so refusing it changes nothing this is checking.
 *
 * **The words below are copied from `locales/*\/site.json` deliberately**, for
 * the reason `check-login.mjs` gives: a check that imported them could not tell
 * the page rendering the right string from the page rendering whatever the
 * string had become.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const root = join(process.cwd(), "out");
/* 4321 to 4323 belong to the other checks. Its own, so any of them can run at once. */
const PORT = 4324;

/* `/404.html` is `not-found.tsx`, which sits outside `(site)` and draws its own chrome. */
const PAGES = ["/", "/readings/", "/readings/in-depth/", "/login/", "/404.html"];

/** The drawer toggle's name, which every page's masthead carries. */
const MENU = "header button[aria-controls]";
const OPEN_MENU = { en: "Open menu", es: "Abrir menú" };

/** React's own words in development, and its error number in the export. */
const HYDRATION = /hydrat|#418|#423|#425/i;

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

async function visit(path, stored) {
  const state = `${path} with ${stored ?? "nothing"} stored`;
  console.log(state);

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (stored) await context.addInitScript((code) => localStorage.setItem("wt.locale", code), stored);
  await context.route("**/*", (route) =>
    new URL(route.request().url()).port === String(PORT) ? route.continue() : route.abort(),
  );

  const page = await context.newPage();
  const hydration = [];
  page.on("console", (message) => {
    if (message.type() === "error" && HYDRATION.test(message.text())) hydration.push(message.text());
  });
  page.on("pageerror", (error) => {
    if (HYDRATION.test(error.message)) hydration.push(error.message);
  });

  await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: "load" });
  await page.waitForTimeout(1000);

  const language = stored ?? "en";
  expect(state, "hydration errors", hydration.length, 0);
  expect(state, "<html lang>", await page.evaluate(() => document.documentElement.lang), language);
  expect(state, "menu button", await page.locator(MENU).first().getAttribute("aria-label"), OPEN_MENU[language]);

  await context.close();
}

try {
  for (const path of PAGES) {
    await visit(path, null);
    await visit(path, "es");
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} failed:\n${failures.map((line) => `  ${line}`).join("\n")}`);
  process.exit(1);
}

console.log("\nEvery page hydrated cleanly in both languages.");
