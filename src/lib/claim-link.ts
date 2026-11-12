/**
 * The **claim link** as the confirmation reads it off `POST /orders/status`,
 * for a first-time Viewing Room pass buyer. #170, against backend #122.
 *
 * `API_CONTRACT.md` ("The claim link", under `/orders/status`) is the
 * authority. Two keys arrive on every answer: `set_password_link` says which of
 * three states this is, and `set_password_url` carries the whole link only when
 * that state is `ready`. The backend builds the link with the same code as the
 * receipt's, so it is the receipt's own link, `next` included.
 *
 * ## Never a half-built link
 *
 * The screen renders a link only when every part of it is there: a `ready`
 * state, a string that parses, the set-password page, and a non-empty `token`
 * and `email`. Anything short of that is `none`, which is the fallback the
 * screen already has: the email step and ENTER THE VIEWING ROOM. An answer from
 * a backend that predates #122, with neither key, is `none` too.
 *
 * ## Made relative, on purpose
 *
 * The backend builds an absolute address from its own idea of where this site
 * lives. The button keeps only the path and query, so it always opens the
 * set-password page of the site the buyer is on, whatever origin the backend
 * was configured with, and a link can never send anybody off this site.
 */

export type ClaimLink =
  | { state: "ready"; href: string }
  | { state: "not_yet" }
  | { state: "none" };

const NONE: ClaimLink = { state: "none" };

/** The page the link must open, with the trailing slash the static export needs. */
const SET_PASSWORD_PATH = "/set-password/";

/**
 * The claim link in a status answer, or `none` when there is nothing whole to
 * show. A state this build has never heard of is `none`, as the contract asks.
 */
export function claimLinkFrom(answer: { set_password_link?: unknown; set_password_url?: unknown }): ClaimLink {
  if (answer.set_password_link === "not_yet") return { state: "not_yet" };
  if (answer.set_password_link !== "ready") return NONE;

  const href = setPasswordHref(answer.set_password_url);

  return href === null ? NONE : { state: "ready", href };
}

function setPasswordHref(url: unknown): string | null {
  if (typeof url !== "string" || url === "") return null;

  let parsed: URL;

  try {
    // The base only matters for a relative answer; an absolute one ignores it.
    parsed = new URL(url, "https://placeholder.invalid");
  } catch {
    return null;
  }

  if (parsed.pathname !== SET_PASSWORD_PATH) return null;
  if (!parsed.searchParams.get("token") || !parsed.searchParams.get("email")) return null;

  return `${parsed.pathname}${parsed.search}`;
}

/**
 * How long to wait before each further ask while the answer is `not_yet`, in
 * milliseconds: doubling from one second, thirty seconds in all, which is the
 * ceiling the contract suggests. The webhook usually settles the order within a
 * few seconds of the return; past thirty, the screen settles on the fallback.
 *
 * In the background and never behind a spinner: `received` is already on
 * screen, and the button arrives into it when the link does.
 */
export const CLAIM_LINK_RETRY_DELAYS_MS: readonly number[] = [1000, 2000, 4000, 8000, 15000];
