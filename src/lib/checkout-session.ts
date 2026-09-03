/**
 * ~~The one thing a checkout leaves behind in the tab it was started in.~~
 * **Two things the tab holds for one screen, from 3 September 2026** (#82): a
 * checkout's record, and a **redemption**'s beside it. The second is at the
 * foot of this file and is not a checkout — no money moves on that road, and
 * there is nothing to verify afterwards — but it is read by the same screen at
 * the same address, and a module of its own holding one `sessionStorage` key
 * for one page would be a second file to keep in step with this one.
 *
 * The confirmation screen has nothing else to read from. There is no endpoint
 * that reads an **order** back and there is deliberately not going to be one, so
 * everything the screen needs that the address bar does not carry — the **Money**
 * the customer agreed to, and the **pay token** the status endpoint takes — is
 * written here before the browser leaves for Stripe and read back when it
 * returns.
 *
 * ## sessionStorage, and none of the alternatives
 *
 * `localStorage` outlives the tab, which would mean a confirmation for a
 * purchase made yesterday sitting there waiting to be shown against today's
 * URL. A cookie would be sent to the API on every request, and one field of
 * this record is a credential. sessionStorage dies with the tab and survives a
 * reload, which is exactly the lifetime the screen wants: **the record is not
 * erased when the confirmation renders**, or a reload would land on a page with
 * nothing to say.
 *
 * **It also survives the round trip to Stripe.** It is scoped to the tab rather
 * than to the document, so a cross-origin navigation and a return does not
 * clear it — which is what makes it readable on the way back from a **hosted
 * page**, and readable by the reading page a cancelled checkout lands on.
 *
 * ## The pay token is in here and never in the URL
 *
 * It is the whole authority to pay an order (see `CONTEXT.md`). A redirect
 * return is a URL Stripe builds and the browser keeps in history, and an
 * address bar is the one place this string may not go. Storage is not
 * encryption — anything running on our origin can read this — but it is not a
 * shareable, loggable, referrer-leaking address either.
 */

import type { Money } from "./price.ts";

const KEY = "checkout";

