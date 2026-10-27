import type { Customer } from "./session.ts";

const MAX_LENGTH = 512;
const BASE = "https://x.invalid";

/**
 * Open-redirect guard for the `?next=` return path on /login/ and
 * /set-password/. Allow-list only: returns the URL-normalised
 * `pathname + search + hash` of a same-origin relative path with a single
 * leading `/`, otherwise null. The result is already normalised and must not
 * be decoded again by callers.
 * Rejects absolute URLs, `//host`, backslashes, javascript:/data: schemes,
 * Unicode whitespace and ASCII/C1 control characters (browsers strip these
 * into `//host`), anything longer than 512 characters, and targets on
 * /login, /set-password and /reset-password (including index.html/.txt
 * variants, percent-encoded and mixed-case spellings), plus any query with a
 * `token` or `email` param. Those pages would loop back after sign-in, or
 * show the victim a planted reset/claim form straight after authenticating.
 * Normalising closes bypasses such as `/.//evil.com`, which passes the
 * leading-slash check but collapses to the protocol-relative `//evil.com`.
 */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > MAX_LENGTH) return null;
  if (raw[0] !== "/" || raw[1] === "/") return null;
  if (/[\\\s\u0000-\u001f\u007f-\u009f]/.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  if (url.pathname.startsWith("//")) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  decoded = decoded.toLowerCase().replace(/\/{2,}/g, "/");
  if (/^\/(login|set-password|reset-password)(\/|\.|$)/.test(decoded)) return null;
  const params = new URLSearchParams(url.search);
  if (params.has("token") || params.has("email")) return null;
  return url.pathname + url.search + url.hash;
}

/** Only a claim with a safe destination continues straight to sign in. */
export function afterClaimDestination(
  flow: "claim" | "reset",
  next: string | null | undefined,
): string | null {
  return flow === "claim" ? safeReturnPath(next) : null;
}

/**
 * Where a signed-in customer belongs when nothing asked for anywhere special.
 *
 * **A pass holder goes to the room they bought.** The common reason to sign in
 * on this site is to watch a film, and the Viewing Room is the only place a
 * session visibly changes what a person can do. `signIn` already answers with
 * the `Customer`, so this costs no extra call and no guess.
 *
 * Everybody else goes to the homepage rather than to `/readings/`, which this
 * replaced. That was never a decision so much as the only page a signed-in
 * visitor could be sent to before the Viewing Room existed, and it answered a
 * question nobody asked: somebody who signs in from the masthead has not told
 * us they want to buy a reading.
 *
 * **Separate from `safeReturnPath` above rather than folded into it**, because
 * the two answer different questions and only one caller asks both. The sign in
 * page has a `next` to weigh; the masthead's dropdown never does — somebody
 * signing in from the header is already standing where they chose to be — so a
 * single function taking both would have to be handed an argument its
 * commonest caller does not have.
 */
export function landingFor(customer: Customer): string {
  return customer.hasViewingRoomAccess ? "/viewing-room/" : "/";
}
