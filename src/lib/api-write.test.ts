import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { ApiError, ApiRateLimitError, ApiValidationError, apiWrite } from "./api-write.ts";

type Call = { url: string; init: RequestInit };

const realFetch = globalThis.fetch;
const realDocument = globalThis.document;

let calls: Call[] = [];

/**
 * Stubs the network at the one boundary the seam owns. Responses are queued in
 * the order the seam is expected to ask for them, so a test that asserts on the
 * second call is also asserting that a first one happened.
 */
function stubFetch(...responses: Response[]): void {
  const queue = [...responses];

  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });

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

/** The cookie jar `readXsrfToken` reads. Laravel URL-encodes the value it sets. */
function stubCookie(value: string): void {
  globalThis.document = { cookie: value } as Document;
}

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://staging-api.theworldtarot.com";
  stubCookie("");
});

after(() => {
  globalThis.fetch = realFetch;
  globalThis.document = realDocument;
});

test("fetches the CSRF cookie before the write, with credentials on both", async () => {
  stubFetch(new Response(null, { status: 204 }), json({ id: 41 }, 201));

  await apiWrite("/api/v1/orders", { name: "Jane" });

  assert.equal(calls.length, 2);
  assert.equal(
    calls[0].url,
    "https://staging-api.theworldtarot.com/sanctum/csrf-cookie",
  );
  assert.equal(calls[0].init.credentials, "include");
  assert.equal(
    calls[1].url,
    "https://staging-api.theworldtarot.com/api/v1/orders",
  );
  assert.equal(calls[1].init.method, "POST");
  assert.equal(calls[1].init.credentials, "include");
});

test("echoes the XSRF cookie back as a header, URL-decoded", async () => {
  // Laravel sets a base64 value and URL-encodes it, so `=` arrives as `%3D`.
  // The raw value answers 419, which reads as a broken handshake rather than a
  // missing decode — which is the whole reason this test exists.
  stubCookie("foo=bar; XSRF-TOKEN=abc%2Fdef%3D%3D; laravel_session=xyz");
  stubFetch(new Response(null, { status: 204 }), json({ id: 41 }, 201));

  await apiWrite("/api/v1/orders", { name: "Jane" });

  const headers = new Headers(calls[1].init.headers);
  assert.equal(headers.get("X-XSRF-TOKEN"), "abc/def==");
  assert.equal(headers.get("Content-Type"), "application/json");
  assert.equal(headers.get("Accept"), "application/json");
});

test("on 419 fetches a fresh cookie and retries the write once", async () => {
  stubCookie("XSRF-TOKEN=stale");
  stubFetch(
    new Response(null, { status: 204 }),
    json({ message: "CSRF token mismatch." }, 419),
    // The retried handshake. Answering it is what rotates the cookie below.
    new Response(null, { status: 204 }),
    json({ id: 41, status: "pending" }, 201),
  );

  // Standing in for Set-Cookie. The first handshake leaves the stale token in
  // place, so the first write is genuinely the one that earns the 419; only the
  // second rotates it. Rotating on both would let the test pass without the
  // retry ever re-reading the cookie.
  let handshakes = 0;
  globalThis.fetch = ((original) =>
    (async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const response = await original(input, init);
      if (String(input).endsWith("/sanctum/csrf-cookie")) {
        handshakes += 1;
        stubCookie(handshakes === 1 ? "XSRF-TOKEN=stale" : "XSRF-TOKEN=fresh");
      }
      return response;
    }) as typeof fetch)(globalThis.fetch);

  const order = await apiWrite<{ id: number }>("/api/v1/orders", { name: "Jane" });

  assert.equal(order.id, 41);
  assert.equal(calls.length, 4);
  assert.equal(new Headers(calls[1].init.headers).get("X-XSRF-TOKEN"), "stale");
  assert.equal(calls[2].url.endsWith("/sanctum/csrf-cookie"), true);
  assert.equal(new Headers(calls[3].init.headers).get("X-XSRF-TOKEN"), "fresh");
});

test("surfaces a second 419 rather than retrying forever", async () => {
  stubCookie("XSRF-TOKEN=stale");
  stubFetch(
    new Response(null, { status: 204 }),
    json({ message: "CSRF token mismatch." }, 419),
    new Response(null, { status: 204 }),
    json({ message: "CSRF token mismatch." }, 419),
  );

  await assert.rejects(
    () => apiWrite("/api/v1/orders", { name: "Jane" }),
    (error: unknown) => error instanceof ApiError && error.status === 419,
  );
  assert.equal(calls.length, 4);
});

test("a 422 arrives as a validation error keyed by field", async () => {
  stubFetch(
    new Response(null, { status: 204 }),
    json(
      {
        message: "The given data was invalid.",
        errors: { "lines.0.product": ["That is not something you can buy right now"] },
      },
      422,
    ),
  );

  await assert.rejects(
    () => apiWrite("/api/v1/orders", { name: "Jane" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiValidationError);
      assert.equal(error.status, 422);
      assert.deepEqual(error.errors["lines.0.product"], [
        "That is not something you can buy right now",
      ]);
      return true;
    },
  );
});

test("a 429 carries Retry-After", async () => {
  stubFetch(
    new Response(null, { status: 204 }),
    new Response(JSON.stringify({ message: "Too Many Attempts." }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "37" },
    }),
  );

  await assert.rejects(
    () => apiWrite("/api/v1/orders", { name: "Jane" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiRateLimitError);
      assert.equal(error.retryAfterSeconds, 37);
      return true;
    },
  );
});

test("a refused payment names the endpoint and never the pay token in it", async () => {
  /*
    The backend answers `/pay` without a `message` on plenty of failures — a
    502, an HTML error page, a proxy timing out — and the fallback message is
    built from the path. The panel logs a rejected write, so a token left in
    that string is a credential in a console. `CONTEXT.md`, Pay token: never in
    a log.
  */
  stubFetch(new Response(null, { status: 204 }), new Response(null, { status: 502 }));

  const failure = await apiWrite("/api/v1/orders/kQ3rN8xvT1sLb0Zy/pay", {}).then(
    () => null,
    (error: unknown) => error as Error,
  );

  assert.equal(failure?.message.includes("kQ3rN8xvT1sLb0Zy"), false);
  assert.equal(failure?.message, "The write to /api/v1/orders/{pay_token}/pay failed with 502.");
});
