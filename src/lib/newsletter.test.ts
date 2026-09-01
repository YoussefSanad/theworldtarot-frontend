import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { ApiError, ApiRateLimitError, ApiValidationError } from "./api-write.ts";
import { readNewsletterFailure, subscribeToNewsletter } from "./newsletter.ts";

type Call = { url: string; init: RequestInit };

const realFetch = globalThis.fetch;
const realDocument = globalThis.document;
const realSessionStorage = globalThis.sessionStorage;
const realNodeEnv = process.env.NODE_ENV;

let calls: Call[] = [];

/**
 * Stubbed at the network rather than at `apiWrite`, the way the password and
 * order tests are: what the backend refuses is the request that actually
 * leaves, and the CSRF handshake is part of what leaves.
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

/** The 202 the endpoint answers every accepted address with. */
function accepted(): Response {
  return new Response(JSON.stringify({ subscribed: true }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
}

/** The seam's opening handshake, which every write pays before its own request. */
function csrfCookie(): Response {
  return new Response(null, { status: 204 });
}

function writtenBody(): unknown {
  return JSON.parse(String(calls[1].init.body));
}

/**
 * `next-env.d.ts` types NODE_ENV read-only, and the guard under test reads it.
 * The cast is the whole of the workaround.
 */
function setNodeEnv(value: string | undefined): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://staging-api.theworldtarot.com";
  globalThis.document = { cookie: "XSRF-TOKEN=token" } as Document;
  // The simulation below owns the development case. Everything else here is
  // about the request that leaves, so these run as a deployed build does.
  setNodeEnv("production");
});

after(() => {
  globalThis.fetch = realFetch;
  globalThis.document = realDocument;
  globalThis.sessionStorage = realSessionStorage;
  setNodeEnv(realNodeEnv);
});

test("posts the address to the flat newsletter route, with no locale segment", async () => {
  stubFetch(csrfCookie(), accepted());

  await subscribeToNewsletter({ email: "jennifer@example.com" });

  assert.equal(calls[1].url, "https://staging-api.theworldtarot.com/api/v1/newsletter");
  assert.equal(calls[1].init.method, "POST");
});

test("consent is sent as true, because a submit event cannot happen without the box", async () => {
  stubFetch(csrfCookie(), accepted());

  await subscribeToNewsletter({ email: "jennifer@example.com" });

  assert.deepEqual(writtenBody(), { email: "jennifer@example.com", consent: true });
});

test("the first name travels as `name`, which is what this form adds to the coming-soon one", async () => {
  stubFetch(csrfCookie(), accepted());

  await subscribeToNewsletter({ email: "jennifer@example.com", name: "Jennifer" });

  assert.deepEqual(writtenBody(), {
    email: "jennifer@example.com",
    consent: true,
    name: "Jennifer",
  });
});

/*
  The field is optional on both sides, and the contract says an absent name may
  be omitted entirely. A blank one has to be omitted rather than sent as "",
  which would land in the audience as a contact whose first name is an empty
  string.
*/
for (const [shape, name] of [
  ["left empty", ""],
  ["only spaces", "   "],
  ["absent altogether", undefined],
] as const) {
  test(`a first name ${shape} is left out of the request`, async () => {
    stubFetch(csrfCookie(), accepted());

    await subscribeToNewsletter({ email: "jennifer@example.com", name });

    assert.deepEqual(Object.keys(writtenBody() as object).sort(), ["consent", "email"]);
  });
}

test("a name is trimmed, so trailing space cannot reach the audience", async () => {
  stubFetch(csrfCookie(), accepted());

  await subscribeToNewsletter({ email: "jennifer@example.com", name: "  Jennifer " });

  assert.equal((writtenBody() as { name: string }).name, "Jennifer");
});

test("a 202 resolves, since accepted is the strongest thing the endpoint claims", async () => {
  stubFetch(csrfCookie(), accepted());

  await assert.doesNotReject(subscribeToNewsletter({ email: "jennifer@example.com" }));
});

test("an address the backend refuses reads as an address failure", () => {
  const failure = readNewsletterFailure(
    new ApiValidationError("The given data was invalid.", {
      email: ["The email field must be a valid email address."],
    }),
  );

  assert.deepEqual(failure, { kind: "address" });
});

/*
  A 422 that names anything but the address is our bug, not the visitor's. The
  consent flag is hardcoded true and the name field is capped at the length the
  backend asks for, so neither can fail on a submission this form produced —
  and telling somebody their address is wrong when it is not would send them
  editing a field that is already correct.
*/
test("a 422 about anything other than the address is unknown, not an address failure", () => {
  const failure = readNewsletterFailure(
    new ApiValidationError("The given data was invalid.", {
      consent: ["The consent field must be accepted."],
    }),
  );

  assert.deepEqual(failure, { kind: "unknown" });
});

/*
  Kept apart from a refused address because the two ask for different things:
  one says check what you typed, the other says wait. The `Retry-After` the seam
  parsed is deliberately dropped — the window is a fixed minute, the sentence
  says so, and the header is absent often enough that nothing could rely on it.
*/
test("six a minute is a rate limit, and reads as one whether or not a wait came with it", () => {
  assert.deepEqual(readNewsletterFailure(new ApiRateLimitError("Too many attempts.", 37)), {
    kind: "rate-limited",
  });
  assert.deepEqual(readNewsletterFailure(new ApiRateLimitError("Too many attempts.", undefined)), {
    kind: "rate-limited",
  });
});

test("anything else is unknown, carrying no backend message to render", () => {
  assert.deepEqual(readNewsletterFailure(new ApiError(500, "Server Error")), { kind: "unknown" });
  assert.deepEqual(readNewsletterFailure(new TypeError("Failed to fetch")), { kind: "unknown" });
});

/*
  The guard that keeps `next dev` out of the audience. Both deployed
  environments share one Mailchimp list — the one Jennifer mails — so a
  developer exercising this form for real would be adding contacts to it. The
  assertion worth making is the negative one: nothing reaches the network.
*/
test("in development nothing is sent at all, and the signup is simulated instead", async () => {
  setNodeEnv("development");
  stubFetch();
  globalThis.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
  } as unknown as Storage;

  await subscribeToNewsletter({ email: "jennifer@example.com" });

  assert.deepEqual(calls, []);
});
