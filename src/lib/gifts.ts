/**
 * Looking a **gift code** up, and spending it.
 *
 * The two writes `/redeem/` is made of. Both go through `api-write.ts`, so the
 * CSRF handshake and the typed refusals are not restated here — what is here is
 * the pair of shapes those refusals mean something in.
 *
 * ## Two calls, and they may never become one
 *
 * **Resolving a code must not spend it.** Email scanners and link prefetchers
 * follow links, so a page that redeemed on arrival would hand a present to
 * whatever opened the mail first — and with no expiry and no refunds there is
 * nothing to put that right with. So `lookUpGift` runs when the page loads and
 * `redeemGift` runs on submit, and nothing here offers a way to do both at
 * once. See `docs/adr/0003-redemption-is-a-page-of-its-own.md`.
 *
 * ## Both are POSTs, and the code is in the body
 *
 * A gift code is a bearer credential. A path segment or a query string is
 * written into every access log and every proxy between the browser and the
 * API, and `POST /orders/status` already takes the **pay token** in a body for
 * the same reason.
 *
 * **It arrives in a query string on our side and that is a different bargain**,
 * argued in the ADR: a static export cannot pre-render a path segment per code,
 * and a browser history entry is a cost worth paying for a gift code where it
 * would not be for a pay token. What this file must not do is add a second
 * place it leaks to.
 *
 * ## What is sent is what was typed
 *
 * The backend normalises before it looks anything up — uppercased,
 * non-alphanumerics stripped, `I` and `L` read as `1`, `O` as `0` — so
 * `k7m4 9pqr 2xyz`, `K7M4-9PQR-2XYZ` and `k7m49pqr2xyz` are one code.
 * `API_CONTRACT.md` is explicit that we should be forgiving and **not**
 * reproduce that rule: a second implementation of an alphabet is a second
 * implementation to drift. So this trims and sends, and the printed form comes
 * back on the answer for the page to show.
 *
 * ## Three answers, not an exception each
 *
 * A code that does not resolve and a code already spent are both ordinary
 * things for a person holding a piece of paper, and neither is a fault. They
 * come back as states rather than as thrown errors so that `/redeem/` reads
 * them the way it reads a found one — the same shape `lib/product.ts` uses for
 * a withdrawn product, and for the same reason.
 *
 * What still throws is everything that says nothing about the code: a 429, a
 * 5xx, a network failure. Those are the cases where the page has to say it does
 * not know rather than that the code is no good.
 */

import { ApiError, apiWrite } from "./api-write.ts";
import { DEFAULT_LOCALE, type Locale } from "./locale.ts";

/** What a code is worth, as the lookup answers it. */
export type Gift = {
  /**
   * The code in its printed form, `XXXX-XXXX-XXXX`, as the backend groups it.
   *
   * Answered rather than echoed so the page can show what was resolved from
   * whatever the visitor typed or whatever the link carried. It is the same
   * credential in a tidier shape, so it is shown and never logged.
   */
  code: string;
  /** The **product key** this gift is for. Permanent and untranslated. */
  productKey: string;
  /**
   * The reading's name, in the language of the path.
   *
   * **It comes back with the code rather than being fetched by key**, and that
   * is not a convenience: a code for a withdrawn product still redeems, because
   * the person paid, and `/products/{key}` answers 404 for anything
   * unpublished. A page that went there for the name would be a present that
   * cannot be opened.
   */
  name: string;
  shortDescription: string;
  longDescription: string;
  /**
   * Whether it has already been spent, answered in full and without hedging.
   *
   * That is a state the real recipient has to be told about in plain words, so
   * it cannot hide behind the answer an unknown code gets. What closes the
   * oracle it creates is the entropy in the code itself, plus the backend's
   * throttle.
   */
  redeemed: boolean;
  /** When, as an ISO 8601 string, or `null` on a gift nobody has spent. */
  redeemedAt: string | null;
};

/**
 * What a code resolved to, or that it resolved to nothing.
 *
 * **There is no expired state**, here or anywhere else in this feature. Gift
 * codes do not expire — see the backend's
 * `docs/adr/0005-gift-codes-do-not-expire.md` — and building the state is how a
 * concept gets into a product that decided against it.
 */
export type GiftLookup = { state: "found"; gift: Gift } | { state: "unknown" };

/** The reading a spent code made, which is the whole of the confirmation. */
export type AskedReading = {
  productKey: string;
  name: string;
  /** Echoed back, so the confirmation can show somebody what they asked. */
  question: string;
  /** Where it will be sent — the **querent**'s address, not the recipient's. */
  querentEmail: string;
  /**
   * When the reading was asked for, as an ISO 8601 string. **The moment the
   * clock starts**, and the reason a delivery window may be stated relative to
   * it as a property of the reading rather than as a promise this call makes.
   * The promise is made once, in the mail the backend sends the querent.
   */
  askedAt: string;
};

/**
 * What a **querent** says when they spend a code: the question, where the
 * reading goes, and optionally who they are.
 *
 * A type rather than three parameters, because the three travel together
 * everywhere — off the form, through the panel, into the request — and were
 * being respelled at each stop. The code is not in it: that is what the page
 * holds and the visitor never retypes, so it joins the three at the one place
 * they become a request.
 */