export type CheckoutRecord = {
  /**
   * The **pay token** of the order being paid. It is what the status endpoint
   * takes, and what a retry uses to start a fresh payment without placing a
   * second order. Never rendered, never logged, never put in a URL.
   */
  payToken: string;
  /** What the customer agreed to pay, as the backend priced it. */
  money: Money;
  /**
   * The Checkout Session's id, which is also what Stripe hands back to
   * `success_url`. **The stale-result guard turns on it**, and it is used for
   * nothing else: it is opaque, nothing on the backend maps one to an order,
   * and it is never sent anywhere.
   *
   * **Optional, because the question matters more than it does.** It is read
   * out of the redirect's address, and a redirect shaped in some way
   * `sessionIdFrom` does not recognise leaves nothing to read. A record without
   * one can confirm nothing — `checkoutFor` withholds it from every Session,
   * which is the honest answer for a payment that cannot be identified — but it
   * still carries the question home from a cancelled checkout, and losing
   * several sentences of typed question silently is the worse of the two by a
   * distance. The wallet road writes no Session id either.
   */
  sessionId?: string;
  /**
   * The **product key** of the reading this was started from. It is what says
   * which page the question below belongs to, so a cancelled checkout cannot
   * put one reading's question into another reading's textarea.
   */
  productKey: string;
  /**
   * What the customer typed, restored on cancel. Absent when they typed
   * nothing, which is the ordinary case for an optional question.
   */
  question?: string;
  /**
   * Whether this checkout was a present rather than a purchase.
   *
   * ~~Whether the `question` above is a gift note this code composed.~~
   * **Struck 3 September 2026**, when the present became `lines[].gift` on the
   * order and stopped being a sentence in the question field. There is no
   * composed note left for this to tell apart from a typed one.
   *
   * **It did not go with the note.** Its reader is now the **confirmation**,
   * which is reached after a round trip to Stripe from a payment that names
   * nothing about a gift, and has this record and nothing else to know it was
   * one. `questionFor` below still refuses a gift record, which is now belt and
   * braces — a gift writes no question here at all — and is kept because the
   * two facts are still separate ones.
   *
   * Absent on every self-purchase, which is what keeps a record written before
   * 30 August 2026 readable.
   */
  gift?: boolean;
  /**
   * The **recipient**'s address, on a gift order where the buyer typed one.
   *
   * **The one thing on this record that is read by a customer**, and it is here
   * because the confirmation has no other way to it. A gift buyer is owed the
   * address their present went to — it is the whole of what they bought and the
   * one detail they can still get wrong — and the screen is reached after a
   * round trip to Stripe, from a payment that names nothing about a gift.
   *
   * **Written from the present the order carried**, since 3 September 2026, so
   * this screen cannot name an address the backend was never sent. It used to
   * be lifted out of a composed sentence's neighbourhood in `lib/buy.ts`; it is
   * now `gift.recipient_email`, read off the one object both roads send.
   *
   * **It outlives the question.** `forgetQuestion` drops the question once the
   * money has moved, and a reload of the confirmation still has to name where
   * the gift went, so this is not in that sentence's fields.
   *
   * Absent on every self-purchase and on a gift the buyer left blank, which is
   * also what keeps a record written before 3 September 2026 readable. See
   * `OrderNote` in `lib/order-note.ts`.
   */
  giftRecipient?: string;
  /**
   * The PaymentIntent's client secret. **Optional, and written on the wallet
   * road only** — a hosted Session leaves no secret on the client.
   *
   * It is what tells the two roads apart on the way home. A wallet payment
   * leaves this and no Session id; a card payment leaves a Session id and no
   * secret. `walletCheckoutFor` derives the intent id from it and matches that
   * against the address Stripe returns to, which is the wallet road's
   * stale-result guard and the card road's `sessionId` under another name.
   *
   * **Not shown, not logged, and not sent anywhere.** It is a bearer credential
   * scoped to one intent. Stripe puts it in the return address itself, which is
   * why the confirmation reads `payment_intent` out of that address and never
   * this — an id identifies the payment without being the authority to confirm
   * it.
   */
  clientSecret?: string;
};

/**
 * `https://checkout.stripe.com/c/pay/cs_test_a1#fidkd…` becomes `cs_test_a1`.
 *
 * The Session's id is not answered as a field of its own — `/pay` gives an
 * address and nothing else — so the one place it can be had before the browser
 * leaves is the address itself. **The path only**: the fragment is an opaque
 * blob of Stripe's, and matching inside it would let something that is not an
 * id stand in for the value the whole guard turns on.
 *
 * `null` when there is no id to be had, which the caller treats as a checkout
 * that cannot be remembered rather than as one that cannot proceed.
 *
 * This replaced `paymentIntentId`, which derived the same guard from a client
 * secret. **That road returned on 29 August 2026 and so did the function** —
 * `paymentIntentFrom`, below.
 */
export function sessionIdFrom(redirectUrl: string): string | null {
  let path: string;

  try {
    path = new URL(redirectUrl).pathname;
  } catch {
    return null;
  }

  const found = path.match(/cs_[A-Za-z0-9_]+/);

  return found ? found[0] : null;
}

/**
 * `pi_3Abc123_secret_XyZ789` becomes `pi_3Abc123`.
 *
 * The wallet road's half of the guard. Stripe appends `payment_intent` to the
 * address it returns to, and what the tab holds is the **secret** — so the two
 * are compared by deriving the id from the secret rather than by storing the id
 * as a second field that could disagree with it.
 *
 * **The part before `_secret_`, and nothing cleverer.** A client secret is an
 * intent id, that separator, and an opaque tail; matching `pi_[A-Za-z0-9]+`
 * against the whole string would also match inside the tail on a secret whose
 * id it did not begin with. Splitting on the separator is the only reading that
 * cannot produce an id the secret does not belong to.
 *
 * `null` when there is no separator to split on, which the caller treats the
 * way it treats a card record with no Session id: a payment it cannot identify,
 * and therefore one it may show nothing about.
 */
