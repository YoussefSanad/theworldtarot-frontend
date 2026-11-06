import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { ApiRateLimitError, ApiValidationError } from "./api-write.ts";
import { claimAndSignIn, resetPassword } from "./passwords.ts";

type Call = { url: string; init: RequestInit };
type Handler = () => Response | Promise<Response>;

const BASE = "https://staging-api.theworldtarot.com";
const realFetch = globalThis.fetch;
const realDocument = globalThis.document;

let calls: Call[] = [];

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/** Routes by path, so the test says what each endpoint answers, not call order. */
function stubApi(routes: { claim?: Handler; me?: Handler; login?: Handler; reset?: Handler }): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });

    if (url.endsWith("/sanctum/csrf-cookie")) return new Response(null, { status: 204 });

    const route = url.endsWith("/api/v1/set-password")
      ? routes.claim
      : url.endsWith("/api/v1/login")
        ? routes.login
        : url.endsWith("/api/v1/me")
          ? routes.me
          : url.endsWith("/api/v1/reset-password")
            ? routes.reset
            : undefined;
    if (!route) throw new Error(`Unexpected fetch to ${url}.`);

    return route();
  }) as typeof fetch;
}

const writes = (suffix: string) => calls.filter((call) => call.url.endsWith(suffix));

const submission = {
  token: "from-the-link",
  email: "jennifer@example.com",
  password: "a-long-enough-one",
  passwordConfirmation: "a-long-enough-one",
};

const customer = {
  id: 31,
  name: null,
  email: "jennifer@example.com",
  created_at: "2026-08-12T10:04:00+00:00",
  has_viewing_room_access: true,
};

/** What `signIn()` hands back: the normalised Customer, not the raw API body. */
const signedInCustomer = {
  id: 31,
  name: null,
  email: "jennifer@example.com",
  hasViewingRoomAccess: true,
};

/** The only answer that lets the form sign anybody in: nobody holds a session. */
const nobodySignedIn: Handler = () => json({ message: "Unauthenticated." }, 401);

const claimOk: Handler = () => json({ message: "Your account is ready." });

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = BASE;
  globalThis.document = { cookie: "XSRF-TOKEN=token" } as Document;
});

after(() => {
  globalThis.fetch = realFetch;
  globalThis.document = realDocument;
});

test("a claim that succeeds signs in with the collected email and password and says so", async () => {
  stubApi({ claim: claimOk, me: nobodySignedIn, login: () => json(customer) });

  const outcome = await claimAndSignIn(submission);

  assert.deepEqual(outcome, { outcome: "signed-in", customer: signedInCustomer });
  assert.equal(writes("/api/v1/set-password").length, 1);
  assert.equal(writes("/api/v1/me").length, 1);
  const login = writes("/api/v1/login");
  assert.equal(login.length, 1);
  assert.equal(login[0].url, `${BASE}/api/v1/login`);
  // Exactly these two fields: device_name would hand back a token, not a cookie.
  assert.deepEqual(JSON.parse(String(login[0].init.body)), {
    email: "jennifer@example.com",
    password: "a-long-enough-one",
  });
});

test("the claim is posted before the sign in is attempted", async () => {
  stubApi({ claim: claimOk, me: nobodySignedIn, login: () => json(customer) });

  await claimAndSignIn(submission);

  const order = calls.map((call) => call.url).filter((url) => url.includes("/api/v1/"));
  assert.deepEqual(order, [
    `${BASE}/api/v1/set-password`,
    `${BASE}/api/v1/me`,
    `${BASE}/api/v1/login`,
  ]);
});

for (const [kind, claim, expected] of [
  [
    "a password rule failure",
    () => json({ message: "Invalid.", errors: { password: ["Too short."] } }, 422),
    ApiValidationError,
  ],
  [
    "a dead link",
    () => json({ message: "Invalid token.", errors: { email: ["Invalid token."] } }, 422),
    ApiValidationError,
  ],
  [
    "a rate limit",
    () => json({ message: "Too many attempts." }, 429, { "Retry-After": "42" }),
    ApiRateLimitError,
  ],
] as const) {
  test(`${kind} on the claim propagates and no sign in is attempted`, async () => {
    stubApi({ claim, me: nobodySignedIn, login: () => json(customer) });

    await assert.rejects(claimAndSignIn(submission), expected);

    assert.equal(writes("/api/v1/login").length, 0);
    assert.equal(writes("/api/v1/me").length, 0);
  });
}

