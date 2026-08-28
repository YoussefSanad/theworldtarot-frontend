import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { ApiError, ApiRateLimitError, ApiValidationError } from "./api-write.ts";
import { readPasswordFailure, resetPassword, setPassword } from "./passwords.ts";

type Call = { url: string; init: RequestInit };

const realFetch = globalThis.fetch;
const realDocument = globalThis.document;

let calls: Call[] = [];

/**
 * Stubbed at the network, not at `apiWrite`, for the same reason the order
 * tests are: what the backend refuses is the request that actually leaves.
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

const submission = {
  token: "from-the-link",
  email: "jane@example.com",
  password: "a-long-enough-one",
  passwordConfirmation: "a-long-enough-one",
};

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://staging-api.theworldtarot.com";
  globalThis.document = { cookie: "XSRF-TOKEN=token" } as Document;
});

after(() => {
  globalThis.fetch = realFetch;
  globalThis.document = realDocument;
});

test("claims an account at the set-password endpoint, sending the link's pair unchanged", async () => {
  stubFetch(new Response(null, { status: 204 }), json({ message: "Your account is ready." }));

  await setPassword(submission);

  const write = calls[1];
  assert.equal(write.url, "https://staging-api.theworldtarot.com/api/v1/set-password");
  assert.deepEqual(JSON.parse(String(write.init.body)), {
    token: "from-the-link",
    email: "jane@example.com",
    password: "a-long-enough-one",
    password_confirmation: "a-long-enough-one",
  });
});

test("a reset is the other endpoint and the same body", async () => {
  stubFetch(new Response(null, { status: 204 }), json({ message: "Your password has been changed." }));

  await resetPassword(submission);

  assert.equal(calls[1].url, "https://staging-api.theworldtarot.com/api/v1/reset-password");
  assert.equal(
    JSON.parse(String(calls[1].init.body)).password_confirmation,
    "a-long-enough-one",
  );
});

test("a password rule failure is keyed to the field the backend named", () => {
  const failure = readPasswordFailure(
    new ApiValidationError("The given data was invalid.", {
      password: ["The password must be at least 8 characters."],
    }),
  );

  assert.deepEqual(failure, {
    kind: "fields",
    errors: { password: ["The password must be at least 8 characters."] },
  });
});

/*
  The three ways a link dies. Each arrives keyed to `email` with a message
  naming which, and each has to read identically to the page, so the assertion
  worth making is that nothing from the body survives this call.
*/
for (const [reason, message] of [
  ["a used token", "This password reset token is invalid."],
  ["an expired token", "This password reset token is invalid."],
  ["an account already claimed", "This link is no longer valid. Ask for a new one from the sign in page."],
] as const) {
  test(`${reason} reads as a dead link and discloses nothing`, () => {
    const failure = readPasswordFailure(new ApiValidationError(message, { email: [message] }));

    assert.deepEqual(failure, { kind: "link" });
  });
}

test("a rate limit keeps its Retry-After and stays distinguishable from a dead link", () => {
  const failure = readPasswordFailure(new ApiRateLimitError("Too many attempts.", 42));

  assert.deepEqual(failure, { kind: "rate-limited", retryAfterSeconds: 42 });
});

test("anything else is unknown, carrying no backend message to render", () => {
  assert.deepEqual(readPasswordFailure(new ApiError(500, "Server Error")), { kind: "unknown" });
  assert.deepEqual(readPasswordFailure(new TypeError("Failed to fetch")), { kind: "unknown" });
});
