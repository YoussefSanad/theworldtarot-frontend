/**
 * The one thing a checkout leaves behind in the tab it was started in.
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
   */
  sessionId: string;
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
   * The PaymentIntent's client secret. **Optional, and not written on the card
   * road** — a hosted Session leaves no secret on the client.
   *
   * Kept rather than deleted because the wallet road brings it back, and the
   * confirmation will then have to read records left by either road. Making the
   * field optional now is cheaper than deleting it and re-adding it inside a
   * fortnight.
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
 * secret. That road returns, and so will a function like it.
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
 * Writes the record, replacing whatever was there.
 *
 * **Replacing is the point.** A second purchase in the same tab overwrites the
 * first, so there is never a stale record for the confirmation to read; and
 * because the screen compares session ids before it trusts the money, a record
 * from the *newer* purchase cannot be shown against an older purchase's URL
 * either.
 *
 * Its caller is the panel's Buy Now button, which writes this immediately
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
 * The record, or `null` when there is none, when storage is unreadable, or when
 * what is there is not a record this build wrote.
 *
 * Everything is validated rather than cast. The value is attacker-writable in
 * the sense that anything on our origin can put anything in that key, and it
 * outlives a deploy — a record written by an older build with a different shape
 * is the ordinary way this returns something unusable. A record with a client
 * secret and no session is exactly that: the wallet road's shape, from a tab
 * left open across the deploy that replaced it.
 */
export function recallCheckout(): CheckoutRecord | null {
  let raw: string | null;

  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const { payToken, money, sessionId, productKey, question, clientSecret } = parsed as Record<
    string,
    unknown
  >;

  if (typeof payToken !== "string" || payToken === "") return null;
  if (typeof sessionId !== "string" || sessionId === "") return null;
  if (typeof productKey !== "string" || productKey === "") return null;
  if (typeof money !== "object" || money === null) return null;

  const { currency, amount } = money as Record<string, unknown>;

  if (typeof currency !== "string" || currency === "") return null;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;

  // The two optional fields are validated when present and dropped when absent,
  // so a record that reads back is the same object that was written.
  if (question !== undefined && typeof question !== "string") return null;
  if (clientSecret !== undefined && typeof clientSecret !== "string") return null;

  return {
    payToken,
    money: { currency, amount },
    sessionId,
    productKey,
    ...(question === undefined ? {} : { question }),
    ...(clientSecret === undefined ? {} : { clientSecret }),
  };
}

/**
 * The record for one payment: the stale-result guard, as a function.
 *
 * A record that names a different payment than the one being displayed
 * describes some other purchase — almost always a newer one, made in this tab
 * after the customer navigated back — and none of it may be shown against the
 * session on screen.
 *
 * **`null` for `sessionId` shows nothing**, and that is a change from the
 * wallet road, where it meant "an in-place payment that never left the page, so
 * the record *is* what is being displayed". On this road every payment leaves
 * the page and returns naming itself, so an address with no session id is a
 * typed one or a bookmarked one — and a confirmation reached that way must not
 * paint the last purchase it can find in the tab.
 */
export function checkoutFor(sessionId: string | null): CheckoutRecord | null {
  if (sessionId === null) return null;

  const record = recallCheckout();

  if (record === null) return null;

  return record.sessionId === sessionId ? record : null;
}
