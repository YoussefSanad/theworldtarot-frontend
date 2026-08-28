/**
 * The one thing a paid-for checkout leaves behind in the tab it happened in.
 *
 * The confirmation screen has nothing else to read from. There is no endpoint
 * that reads an **order** back and there is deliberately not going to be one, so
 * everything the screen needs that Stripe does not hold — the **Money** the
 * customer agreed to, and the **pay token** a retry would need — is written here
 * before the payment starts and read back after it.
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
   * The **pay token** of the order being paid. Kept so a retry can start a
   * fresh payment without placing a second order. Never rendered, never logged,
   * never put in a URL.
   */
  payToken: string;
  /** What the customer agreed to pay, as the backend priced it. */
  money: Money;
  /**
   * The PaymentIntent's client secret, which is also the only way to retrieve
   * the intent with a publishable key alone. The intent **id** is the part of
   * it before `_secret`, so storing the secret stores both.
   */
  clientSecret: string;
};

/**
 * `pi_3abc_secret_xyz` becomes `pi_3abc`.
 *
 * Stripe puts the id and the secret in a redirect return's query string as two
 * separate parameters, and it is the id that identifies a payment across the
 * two. Deriving it rather than storing it separately means the pair cannot
 * disagree.
 */
export function paymentIntentId(clientSecret: string): string {
  const [id] = clientSecret.split("_secret");

  return id;
}

/**
 * Writes the record, replacing whatever was there.
 *
 * **Replacing is the point.** A second purchase in the same tab overwrites the
 * first, so there is never a stale record for the confirmation to read; and
 * because the screen compares intent ids before it trusts the money, a record
 * from the *newer* purchase cannot be shown against an older purchase's URL
 * either.
 */
export function rememberCheckout(record: CheckoutRecord): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // A browser with storage refused (Safari's private mode has historically
    // thrown on write, and an embedded webview may have it off entirely). The
    // payment itself does not depend on this, and the confirmation still works
    // from the URL on a redirect return. Losing the record is a worse
    // confirmation, not a failed purchase, so it must not throw into checkout.
  }
}

/**
 * The record, or `null` when there is none, when storage is unreadable, or when
 * what is there is not a record this build wrote.
 *
 * Everything is validated rather than cast. The value is attacker-writable in
 * the sense that anything on our origin can put anything in that key, and it
 * outlives a deploy — a record written by an older build with a different shape
 * is the ordinary way this returns something unusable.
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

  const { payToken, money, clientSecret } = parsed as Record<string, unknown>;

  if (typeof payToken !== "string" || payToken === "") return null;
  if (typeof clientSecret !== "string" || clientSecret === "") return null;
  if (typeof money !== "object" || money === null) return null;

  const { currency, amount } = money as Record<string, unknown>;

  if (typeof currency !== "string" || currency === "") return null;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;

  return { payToken, money: { currency, amount }, clientSecret };
}

/** Erases the record. Nothing on the confirmation path calls this. */
export function forgetCheckout(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Same reasoning as the write: never throw over storage.
  }
}