export function paymentIntentFrom(clientSecret: string): string | null {
  const [id, ...rest] = clientSecret.split("_secret_");

  if (rest.length === 0 || !id.startsWith("pi_")) return null;

  return id;
}

/**
 * Writes the record, replacing whatever was there.
 *
 * **Replacing is the point.** A second purchase in the same tab overwrites the
 * first, so there is never a stale record for the confirmation to read; and
 * because the screen compares session ids before it trusts the money, a record
 * from the *newer* purchase cannot be shown against an older purchase's URL
 * either.
 *
 * Its caller is the panel's checkout button, which writes this immediately
 * before it sends the browser to Stripe — **before**, because after the
 * navigation there is no code of ours left running to write anything.
 */
export function rememberCheckout(record: CheckoutRecord): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // A browser with storage refused (Safari's private mode has historically
    // thrown on write, and an embedded webview may have it off entirely). The
    // payment itself does not depend on this: the customer still reaches
    // Stripe, still pays, and still gets the **receipt** that is the record
    // that counts. Losing this is a worse confirmation, not a failed purchase,
    // so it must not throw into checkout.
  }
}

/**
 * The last string read, and what it parsed to.
 *
 * `recallCheckout` is a **snapshot** as well as a getter: the reading page hands
 * it to `useSyncExternalStore`, which calls it on every render and compares the
 * answers with `Object.is`. Parsing afresh each time would answer a new object
 * each time and render forever. Keyed on the raw string, so a record written
 * after one was read is reparsed and an unchanged one is not.
 */
let lastRaw: string | null = null;
let lastRecord: CheckoutRecord | null = null;

/**
 * The record, or `null` when there is none, when storage is unreadable, or when
 * what is there is not a record this build wrote.
 *
 * Everything is validated rather than cast. The value is attacker-writable in
 * the sense that anything on our origin can put anything in that key, and it
 * outlives a deploy — a record written by an older build with a different shape
 * is the ordinary way this returns something unusable. A record with a client
 * secret and no session is exactly that: the wallet road's shape, from a tab
 * left open across the deploy that replaced it.
 *
 * The same object comes back for as long as the stored string is unchanged. See
 * `lastRaw` above: identical storage parses to an identical record, whatever
 * produced it.
 */
export function recallCheckout(): CheckoutRecord | null {
  let raw: string | null;

  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    return null;
  }

  if (raw === lastRaw) return lastRecord;

  lastRaw = raw;
  lastRecord = parseRecord(raw);

  return lastRecord;
}

function parseRecord(raw: string | null): CheckoutRecord | null {
  const parsed = storedObject(raw);

  if (parsed === null) return null;

  const { payToken, money, sessionId, productKey, question, gift, giftRecipient, clientSecret } = parsed;

  if (typeof payToken !== "string" || payToken === "") return null;
  if (typeof productKey !== "string" || productKey === "") return null;
  if (sessionId !== undefined && (typeof sessionId !== "string" || sessionId === "")) return null;
  if (typeof money !== "object" || money === null) return null;

  const { currency, amount } = money as Record<string, unknown>;

  if (typeof currency !== "string" || currency === "") return null;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;

  // The four optional fields are validated when present and dropped when
  // absent, so a record that reads back is the same object that was written.
  if (question !== undefined && typeof question !== "string") return null;
  if (gift !== undefined && typeof gift !== "boolean") return null;
  if (giftRecipient !== undefined && typeof giftRecipient !== "string") return null;
  if (clientSecret !== undefined && typeof clientSecret !== "string") return null;

  return {
    payToken,
    money: { currency, amount },
    productKey,
    ...(sessionId === undefined ? {} : { sessionId }),
    ...(question === undefined ? {} : { question }),
    ...(gift === undefined ? {} : { gift }),
    ...(giftRecipient === undefined ? {} : { giftRecipient }),
    ...(clientSecret === undefined ? {} : { clientSecret }),
  };
}

