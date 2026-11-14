import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { ENTRY_RETRY_DELAYS_MS, enterAfterPayment, passDoorFor } from "./enter-after-payment.ts";

/*
  #185, one test per branch of the issue's behaviour list, against
  `POST /api/v1/orders/enter` (backend #128). Each test names its branch.
*/

type Call = { url: string; init: RequestInit };
type Handler = () => Response | Promise<Response>;

const BASE = "https://staging-api.theworldtarot.com";
const PAY_TOKEN = "kQ3rN8xvT1sLb0Zy-the-pay-token";
const realFetch = globalThis.fetch;
const realDocument = globalThis.document;

let calls: Call[] = [];
let waited: number[] = [];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Routes by path, so each test says what each endpoint answers, in turn. */
function stubApi({ enter = [], me }: { enter?: Handler[]; me?: Handler }): void {
  let entered = 0;

  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });

    if (url.endsWith("/sanctum/csrf-cookie")) return new Response(null, { status: 204 });

    if (url.endsWith("/api/v1/orders/enter")) {
      const answer = enter[Math.min(entered, enter.length - 1)];
      entered += 1;
      if (!answer) throw new Error("The test gave /orders/enter no answer.");
      return answer();
    }

    if (url.endsWith("/api/v1/me") && me) return me();

    throw new Error(`Unexpected fetch to ${url}.`);
  }) as typeof fetch;
}

const enters = () => calls.filter((call) => call.url.endsWith("/api/v1/orders/enter"));

/** Records each delay instead of sleeping it, so thirty seconds take none. */
const wait = async (ms: number) => {
  waited.push(ms);
};

const apiCustomer = {
  id: 31,
  name: null,
  email: "new-buyer@example.com",
  created_at: "2026-11-14T19:00:00+00:00",
  has_viewing_room_access: true,
};

const customer = { id: 31, name: null, email: "new-buyer@example.com", hasViewingRoomAccess: true };

const ok: Handler = () => json(apiCustomer);
const notYet: Handler = () => json({ message: "Not settled yet." }, 409);
const never: Handler = () => json({ message: "Sign in to enter." }, 403);

beforeEach(() => {
  calls = [];
  waited = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = BASE;
  globalThis.document = { cookie: "XSRF-TOKEN=a%2Bcsrf%3Dtoken" } as Document;
});

after(() => {
  globalThis.fetch = realFetch;
  globalThis.document = realDocument;
});

// Branch 1

test("1. already signed in: no call is made, and the room's door is offered as today", async () => {
  stubApi({ enter: [ok] });

  const entry = await enterAfterPayment(PAY_TOKEN, { signedIn: customer, wait });

  assert.deepEqual(entry, { outcome: "already-in" });
  assert.deepEqual(calls, [], "not /orders/enter, and not even the CSRF handshake");
  assert.equal(passDoorFor(entry), "enter");
});

// Branch 2

test("2. signed out: POSTs the pay token in the body, with cookie credentials and CSRF, exactly as /login", async () => {
  stubApi({ enter: [ok] });

  await enterAfterPayment(PAY_TOKEN, { signedIn: null, wait });

  assert.equal(calls.length, 2, "the CSRF handshake, then the one write");
  const [handshake, ...rest] = calls;
  assert.equal(handshake.url, `${BASE}/sanctum/csrf-cookie`, "the CSRF cookie is asked for first");
  assert.equal(handshake.init.credentials, "include");

  assert.equal(rest.length, 1);
  const [enter] = rest;
  assert.equal(enter.url, `${BASE}/api/v1/orders/enter`);
  assert.equal(enter.init.method, "POST");
  assert.equal(enter.init.credentials, "include");
  const headers = enter.init.headers as Record<string, string>;
  assert.equal(headers["X-XSRF-TOKEN"], "a+csrf=token", "the cookie's value, URL-decoded");
  assert.equal(headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(String(enter.init.body)), { pay_token: PAY_TOKEN }, "the pay token and nothing else: no device_name");
});

test("2. the pay token goes in a request body only, never in any URL", async () => {
  stubApi({ enter: [notYet, notYet, ok] });

  await enterAfterPayment(PAY_TOKEN, { signedIn: null, wait });

  assert.ok(calls.length > 0);
  for (const call of calls) assert.ok(!call.url.includes(PAY_TOKEN), `${call.url} carries the pay token`);
});

