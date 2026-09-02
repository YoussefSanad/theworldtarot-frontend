import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { askLanguages, forgetLanguages, languageOptions, resolveLanguages } from "./languages.ts";
import { BUILT_LOCALES } from "./locale.ts";

const realFetch = globalThis.fetch;
const realError = console.error;

let calls: string[] = [];

function stubFetch(...answers: Response[]): void {
  const queue = [...answers];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));

    const next = queue.shift();
    if (!next) throw new Error(`Unexpected fetch to ${String(input)}.`);

    return next;
  }) as typeof fetch;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const EN = { code: "en", label: "English" };
const ES = { code: "es", label: "Spanish", native_name: "Español" };
const FR = { code: "fr", label: "French" };

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://staging-api.theworldtarot.com";
  console.error = () => {};
  forgetLanguages();
});

after(() => {
  globalThis.fetch = realFetch;
  console.error = realError;
});

test("two languages that are live and built are both offered", () => {
  assert.deepEqual(resolveLanguages([EN, ES], ["en", "es"]), [EN, ES]);
});

test("one live language draws no switcher, which is the normal state today", () => {
  // A group holding the language you are already reading is a control that
  // cannot do anything. `API_CONTRACT.md` gives the same advice.
  assert.deepEqual(resolveLanguages([EN], ["en", "es"]), []);
});

test("a failed request draws no switcher either, since neither means anything safe to offer", () => {
  assert.deepEqual(resolveLanguages(null, ["en", "es"]), []);
});

test("an empty answer draws nothing", () => {
  assert.deepEqual(resolveLanguages([], ["en", "es"]), []);
});

test("a language taken down at the backend leaves the switcher on the next request, with no deploy", () => {
  // The whole property `API_CONTRACT.md` says it cannot enforce for us.
  assert.deepEqual(resolveLanguages([EN, ES, FR], ["en", "es", "fr"]).map((l) => l.code), ["en", "es", "fr"]);
  assert.deepEqual(resolveLanguages([EN, ES], ["en", "es", "fr"]).map((l) => l.code), ["en", "es"]);
});

test("a language this export was never built for is not offered, however live it is", () => {
  // The other half of the intersection. A static export cannot grow a route
  // from a fetch, so offering Spanish here would be a link to a 404.
  assert.deepEqual(resolveLanguages([EN, ES, FR], ["en", "es"]).map((l) => l.code), ["en", "es"]);
});

test("the live answer's order is kept, being the backend's own", () => {
  assert.deepEqual(resolveLanguages([ES, EN], ["en", "es"]).map((l) => l.code), ["es", "en"]);
});

test("native_name survives the resolver, being what the row has to read", () => {
  assert.equal(resolveLanguages([EN, ES], ["en", "es"])[1]?.native_name, "Español");
});

test("this export is built for English alone today, so a live Spanish still draws nothing", () => {
  // The step's whole point: correct, and invisible until #69 ships a segment.
  assert.deepEqual(BUILT_LOCALES, ["en"]);
  assert.deepEqual(resolveLanguages([EN, ES], BUILT_LOCALES), []);
});

test("the languages endpoint carries no locale segment, being the thing that says which exist", async () => {
  stubFetch(json([EN]));

  await askLanguages();

  assert.deepEqual(calls, ["https://staging-api.theworldtarot.com/api/v1/languages"]);
});

test("asked once however many controls want it — the header renders two", async () => {
  stubFetch(json([EN]));

  await askLanguages();
  await askLanguages();

  assert.equal(calls.length, 1);
});

test("a broken endpoint offers nothing rather than a hardcoded list with a 404 behind it", async () => {
  stubFetch(json({ message: "nope" }, 500));

  await askLanguages();

  assert.deepEqual(resolveLanguages(languageOptions(), ["en", "es"]), []);
});