/**
 * The record for one **card** payment: the stale-result guard, as a function.
 *
 * A record that names a different payment than the one being displayed
 * describes some other purchase — almost always a newer one, made in this tab
 * after the customer navigated back — and none of it may be shown against the
 * session on screen.
 *
 * **`null` for `sessionId` shows nothing.** Every payment on this road leaves
 * the page and returns naming itself, so an address with no session id is a
 * typed one or a bookmarked one — and a confirmation reached that way must not
 * paint the last purchase it can find in the tab.
 *
 * **It refuses a wallet record**, which is what having two of these buys. A
 * wallet record carries no `sessionId`, so it falls out here without the caller
 * having to know there is another road; `walletCheckoutFor` is the one that
 * takes it.
 */
export function checkoutFor(sessionId: string | null): CheckoutRecord | null {
  if (sessionId === null) return null;

  const record = recallCheckout();

  if (record === null || record.sessionId === undefined) return null;

  return record.sessionId === sessionId ? record : null;
}

/**
 * The record for one **wallet** payment, guarded on the intent rather than the
 * Session.
 *
 * The same guard as `checkoutFor` against a different id, and it is a second
 * function rather than a second branch inside the first for the reason
 * `questionFor` sits beside it: a caller left to work out which field applies
 * to which road is a caller that will one day compare the wrong ones, and what
 * that costs here is one customer's payment shown against another's.
 *
 * `paymentIntentId` is read out of the address Stripe returns to. The record's
 * end of the comparison is derived from the **secret** it holds, so there is no
 * second stored field that could disagree with it.
 *
 * **A card record cannot satisfy this**, because it carries no client secret to
 * derive an id from — the mirror of `checkoutFor` refusing a wallet record.
 */
export function walletCheckoutFor(paymentIntentId: string | null): CheckoutRecord | null {
  if (paymentIntentId === null) return null;

  const record = recallCheckout();

  if (record === null || record.clientSecret === undefined) return null;

  return paymentIntentFrom(record.clientSecret) === paymentIntentId ? record : null;
}

/**
 * The question a cancelled checkout left behind, for the reading page it was
 * typed on and for no other.
 *
 * The second of this file's two guards, and it sits beside the first
 * deliberately: both answer "does this record apply to what is on screen", and
 * a caller left to compare the fields itself is a caller that will one day
 * compare the wrong ones. A question restored onto a different reading is a
 * sentence appearing in a box the visitor did not type it in.
 *
 * **A gift record is never offered here**, and from 3 September 2026 there is
 * nothing on one to offer. The line's `question` used to be a composed note in
 * gift mode — "Gift — send this reading to …" — and putting that back in a
 * textarea the customer writes their own sentence in was this guard's own fault
 * arriving by a different door. The present is its own field now and the
 * question is empty, so a gift record carries no question to restore.
 *
 * **The refusal stays anyway**, because "this record is a gift" and "this
 * record has nothing to restore" are two facts and only one of them is written
 * down here. A revision that gave gift mode a question box of its own would
 * find this already correct.
 *
 * The cost is unchanged: a customer who cancels a gift checkout loses the
 * recipient, the signature and the message they typed. Giving those back means
 * restoring the panel to gift mode with four fields refilled, which is a
 * separate piece of work and not something to infer from a record.
 *
 * **A string, not a record**, so it can be a `useSyncExternalStore` snapshot
 * without the caller reaching past it into anything else.
 */
export function questionFor(productKey: string): string | undefined {
  const record = recallCheckout();

  if (record === null || record.productKey !== productKey) return undefined;
  if (record.gift) return undefined;

  return record.question;
}

/**
 * Drops the question from the record, leaving everything else in place.
 *
 * **Its caller is the confirmation**, once the backend has said the money
 * moved. Until then the question is what a cancelled checkout puts back in the
 * textarea; after a payment it is a sentence about a reading already bought,
 * and finding it waiting in the box on the way back to the page reads as an
 * order that did not go through.
 *
 * The rest of the record stays, so a reload of the confirmation still has the
 * Money and the pay token to work from.
 *
 * **It is handed the record it means**, and drops nothing if what is in storage
 * is no longer that one. A verification takes a round trip, and a second
 * purchase started in this tab while it was in flight would leave a record whose
 * question is about the reading being bought right now.
 */
