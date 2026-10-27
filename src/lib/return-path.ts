/**
 * Where a visitor goes once they are signed in.
 *
 * A seam of its own rather than a corner of the sign in form, for the reason
 * `viewing-room-access.ts` gives for being one: the mapping is pure, it is the
 * piece of this road most likely to be got subtly wrong, and it is testable
 * without a DOM. Everything around it is layout and navigation.
 *
 * **Two functions rather than one taking both halves.** The sign in page has a
 * `next` to consider and the masthead's dropdown never does — somebody signing
 * in from the header is already standing where they chose to be — so a single
 * `landingFor({ next, customer })` would have to be handed an argument its
 * commonest caller does not have. The page composes the two; the dropdown calls
 * the second alone.
 */

import type { Customer } from "./session.ts";

/**
 * The sign in page's own path, as a destination to refuse rather than to link.
 *
 * Not imported from `content/login.ts`: that module is copy, this is a rule,
 * and `lib` does not reach into `content`.
 */
const SIGN_IN_PATH = "/login/";

/**
 * A `next` as somewhere this site can actually send somebody, or null.
 *
 * **The value is attacker-supplied.** It arrives in a link anybody can write
 * and hand to anybody else, so the question is not "is this tidy" but "can
 * this leave our origin". A `next` of `https://elsewhere.example/login/` would
 * turn our own sign in link into a way to land a visitor on a convincing copy
 * of this page that asks for their password, and the referrer would say we sent
 * them. So this answers null for everything it is not certain of, and the
 * caller falls through to `landingFor`.
 *
 * What survives: a path on this site, with its own query string and fragment
 * intact, so `/library/?card=3#notes` arrives whole.
 *
 * What does not, and why each one is here rather than merely implied:
 *
 * - **`//host` and `/\host`.** Both read as a path to a person and as a host
 *   to a browser — `//elsewhere.example` is a protocol-relative URL, and
 *   several browsers normalise the backslash to a slash before resolving. This
 *   is the one refusal that is not obvious from looking at the string.
 * - **Any `..` segment**, because the string we are handed is not the address
 *   the browser will go to. `/..//evil.example` begins `/.` and so walks
 *   straight past the rule above, and then resolves to `//evil.example` — a
 *   protocol-relative URL, a different origin, and exactly the redirect this
 *   function exists to refuse. `/login/../admin/` is the milder version: not
 *   off-origin, but not the path it looks like either. A segment that merely
 *   *contains* dots (`/the-fool.v2/`) is untouched; it is the whole segment
 *   being `..` that moves.
 * - **Anything with a scheme**, which `javascript:` and `data:` are the point
 *   of. Covered by requiring a leading `/`, and tested in its own right
 *   because a later "improvement" to this guard would quietly let them back.
 * - **A relative path.** `viewing-room/` resolves against wherever the visitor
 *   happens to be, which is not a destination this seam can promise.
 * - **Control characters.** A newline in a value that reaches a header or an
 *   attribute is how one string becomes two.
 * - **The sign in page itself**, matched on the path portion rather than by
 *   equality, so `/login/?next=/login/` cannot build a loop either.
 *
 * Surrounding whitespace is trimmed instead of refused: mail clients and chat
 * apps add it to a URL they have wrapped, and a space is not an attack.
 */
export function readReturnPath(raw: string | null): string | null {
  if (raw === null) return null;

  const next = raw.trim();

  if (next === "") return null;
  // A path on this site and nothing else. This is also what refuses every
  // scheme, since `javascript:` and `https:` have no leading slash.
  if (!next.startsWith("/")) return null;
  // `//host` and `/\host` are a host wearing a path's clothes.
  if (next[1] === "/" || next[1] === "\\") return null;
  if (/[\u0000-\u001f\u007f]/.test(next)) return null;

  /*
    **Now stop reading the string and ask what it resolves to.**

    Everything above is a cheap rejection of a value that is obviously not a
    path. What it cannot do is tell you where a path *goes*, and that is the
    question. `/.//evil.example` passes every test above — it begins with a
    single slash, its second character is a dot, it holds no control
    characters — and a browser resolves it to `//evil.example`, which is a
    protocol-relative URL and therefore another origin.
    `/%2e%2e//evil.example` does the same while hiding the dots from any string
    match, and there is no finite list of spellings to block: `%2E`, `.%2e`,
    `/./..`, and a nesting of them all arrive at the same place.
    A code review found exactly this hole in a guard that matched a literal
    `..` segment, and proved it end to end against a real phishing page.

    So resolution is the test. The value is resolved against a base that is
    nobody's real origin, and anything that does not land back on that base is
    refused. The `pathname` check is the other half: a path of `//host` keeps
    the origin of whatever it was resolved against, so it passes an origin
    comparison and is still read as a host the moment it reaches `router.push`.

    What comes back is rebuilt from the resolved parts rather than returned as
    it arrived, so the caller is handed the address the browser would have gone
    to and not the shorthand somebody wrote for it.
  */
  const base = "https://return-path.invalid";

  let resolved: URL;

  try {
    resolved = new URL(next, `${base}/`);
  } catch {
    return null;
  }

  if (resolved.origin !== base) return null;
  if (resolved.pathname.startsWith("//")) return null;

  /*
    The sign in page, however it is spelled. `trailingSlash` is on, so `/login`
    is a redirect to `/login/` and the loop merely gains a hop; case is folded
    because a visitor who writes `/Login/` means the page, and whether the host
    agrees depends on the host.
  */
  const normalised = resolved.pathname.toLowerCase().replace(/\/$/, "");

  if (normalised === SIGN_IN_PATH.replace(/\/$/, "")) return null;

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
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
 */
export function landingFor(customer: Customer): string {
  return customer.hasViewingRoomAccess ? "/viewing-room/" : "/";
}
