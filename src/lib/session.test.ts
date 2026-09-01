import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { ApiError, ApiRateLimitError, ApiValidationError } from "./api-write.ts";
import {
  currentCustomer,
  customerLabel,
  readSignInFailure,
  requestPasswordLink,
  signIn,
  signOut,
} from "./session.ts";

type Call = { url: string; init: RequestInit };

const realFetch = globalThis.fetch;
const realDocument = globalThis.document;

let calls: Call[] = [];

/**
 * Stubbed at the network, as the other seams' tests are: what the backend is
 * asked is the request that actually leaves, headers and all.
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

const jane = {
  id: 12,
  name: "Jane Doe",
  email: "jane@example.com",
  created_at: "2026-08-12T10:04:00+00:00",
  has_viewing_room_access: true,
};

/*
  A buyer who claimed the account checkout made for them. Nothing on the hosted
  page road asks a name, so the backend has answered `null` here since
  `YoussefSanad/TheWorldTarot#52` stopped it inventing one from the address.
  This is the ordinary shape for a paying customer, not an edge case.
*/
const claimed = { ...jane, id: 31, name: null, email: "jennifer@example.com" };

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://staging-api.theworldtarot.com";
  globalThis.document = { cookie: "XSRF-TOKEN=token" } as Document;
});

after(() => {
  globalThis.fetch = realFetch;
  globalThis.document = realDocument;
});

test("signs in at the login endpoint and answers with the customer", async () => {
  stubFetch(new Response(null, { status: 204 }), json(jane));

  const customer = await signIn({ email: "jane@example.com", password: "a long one" });

  assert.equal(calls[1].url, "https://staging-api.theworldtarot.com/api/v1/login");
  assert.deepEqual(customer, {
    id: 12,
    name: "Jane Doe",
    email: "jane@example.com",
    hasViewingRoomAccess: true,
  });
});

test("never sends device_name, which would switch the website to bearer tokens", async () => {
  /*
    One field decides the whole authentication style. Sending it here would hand
    this browser a token it has nowhere to keep and no session cookie at all, so
    the sign in would appear to work and the next page load would be a stranger.
  */
  stubFetch(new Response(null, { status: 204 }), json(jane));

  await signIn({ email: "jane@example.com", password: "a long one" });

  assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
    email: "jane@example.com",
    password: "a long one",
  });
});

test("a wrong password, an unknown address and an unclaimed account are one refusal", async () => {
  /*
    The backend answers all three identically, on the `email` field, and says it
    will not change. Anything that split them would turn this form into a way to
    ask whether an address has an account here.
  */
  const refusal = new ApiValidationError("These credentials do not match our records.", {
    email: ["These credentials do not match our records."],
  });

  assert.deepEqual(readSignInFailure(refusal), { kind: "refused" });
});

test("a rule the password broke lands on the field that names it", async () => {
  const missing = new ApiValidationError("The given data was invalid.", {
    password: ["The password field is required."],
  });

  assert.deepEqual(readSignInFailure(missing), {
    kind: "fields",
    errors: { password: ["The password field is required."] },
  });
});

test("too many tries is a 429 with its wait, not a refusal", async () => {
  const limited = new ApiRateLimitError("Too Many Attempts.", 41);

  assert.deepEqual(readSignInFailure(limited), { kind: "rate-limited", retryAfterSeconds: 41 });
});

test("anything else is unknown rather than a refusal", async () => {
  assert.deepEqual(readSignInFailure(new ApiError(500, "Server Error")), { kind: "unknown" });
});

test("signs out through the write seam, surviving a 204 with no body at all", async () => {
  // `logout` answers 204 and nothing else. A seam that parses every answer as
  // JSON throws on the empty body and a successful sign out looks like a fault.
  stubFetch(new Response(null, { status: 204 }), new Response(null, { status: 204 }));

  await signOut();

  assert.equal(calls[1].url, "https://staging-api.theworldtarot.com/api/v1/logout");
  assert.equal(calls[1].init.method, "POST");
});

test("asks for a reset link with the address and nothing else", async () => {
  stubFetch(
    new Response(null, { status: 204 }),
    json({ message: "If we have an account for that address, a reset link is on its way." }),
  );

  await requestPasswordLink("jane@example.com");

  assert.equal(calls[1].url, "https://staging-api.theworldtarot.com/api/v1/forgot-password");
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), { email: "jane@example.com" });
});

test("reads who is signed in, with the session cookie and no cache anywhere", async () => {
  stubFetch(json(jane));

  const customer = await currentCustomer();

  assert.equal(calls[0].url, "https://staging-api.theworldtarot.com/api/v1/me");
  assert.equal(calls[0].init.credentials, "include");
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(customer?.name, "Jane Doe");
});

test("a 401 from /me means nobody is signed in, not that anything failed", async () => {
  // The normal answer for anybody who has not signed in. Thrown, it would put a
  // red line in the console of everybody who loads the homepage.
  stubFetch(json({ message: "Unauthenticated." }, 401));

  assert.equal(await currentCustomer(), null);
});

test("a broken /me still throws, so it stays apart from nobody being signed in", async () => {
  stubFetch(json({ message: "Server Error" }, 500));

  await assert.rejects(() => currentCustomer());
});

test("a claimed buyer with no name reads back as null, not as the address's local part", async () => {
  /*
    The backend used to fill a missing name with everything before the `@`, and
    a real customer read "Hello jennifer," in their receipt. That invention is
    gone. `null` is the honest answer and the seam carries it through rather
    than inventing the same thing here.
  */
  stubFetch(json(claimed));

  const customer = await currentCustomer();

  assert.deepEqual(customer, {
    id: 31,
    name: null,
    email: "jennifer@example.com",
    hasViewingRoomAccess: true,
  });
});

test("signing in as a claimed buyer answers a null name too", async () => {
  stubFetch(new Response(null, { status: 204 }), json(claimed));

  const customer = await signIn({ email: "jennifer@example.com", password: "a long one" });

  assert.equal(customer.name, null);
});

test("what to call a customer is their name when they have one", () => {
  assert.equal(
    customerLabel({ id: 12, name: "Jane Doe", email: "jane@example.com", hasViewingRoomAccess: true }),
    "Jane Doe",
  );
});

test("and their address when they have none, since that is the one field that cannot be absent", () => {
  /*
    Rendering the name straight through left an empty span beside the sign out
    link, which reads as a fault — it is how the backend's own defect was
    reported. The address is what they bought with and what they recognise.
  */
  assert.equal(
    customerLabel({ id: 31, name: null, email: "jennifer@example.com", hasViewingRoomAccess: true }),
    "jennifer@example.com",
  );
});

test("a blank name is absent as well, however it arrives", () => {
  /*
    The backend's migration turned its empty strings into nulls, so this should
    not reach us. It is read as absent anyway because the failure it would cause
    is the empty slot this function exists to prevent, and a label cannot tell
    the difference between "" and a string of spaces.
  */
  const nameless = { id: 31, email: "jennifer@example.com", hasViewingRoomAccess: true };

  assert.equal(customerLabel({ ...nameless, name: "" }), "jennifer@example.com");
  assert.equal(customerLabel({ ...nameless, name: "   " }), "jennifer@example.com");
});
