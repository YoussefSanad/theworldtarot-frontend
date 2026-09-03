import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { ApiRateLimitError } from "./api-write.ts";
import { lookUpGift, redeemedOn, redeemGift } from "./gifts.ts";

/**
 * The two calls `/redeem/` is made of, driven through the write seam rather
 * than around it.
 *
 * Stubbed at the network for the reason `orders.test.ts` gives: the request
 * that actually leaves the browser is the thing the backend refuses or accepts,
 * and the CSRF handshake in front of it is part of what leaves.
 *
 * **What is being pinned here is a set of statuses, not a set of shapes.** A
 * 404 and a 409 are two sentences a real recipient reads about their present —
 * "there is no such code" and "this has already been used" — and the whole
 * argument for the 409 existing at all is that those two must never be
 * collapsed. Getting the mapping wrong is silent: the page renders a plausible
 * refusal either way.
 */

type Call = { url: string; init: RequestInit };

const realFetch = globalThis.fetch;
const realDocument = globalThis.document;

let calls: Call[] = [];

function stubFetch(...responses: (Response | Error)[]): void {
  const queue = [...responses];

  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });

    const next = queue.shift();
    if (!next) throw new Error(`Unexpected fetch to ${String(input)}.`);
    if (next instanceof Error) throw next;

    return next;
  }) as typeof fetch;
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/** The handshake every write makes first, so the write itself is `calls[1]`. */
const handshake = () => new Response(null, { status: 204 });

/** The worked example from `API_CONTRACT.md`, so the shape comes from the spec. */
const looked = {
  code: "K7M4-9PQR-2XYZ",
  product: "month-ahead",
  name: "THE MONTH AHEAD",
  short_description: "One month, five cards.",
  long_description: "A written reading of the weeks to come.",
  redeemed: false,
  redeemed_at: null,
};

const asked = {
  product: "month-ahead",
  name: "THE MONTH AHEAD",
  question: "What should I focus on this month?",
  querent_email: "sam@example.com",
  asked_at: "2026-12-24T10:03:11+00:00",
};

function sent(): unknown {
  return JSON.parse(String(calls[1].init.body));
}

beforeEach(() => {
  calls = [];
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://staging-api.theworldtarot.com";
  globalThis.document = { cookie: "XSRF-TOKEN=token" } as Document;
});

after(() => {
  globalThis.fetch = realFetch;
  globalThis.document = realDocument;
});

test("a code is looked up behind the language segment, in the body", async () => {
  /*
    **Behind the locale, unlike orders and payment**, because these two answer
    content: the reading's name and copy come back with the code, in whatever
    language the visitor opened the link in.

    **And in the body rather than in the path**, because a gift code is a bearer
    credential and a path segment is written into every access log and every
    proxy between here and the API.
  */
  stubFetch(handshake(), json(looked));

  await lookUpGift("K7M4-9PQR-2XYZ", { locale: "en" });

  assert.equal(calls[1].url, "https://staging-api.theworldtarot.com/api/v1/en/gifts/lookup");
  assert.equal(calls[1].init.method, "POST");
  assert.deepEqual(sent(), { code: "K7M4-9PQR-2XYZ" });
});

test("what was typed is what is sent, trimmed and not normalised", async () => {
  /*
    **Both halves of "be forgiving" in one assertion.** The backend uppercases,
    strips everything that is not a letter or a digit, and reads `I`/`L` as `1`
    and `O` as `0` — so a code typed off the mail with its spaces and its lower
    case resolves. `API_CONTRACT.md` says not to reproduce that rule, because a
    second implementation of an alphabet is a second one to drift from the
    first, so nothing here refuses the spaces and nothing here removes them.

    The trim is the exception, and it is not normalising: it is the space a
    paste or a mobile keyboard leaves on the end, which no reading of the code
    wants.
  */
  stubFetch(handshake(), json(looked));

  await lookUpGift("  k7m4 9pqr 2xyz  ");

  assert.deepEqual(sent(), { code: "k7m4 9pqr 2xyz" });
});

test("the answer comes back in this codebase's words, with the printed code on it", async () => {
  // The printed form is answered rather than echoed, so the page can show what
  // was resolved from whatever the link carried.
  stubFetch(handshake(), json(looked));

  assert.deepEqual(await lookUpGift("k7m49pqr2xyz"), {
    state: "found",
    gift: {
      code: "K7M4-9PQR-2XYZ",
      productKey: "month-ahead",
      name: "THE MONTH AHEAD",
      shortDescription: "One month, five cards.",
      longDescription: "A written reading of the weeks to come.",
      redeemed: false,
      redeemedAt: null,
    },
  });
});

test("a spent code says so on the lookup, and says when", async () => {
  /*
    **It does not hedge, and it must not.** "Already redeemed" is a state the
    real recipient has to be told about in plain words, so it cannot hide behind
    the answer an unknown code gets — the entropy in the code is what closes the
    oracle that creates.
  */
  stubFetch(handshake(), json({ ...looked, redeemed: true, redeemed_at: "2026-12-24T10:03:11+00:00" }));

  const answer = await lookUpGift("K7M4-9PQR-2XYZ");

  assert.equal(answer.state === "found" && answer.gift.redeemed, true);
  assert.equal(answer.state === "found" && answer.gift.redeemedAt, "2026-12-24T10:03:11+00:00");
});

test("a 404 is an unknown code rather than a thrown error", async () => {
  // A code that never existed, one mistyped past reading, and one whose money
  // never arrived all answer this way. None of the three is a fault, and the
  // page reads them the way it reads a found one.
  stubFetch(handshake(), json({ message: "No present was found for that code." }, 404));

  assert.deepEqual(await lookUpGift("nonsense"), { state: "unknown" });
});