test("a network failure on the claim propagates unchanged and no sign in is attempted", async () => {
  const offline = new TypeError("Failed to fetch");
  stubApi({
    claim: () => {
      throw offline;
    },
    me: nobodySignedIn,
    login: () => json(customer),
  });

  await assert.rejects(claimAndSignIn(submission), (cause) => cause === offline);

  assert.equal(writes("/api/v1/login").length, 0);
  assert.equal(writes("/api/v1/me").length, 0);
});

for (const [kind, me] of [
  ["a customer already signed in", () => json(customer)],
  ["a server error (500)", () => json({ message: "Server Error" }, 500)],
  [
    "a network failure",
    () => {
      throw new TypeError("Failed to fetch");
    },
  ],
  [
    "a timeout",
    () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    },
  ],
  [
    "an abort",
    () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    },
  ],
] as const) {
  test(`${kind} on /me never signs in: the session may not be nobody's`, async () => {
    stubApi({ claim: claimOk, me, login: () => json({ ...customer, id: 99 }) });

    const outcome = await claimAndSignIn(submission);

    assert.deepEqual(outcome, { outcome: "sign-in-needed" });
    assert.equal(writes("/api/v1/login").length, 0);
    // Claimed once, checked once; the claim is not repeated.
    assert.equal(writes("/api/v1/set-password").length, 1);
    assert.equal(writes("/api/v1/me").length, 1);
    assert.ok(!JSON.stringify(outcome).includes(submission.password));
  });
}

for (const [kind, login] of [
  [
    "wrong credentials (422)",
    () => json({ message: "Invalid.", errors: { email: ["These credentials do not match."] } }, 422),
  ],
  ["a rate limit (429)", () => json({ message: "Too many attempts." }, 429, { "Retry-After": "30" })],
  ["a server error (500)", () => json({ message: "Server Error" }, 500)],
  [
    "a network failure",
    () => {
      throw new TypeError("Failed to fetch");
    },
  ],
] as const) {
  test(`${kind} on the sign in falls back to sign-in-needed without throwing`, async () => {
    stubApi({ claim: claimOk, me: nobodySignedIn, login });

    const outcome = await claimAndSignIn(submission);

    assert.deepEqual(outcome, { outcome: "sign-in-needed" });
    assert.ok(!("customer" in outcome));
    // The password was set: the claim is not repeated.
    assert.equal(writes("/api/v1/set-password").length, 1);
  });
}

test("the password appears in neither the outcome nor an error from a failed claim", async () => {
  stubApi({ claim: claimOk, me: nobodySignedIn, login: () => json({ message: "Nope." }, 500) });
  const outcome = await claimAndSignIn(submission);
  assert.deepEqual(outcome, { outcome: "sign-in-needed" });
  assert.ok(!JSON.stringify(outcome).includes(submission.password));

  stubApi({ claim: claimOk, me: nobodySignedIn, login: () => json(customer) });
  const signedIn = await claimAndSignIn(submission);
  assert.deepEqual(signedIn, { outcome: "signed-in", customer: signedInCustomer });
  assert.ok(!JSON.stringify(signedIn).includes(submission.password));

  stubApi({
    claim: () => json({ message: "Invalid.", errors: { password: ["Too short."] } }, 422),
  });
  await assert.rejects(claimAndSignIn(submission), (cause) => {
    const text = `${(cause as Error).message} ${JSON.stringify(cause)}`;
    assert.ok(!text.includes(submission.password));
    return true;
  });
});

test("a reset never signs in", async () => {
  stubApi({ reset: () => json({ message: "Your password has been changed." }) });

  await resetPassword(submission);

  assert.equal(writes("/api/v1/reset-password").length, 1);
  assert.equal(writes("/api/v1/login").length, 0);
});
