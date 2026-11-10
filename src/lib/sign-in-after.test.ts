import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { ApiRateLimitError, ApiValidationError } from "./api-write.ts";
import { claimAccount, type PasswordWrite, resetPassword, signInAfter } from "./passwords.ts";

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
const resetOk: Handler = () => json({ message: "Your password has been changed." });

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = BASE;
  globalThis.document = { cookie: "XSRF-TOKEN=token" } as Document;
});

after(() => {
  globalThis.fetch = realFetch;
  globalThis.document = realDocument;
});

/*
  Every case runs for both writes: a claim (#150) and a reset from a pass
  receipt (#171) end the same way once the password is set.
*/
const WRITES: {
  name: string;
  write: PasswordWrite;
  endpoint: string;
  routes: (handler: Handler) => { claim?: Handler; reset?: Handler };
}[] = [
  { name: "claim", write: claimAccount, endpoint: "/api/v1/set-password", routes: (claim) => ({ claim }) },
  { name: "reset", write: resetPassword, endpoint: "/api/v1/reset-password", routes: (reset) => ({ reset }) },
];

for (const { name, write, endpoint, routes } of WRITES) {
  const ok = name === "claim" ? claimOk : resetOk;

  test(`${name}: a write that succeeds signs in with the collected email and password and says so`, async () => {
    stubApi({ ...routes(ok), me: nobodySignedIn, login: () => json(customer) });

    const outcome = await signInAfter(write, submission);

    assert.deepEqual(outcome, { outcome: "signed-in", customer: signedInCustomer });
    assert.equal(writes(endpoint).length, 1);
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

  test(`${name}: the write is posted before the sign in is attempted`, async () => {
    stubApi({ ...routes(ok), me: nobodySignedIn, login: () => json(customer) });

    await signInAfter(write, submission);

    const order = calls.map((call) => call.url).filter((url) => url.includes("/api/v1/"));
    assert.deepEqual(order, [`${BASE}${endpoint}`, `${BASE}/api/v1/me`, `${BASE}/api/v1/login`]);
  });

  for (const [kind, refusal, expected] of [
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
    test(`${name}: ${kind} on the write propagates and no sign in is attempted`, async () => {
      stubApi({ ...routes(refusal), me: nobodySignedIn, login: () => json(customer) });

      await assert.rejects(signInAfter(write, submission), expected);

      assert.equal(writes("/api/v1/login").length, 0);
      assert.equal(writes("/api/v1/me").length, 0);
    });
  }

  test(`${name}: a network failure on the write propagates unchanged and no sign in is attempted`, async () => {
    const offline = new TypeError("Failed to fetch");
    stubApi({
      ...routes(() => {
        throw offline;
      }),
      me: nobodySignedIn,
      login: () => json(customer),
    });

    await assert.rejects(signInAfter(write, submission), (cause) => cause === offline);

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
    test(`${name}: ${kind} on /me never signs in: the session may not be nobody's`, async () => {
      stubApi({ ...routes(ok), me, login: () => json({ ...customer, id: 99 }) });

      const outcome = await signInAfter(write, submission);

      assert.deepEqual(outcome, { outcome: "sign-in-needed" });
      assert.equal(writes("/api/v1/login").length, 0);
      // Written once, checked once; the write is not repeated.
      assert.equal(writes(endpoint).length, 1);
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
    test(`${name}: ${kind} on the sign in falls back to sign-in-needed without throwing`, async () => {
      stubApi({ ...routes(ok), me: nobodySignedIn, login });

      const outcome = await signInAfter(write, submission);

      assert.deepEqual(outcome, { outcome: "sign-in-needed" });
      assert.ok(!("customer" in outcome));
      // The password was set: the write is not repeated.
      assert.equal(writes(endpoint).length, 1);
    });
  }

  test(`${name}: the password appears in neither the outcome nor an error from a failed write`, async () => {
    stubApi({ ...routes(ok), me: nobodySignedIn, login: () => json({ message: "Nope." }, 500) });
    const outcome = await signInAfter(write, submission);
    assert.deepEqual(outcome, { outcome: "sign-in-needed" });
    assert.ok(!JSON.stringify(outcome).includes(submission.password));

    stubApi({ ...routes(ok), me: nobodySignedIn, login: () => json(customer) });
    const signedIn = await signInAfter(write, submission);
    assert.deepEqual(signedIn, { outcome: "signed-in", customer: signedInCustomer });
    assert.ok(!JSON.stringify(signedIn).includes(submission.password));

    stubApi(routes(() => json({ message: "Invalid.", errors: { password: ["Too short."] } }, 422)));
    await assert.rejects(signInAfter(write, submission), (cause) => {
      const text = `${(cause as Error).message} ${JSON.stringify(cause)}`;
      assert.ok(!text.includes(submission.password));
      return true;
    });
  });
}

test("a reset on its own never signs in: only signInAfter does, and only when the form asks", async () => {
  stubApi({ reset: resetOk });

  await resetPassword(submission);

  assert.equal(writes("/api/v1/reset-password").length, 1);
  assert.equal(writes("/api/v1/login").length, 0);
});