export type Asking = {
  /**
   * **Required here, where a buyer's question is optional.** This is the
   * asking, and a reading without a question is not one.
   */
  question: string;
  /** Where the reading goes. The querent's own, never the recipient's. */
  querentEmail: string;
  /** Optional, exactly as a buyer's name is. */
  querentName?: string;
};

/**
 * What spending a code did.
 *
 * `spent` is the backend's 409 and is **not** its 404: the difference between
 * "you mistyped it" and "this has already been used" is exactly what the real
 * recipient needs to be told. It reaches here on a code that was fine at lookup
 * and was redeemed in between — a second tab, or somebody else the mail was
 * forwarded to — which is a race the backend settles with a row lock and
 * this page has to be able to report.
 */
export type GiftRedemption =
  | { state: "asked"; reading: AskedReading }
  | { state: "spent" }
  | { state: "unknown" };

/** The lookup's answer, on the wire. */
type ApiGift = {
  code: string;
  product: string;
  name: string;
  short_description: string;
  long_description: string;
  redeemed: boolean;
  redeemed_at: string | null;
};

/** The redemption's answer, on the wire. */
type ApiAskedReading = {
  product: string;
  name: string;
  question: string;
  querent_email: string;
  asked_at: string;
};

function toGift(answer: ApiGift): Gift {
  return {
    code: answer.code,
    productKey: answer.product,
    name: answer.name,
    shortDescription: answer.short_description,
    longDescription: answer.long_description,
    redeemed: answer.redeemed,
    redeemedAt: answer.redeemed_at,
  };
}

function toAskedReading(answer: ApiAskedReading): AskedReading {
  return {
    productKey: answer.product,
    name: answer.name,
    question: answer.question,
    querentEmail: answer.querent_email,
    askedAt: answer.asked_at,
  };
}

/**
 * What a code is worth, without spending it.
 *
 * `unknown` covers a code that never existed, one mistyped past reading, and
 * one whose money never arrived. The backend answers all three the same way
 * deliberately: telling them apart is a way of asking whether a guess got
 * closer.
 *
 * Throws on anything else — a 429 from the tighter of the two throttles, a
 * 5xx, a network failure — because none of those says anything about the code,
 * and a page that rendered "no such code" from a 503 would be telling somebody
 * their present does not exist.
 */
export async function lookUpGift(
  code: string,
  { locale = DEFAULT_LOCALE }: { locale?: Locale } = {},
): Promise<GiftLookup> {
  try {
    return { state: "found", gift: toGift(await apiWrite<ApiGift>(giftPath(locale, "lookup"), { code: code.trim() })) };
  } catch (refusal: unknown) {
    if (refusal instanceof ApiError && refusal.status === 404) return { state: "unknown" };

    throw refusal;
  }
}

/**
 * Spending the code, which is the moment the reading is **asked** for.
 *
 * **The only call that spends it, and it happens on submit.** Never on arrival;
 * see the header.
 *
 * `question` is required here where a buyer's is optional, because this is the
 * asking and a reading without a question is not one. `querentName` is
 * optional, exactly as a buyer's name is.
 *
 * **The answer is the confirmation.** There is no second call, and in
 * particular not `POST /orders/status`: that reports a payment, and the payment
 * behind a redeemed gift happened months earlier to somebody else.
 */
export async function redeemGift(
  asking: Asking & { code: string },
  { locale = DEFAULT_LOCALE }: { locale?: Locale } = {},
): Promise<GiftRedemption> {
  const named = asking.querentName?.trim();

  try {
    const answer = await apiWrite<ApiAskedReading>(giftPath(locale, "redeem"), {
      code: asking.code.trim(),
      question: asking.question.trim(),
      querent_email: asking.querentEmail.trim(),
      // Absent rather than empty, as an order's name is: an empty string is a
      // name to a validator, and the backend's greeting already opens "Hello,"
      // for somebody who gave none.
      ...(named ? { querent_name: named } : {}),
    });

    return { state: "asked", reading: toAskedReading(answer) };
  } catch (refusal: unknown) {
    if (refusal instanceof ApiError && refusal.status === 409) return { state: "spent" };
    if (refusal instanceof ApiError && refusal.status === 404) return { state: "unknown" };

    throw refusal;
  }
}

/**
 * The day a code was spent, written the way the site writes dates, or `null`
 * where there is no day to write.
 *
 * **A date and not a time.** What the sentence it goes in is for is letting
 * somebody work out whether the redemption was theirs, and an hour and a
 * minute in a timezone that may not be theirs answers a question nobody asked.
 *
 * **Against the site's locale rather than the browser's**, which is the rule
 * `formatPrice` already follows and for the same reason: a visitor whose laptop
 * is set to German is reading English copy, and one date in the middle of it
 * written their laptop's way is a seam.
 *
 * `null` for a gift nobody has spent, and for a string that is not a date —
 * which is a shape from some other build rather than something to render as
 * `Invalid Date` in the middle of a sentence. The caller has a dateless
 * wording for both.
 */
export function redeemedOn(iso: string | null, locale: Locale = DEFAULT_LOCALE): string | null {
  if (iso === null) return null;

  const when = new Date(iso);

  if (Number.isNaN(when.getTime())) return null;

  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(when);
}

/**
 * **Behind the language segment**, unlike orders and payment, because these two
 * genuinely answer content: the reading's name and copy come back with the
 * lookup, in the language the visitor opened the link in.
 */
function giftPath(locale: Locale, action: "lookup" | "redeem"): string {
  return `/api/v1/${locale}/gifts/${action}`;
}