export function forgetQuestion(paid: CheckoutRecord): void {
  const stored = recallCheckout();

  if (stored === null || stored.payToken !== paid.payToken) return;
  if (stored.question === undefined) return;

  const { question: spent, ...rest } = stored;

  void spent;

  rememberCheckout(rest);
}

/*
  ## The third record, which is not a checkout

  Everything above is written before a browser leaves for Stripe and read when
  it comes back. What follows is written by a **redemption**, where no money
  moves and nothing leaves the origin — it is here because the screen that reads
  it is the same screen, and a second module holding one `sessionStorage` key
  for the same page would be two files to keep in step. See `RedemptionRecord`.
*/

const REDEMPTION = "redemption";

/**
 * The one query parameter the redemption road is reached by.
 *
 * **Spelled once**, because it is a contract between the page that writes the
 * address and the screen that reads it, and the last time this repository had a
 * contract with two spellings — `data-field` — one of them drifted. The two
 * beside it are Stripe's own (`session_id`, `payment_intent`) and are spelled
 * where they are read, since nothing here builds those addresses.
 */
export const redeemedParam = "redeemed";

/**
 * What a spent **gift code** leaves behind in the tab that spent it.
 *
 * **The whole input to the confirmation on that road**, and there is nothing
 * else it could be. `POST /orders/status` reports a payment, and the payment
 * behind a redeemed gift happened months earlier to somebody else — so unlike
 * the two records above, this one is not a thing to verify later. It is the
 * answer that spent the code, carried across one `router.replace`.
 *
 * **No pay token, no Money, and no code.** A redemption has no payment to
 * identify and no amount to restate, and the code is a bearer credential that
 * has done its one job by the time this is written. The `id` below is the only
 * thing that travels in the address.
 */
export type RedemptionRecord = {
  /**
   * The handle the confirmation is reached by, fresh for each redemption.
   *
   * **A random string and not the credential**, which is the constraint ADR
   * 0003 puts on this road: a code the visitor typed is never written into an
   * address, and `check:redeem` asserts it against every URL the browser
   * visits — a redirect included. This is guessable and worth nothing to guess:
   * it names a record in one tab's storage, and a tab that does not hold the
   * record shows the screen that says so.
   *
   * It is on the record as well as in the address for the same reason
   * `sessionId` is: it is what `redemptionFor` compares, so a second redemption
   * in this tab cannot be shown against the first one's address.
   */
  id: string;
  /**
   * The **product key** of the reading that was asked for, which is what the
   * confirmation names it and states its delivery window from — through
   * `readingPageFor`, exactly as the card road resolves a title. A key this
   * build has no page for names no reading and states no window.
   */
  productKey: string;
  /** What the querent asked, read back so they can see it is what they meant. */
  question: string;
  /** Where the reading goes: the **querent**'s own address, never the recipient's. */
  querentEmail: string;
  /**
   * When it was asked for, as the backend answered it.
   *
   * **The moment the clock starts** — see `CONTEXT.md` under **Ask** — and the
   * reason a delivery window may be stated on that screen at all: it is a
   * property of the reading counted from here, rather than a promise the screen
   * makes. It is carried and not rendered, because the promise is made once, in
   * the mail the backend sends the querent.
   */
  askedAt: string;
};

/**
 * Writes the redemption, replacing whatever was there.
 *
 * Its caller is the redeem page's submit, immediately before it replaces the
 * address — **before**, because after the navigation the page that had the
 * answer is gone.
 *
 * **It cannot throw into a redemption.** Storage refused is a worse
 * confirmation and not a lost gift: the code is spent either way, the reading
 * is being written either way, and the mail the backend sends the querent is
 * the durable half. The screen reached without a record says exactly that.
 */
export function rememberRedemption(record: RedemptionRecord): void {
  try {
    sessionStorage.setItem(REDEMPTION, JSON.stringify(record));
  } catch {
    // See above. A querent who cannot be shown their own confirmation has still
    // asked, and has still been mailed.
  }
}