// Branch 3

test("3. 200: answers the customer the backend signed in, for the masthead, and the room is where it goes", async () => {
  stubApi({ enter: [ok] });

  const entry = await enterAfterPayment(PAY_TOKEN, { signedIn: null, wait });

  assert.deepEqual(entry, { outcome: "entered", customer });
  assert.equal(enters().length, 1);
  // Navigating away, so the screen keeps saying it is taking them in.
  assert.equal(passDoorFor(entry), "taking-you-in");
});

test("3. 200 with a body that is not a customer: the session is real, so the customer is read back from /me", async () => {
  stubApi({ enter: [() => new Response("", { status: 200 })], me: () => json(apiCustomer) });

  const entry = await enterAfterPayment(PAY_TOKEN, { signedIn: null, wait });

  assert.deepEqual(entry, { outcome: "entered", customer });
});

test("3. 200 with a body that is not a customer, and /me answering nobody: sign in to enter", async () => {
  stubApi({ enter: [() => new Response("", { status: 200 })], me: () => json({ message: "Unauthenticated." }, 401) });

  const entry = await enterAfterPayment(PAY_TOKEN, { signedIn: null, wait });

  assert.deepEqual(entry, { outcome: "sign-in" });
});

// Branch 4

test("4. 409 then 200: asks again after the first delay, and enters", async () => {
  stubApi({ enter: [notYet, ok] });

  const entry = await enterAfterPayment(PAY_TOKEN, { signedIn: null, wait });

  assert.deepEqual(entry, { outcome: "entered", customer });
  assert.equal(enters().length, 2);
  assert.deepEqual(waited, [1000], "one second first");
});

test("4. 409 exhausted: asks once and then once per delay, thirty seconds in all, then treats it as 403", async () => {
  stubApi({ enter: [notYet] });

  const entry = await enterAfterPayment(PAY_TOKEN, { signedIn: null, wait });

  assert.deepEqual(entry, { outcome: "sign-in" });
  assert.equal(enters().length, ENTRY_RETRY_DELAYS_MS.length + 1);
  assert.deepEqual(waited, [...ENTRY_RETRY_DELAYS_MS]);
  assert.equal(waited[0], 1000);
  assert.equal(
    waited.reduce((sum, ms) => sum + ms, 0),
    30_000,
  );
  assert.equal(passDoorFor(entry), "sign-in");
});

test("4. a screen that goes while it waits stops asking", async () => {
  stubApi({ enter: [notYet] });
  let wanted = true;

  const entry = await enterAfterPayment(PAY_TOKEN, {
    signedIn: null,
    wait: async (ms) => {
      waited.push(ms);
      wanted = false;
    },
    stillWanted: () => wanted,
  });

  assert.equal(entry, null);
  assert.equal(enters().length, 1);
});

// Branch 5

for (const [kind, answer] of [
  ["403", never],
  ["404", () => new Response(null, { status: 404 })],
  ["429", () => json({ message: "Too Many Attempts." }, 429)],
  ["422", () => json({ message: "The pay token field is required.", errors: { pay_token: ["Required."] } }, 422)],
  ["500", () => json({ message: "Server Error" }, 500)],
  [
    "a network error",
    () => {
      throw new TypeError("Failed to fetch");
    },
  ],
] as [string, Handler][]) {
  test(`5. ${kind}: sign in to enter, asked once and not again`, async () => {
    stubApi({ enter: [answer, ok] });

    const entry = await enterAfterPayment(PAY_TOKEN, { signedIn: null, wait });

    assert.deepEqual(entry, { outcome: "sign-in" });
    assert.equal(enters().length, 1);
    assert.deepEqual(waited, []);
    assert.equal(passDoorFor(entry), "sign-in");
  });
}

// Branch 6

test("6. while waiting the door is Taking you in: never the room's door, never the sign in", () => {
  assert.equal(passDoorFor("waiting"), "taking-you-in");
});

test("the retry schedule is #170's, kept: one second first, doubling, thirty seconds in all", () => {
  assert.deepEqual([...ENTRY_RETRY_DELAYS_MS], [1000, 2000, 4000, 8000, 15000]);
});