test("a throttled lookup throws rather than reading as a bad code", async () => {
  /*
    **The distinction this whole union exists for.** A 429 says nothing about
    the code, and a page that rendered "no such code" from one would be telling
    somebody their present does not exist because they typed too fast.
  */
  stubFetch(handshake(), json({ message: "Too many attempts." }, 429, { "Retry-After": "43" }));

  const refusal = await lookUpGift("K7M4-9PQR-2XYZ").catch((thrown: unknown) => thrown);

  assert.ok(refusal instanceof ApiRateLimitError);
  assert.equal(refusal.retryAfterSeconds, 43);
});

test("a 500 throws too, for the same reason", async () => {
  stubFetch(handshake(), json({ message: "Server error." }, 500));

  await assert.rejects(lookUpGift("K7M4-9PQR-2XYZ"));
});

test("redeeming sends the question, the querent and the code", async () => {
  stubFetch(handshake(), json(asked));

  await redeemGift(
    {
      code: "K7M4-9PQR-2XYZ",
      question: "  What should I focus on this month?  ",
      querentEmail: " sam@example.com ",
      querentName: "Sam",
    },
    { locale: "en" },
  );

  assert.equal(calls[1].url, "https://staging-api.theworldtarot.com/api/v1/en/gifts/redeem");
  assert.deepEqual(sent(), {
    code: "K7M4-9PQR-2XYZ",
    question: "What should I focus on this month?",
    querent_email: "sam@example.com",
    querent_name: "Sam",
  });
});

test("a querent who gave no name sends no name at all", async () => {
  // Absent rather than empty, as an order's name is. An empty string is a name
  // to a validator, and the backend's greeting already opens "Hello," for
  // somebody who gave none.
  stubFetch(handshake(), json(asked));

  await redeemGift({ code: "K7M4-9PQR-2XYZ", question: "What next?", querentEmail: "sam@example.com" });

  assert.equal("querent_name" in (sent() as object), false);
});

test("and neither does one who gave only spaces", async () => {
  stubFetch(handshake(), json(asked));

  await redeemGift({
    code: "K7M4-9PQR-2XYZ",
    question: "What next?",
    querentEmail: "sam@example.com",
    querentName: "   ",
  });

  assert.equal("querent_name" in (sent() as object), false);
});

test("the answer is the confirmation, and it carries the moment the clock starts", async () => {
  /*
    There is no second call. `POST /orders/status` reports a payment, and the
    payment behind a redeemed gift happened months earlier to somebody else —
    the contract says so in as many words.

    `askedAt` is here so a delivery window can be stated relative to it as a
    property of the reading. The promise itself is made once, in the mail the
    backend sends the querent.
  */
  stubFetch(handshake(), json(asked));

  assert.deepEqual(
    await redeemGift({ code: "K7M4-9PQR-2XYZ", question: "What next?", querentEmail: "sam@example.com" }),
    {
      state: "asked",
      reading: {
        productKey: "month-ahead",
        name: "THE MONTH AHEAD",
        question: "What should I focus on this month?",
        querentEmail: "sam@example.com",
        askedAt: "2026-12-24T10:03:11+00:00",
      },
    },
  );
});

test("a 409 is a code already spent, and is not the 404 beside it", async () => {
  /*
    **The one mapping in this file that would go wrong silently.** The backend
    answers 409 rather than 404 precisely because the difference between "you
    mistyped it" and "this has already been used" is what the real recipient
    needs to be told, and both statuses would render a plausible refusal.

    It reaches here on a code that was fine at lookup and was spent in between —
    a second tab, or somebody the mail was forwarded to. Redemption is atomic,
    so exactly one of those wins and the other reads this.
  */
  stubFetch(handshake(), json({ message: "Already redeemed.", errors: { code: ["Already redeemed."] } }, 409));

  assert.deepEqual(
    await redeemGift({ code: "K7M4-9PQR-2XYZ", question: "What next?", querentEmail: "sam@example.com" }),
    { state: "spent" },
  );
});

test("and a 404 on submit is still an unknown code", async () => {
  stubFetch(handshake(), json({ message: "No present was found for that code." }, 404));

  assert.deepEqual(
    await redeemGift({ code: "nonsense", question: "What next?", querentEmail: "sam@example.com" }),
    { state: "unknown" },
  );
});

test("a refused redemption that says nothing about the code throws", async () => {
  // A 422 on the question, a 429, a 5xx. None of them is an answer about the
  // code, and none of them may be shown as one.
  stubFetch(handshake(), json({ message: "The question field is required.", errors: {} }, 422));

  await assert.rejects(
    redeemGift({ code: "K7M4-9PQR-2XYZ", question: "", querentEmail: "sam@example.com" }),
  );
});

test("a network failure throws rather than resolving to anything", async () => {
  stubFetch(handshake(), new TypeError("Failed to fetch"));

  await assert.rejects(
    lookUpGift("K7M4-9PQR-2XYZ"),
    (thrown: unknown) => thrown instanceof TypeError,
  );
});

test("the day a code was spent is written the site's way, not the browser's", () => {
  // The rule `formatPrice` already follows: the currency varies by visitor, the
  // language it is written in does not, and one date set the laptop's way in
  // the middle of English copy is a seam.
  assert.equal(redeemedOn("2026-12-24T10:03:11+00:00", "en"), "December 24, 2026");
});

test("a gift nobody has spent has no day to write", () => {
  assert.equal(redeemedOn(null), null);
});

test("and a string that is not a date renders no sentence at all", () => {
  // A shape from some other build. `Invalid Date` in the middle of a sentence
  // is worse than the dateless wording the caller already has.
  assert.equal(redeemedOn("the day before yesterday"), null);
});