/**
 * The redemption one address names, or `null` when this tab holds no such
 * record.
 *
 * **The third guard in this file**, and it is one for the same reason the other
 * two are: a caller left to compare the fields itself is a caller that will one
 * day compare the wrong ones. A second gift redeemed in this tab overwrites the
 * first, so a record whose `id` is not the one on screen describes some other
 * redemption and none of it may be shown.
 *
 * **`null` for a missing id, and for a record that is not one this build
 * wrote.** Both land on the same screen, which says the mail is the record that
 * counts — the honest answer for a handle whose record died with a tab, and for
 * an address typed by somebody who never redeemed anything.
 */
export function redemptionFor(id: string | null): RedemptionRecord | null {
  if (id === null || id === "") return null;

  let raw: string | null;

  try {
    raw = sessionStorage.getItem(REDEMPTION);
  } catch {
    return null;
  }

  const record = parseRedemption(raw);

  if (record === null) return null;

  return record.id === id ? record : null;
}

/**
 * Validated rather than cast, exactly as `parseRecord` is: anything on this
 * origin can put anything in that key, and a record written by an older build
 * outlives the deploy that replaced it.
 */
function parseRedemption(raw: string | null): RedemptionRecord | null {
  const parsed = storedObject(raw);

  if (parsed === null) return null;

  const { id, productKey, question, querentEmail, askedAt } = parsed;

  /*
    **Every field is required, including the one nothing renders.** A redemption
    that cannot name what was asked or where it goes has nothing to put on the
    screen it exists to draw — and `askedAt`, which is carried rather than
    shown, is required for the reason the whole of this function exists: what is
    being tested is whether this is a record *this build wrote*, and a shape
    with a field missing is a record from some other build. Reading four fields
    out of it and rendering them would be trusting the half that happened to
    survive.
  */
  for (const field of [id, productKey, question, querentEmail, askedAt]) {
    if (typeof field !== "string" || field === "") return null;
  }

  return {
    id: id as string,
    productKey: productKey as string,
    question: question as string,
    querentEmail: querentEmail as string,
    askedAt: askedAt as string,
  };
}

/**
 * What a stored key parses to, when it parses to an object at all.
 *
 * The half the two parsers above share: the value is attacker-writable in the
 * sense that anything on this origin can put anything in either key, it
 * outlives a deploy, and neither of the two things that go wrong first — a
 * string that is not JSON, and JSON that is not an object — says anything about
 * which record was expected. What each field means is the caller's business and
 * is validated there.
 */
function storedObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  return parsed as Record<string, unknown>;
}

/**
 * A fresh handle for one redemption.
 *
 * **Random, and not a credential.** ADR 0003 decided that a code the visitor
 * typed is never written into an address, and `check:redeem` asserts it against
 * every URL the browser visits — the redirect included. So the address carries
 * this instead, which names a record in one tab's storage and is worth nothing
 * to guess: a tab without the record shows the screen that says so, whatever
 * the address holds.
 *
 * `crypto.randomUUID` needs a secure context, which the site is and a plain
 * `http://` dev origin is not. The fallback is not as random and does not need
 * to be — what it has to avoid is one redemption's handle matching the record
 * a *second* redemption left in the same tab, which is a collision inside one
 * browser tab within one minute.
 */
export function freshRedemptionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/**
 * The address one redemption's confirmation is at.
 *
 * **Slashed.** `trailingSlash` in next.config.mjs exports a directory of
 * `index.html` files, so the unslashed form costs a 308 on the way — and this
 * one would carry a query string through it. The same reason `redeemCopy`'s way
 * back is slashed.
 *
 * Its caller replaces the address rather than pushing it. A code is spent
 * exactly once, and a back button that returned to the form it was spent in
 * would offer somebody a second press of a button that cannot work twice.
 */
export function redemptionHref(id: string): string {
  return `/checkout/complete/?${redeemedParam}=${encodeURIComponent(id)}`;
}
