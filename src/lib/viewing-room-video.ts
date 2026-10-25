/**
 * The Viewing Room's playback seam: one card's film, as a URL that expires.
 *
 * **Wired to `GET /{locale}/cards/{id}/video`.** This is the enforcement point
 * for the whole page — `API_CONTRACT.md`: "Access is decided here, every time.
 * Do not gate the player on anything the browser knows." The locked state in
 * the UI is presentation; this call is the gate.
 *
 * ## Why the shape matters as much as the call
 *
 * The thing this returns is **a credential with a timer**, not a file path.
 * The contract is emphatic: do not cache it, do not store it, do not put it
 * anywhere it can be shared, and the response carries `Cache-Control:
 * no-store` to say so. Since 7 August 2026 a URL works for *anyone* holding it
 * until it expires, which is what makes the handling rules load-bearing rather
 * than decorative.
 *
 * This seam was stubbed through phase one and written to this exact signature
 * then — the abort handling, the refusal mapping and the expiry margin are
 * unchanged. Only the body moved from the bundled film to the endpoint, which
 * is what the scaffold was for.
 */

import { apiBaseUrl } from "./api-write.ts";
import { DEFAULT_LOCALE, type Locale } from "./locale.ts";

/** A signed playback URL and its deadline. Never persisted, anywhere. */
export type PlaybackUrl = {
  cardId: number;
  url: string;
  /** ISO 8601, thirty minutes out. */
  expiresAt: string;
};

/**
 * The four refusals, which the room answers differently.
 *
 * **403 and 404 are not interchangeable** and the contract insists on the
 * distinction: 404 is "there is no film", 403 is "there is a film and this
 * visitor may not watch it". Collapsing them tells a paying customer their
 * card is unfinished, or tells a stranger which cards exist.
 */
export type PlaybackFailure = "signed-out" | "no-pass" | "not-ready" | "unknown";

/**
 * How close to the deadline is too close.
 *
 * A stream that starts with fifteen seconds left dies partway through, which
 * reads as a broken player rather than as an expiry — and recovering from it
 * costs the visitor the opening of the film. Renew early instead: the request
 * is cheap and the failure is not.
 */
const EXPIRY_MARGIN_MS = 30_000;

export function hasExpired(playback: PlaybackUrl, now: Date = new Date()): boolean {
  const deadline = Date.parse(playback.expiresAt);

  // An unparseable deadline is treated as past. Trusting it instead would hand
  // a possibly-dead URL to the player and file the failure under "the CDN".
  if (Number.isNaN(deadline)) return true;

  return deadline - now.getTime() <= EXPIRY_MARGIN_MS;
}

export function readPlaybackFailure(status: number): PlaybackFailure {
  if (status === 401) return "signed-out";
  if (status === 403) return "no-pass";
  if (status === 404) return "not-ready";

  return "unknown";
}

/**
 * A refusal the room has to answer, thrown so the player's `catch` sees it.
 *
 * **The `playbackFailure` property is the contract with `FilmPlayer`**, which
 * reads exactly it — a plain `Error` arrives there as "something went wrong"
 * and the room draws a dead player instead of the right panel. It was written
 * against this shape during phase one, before anything could throw it.
 *
 * A class rather than a tagged object so `instanceof` works for anybody who
 * wants it, while the duck-typed read in the player keeps working unchanged.
 */
export class PlaybackRefused extends Error {
  readonly playbackFailure: PlaybackFailure;
  readonly status: number;

  constructor(failure: PlaybackFailure, status: number) {
    super(`The film could not be played: ${failure} (${status}).`);
    this.name = "PlaybackRefused";
    this.playbackFailure = failure;
    this.status = status;
  }
}

/** The wire shape. `card_id` is snake_case there and `cardId` here. */
type ApiPlayback = { card_id: number; url: string; expires_at: string };

/**
 * The signed URL for one card's film. **This is the access check.**
 *
 * `credentials: "include"` is what makes it one: the website is the cookie
 * flow, so the session rides on the request and the backend decides from it.
 * Without the cookie every call is a 401 and the room is locked for members —
 * which is why it is not an option on this request the way it is on a public
 * read.
 *
 * `cache: "no-store"` says again what the server already says, because the two
 * failure modes differ: a cache between us hands one customer's live
 * credential to the next person.
 *
 * Throws `PlaybackRefused` for 401, 403 and 404, which the room answers
 * differently and which must never be collapsed — 404 is "there is no film",
 * 403 is "there is a film and this visitor may not watch it". A 429 and a 5xx
 * arrive as `unknown`, which the player shows as retryable; the contract notes
 * a 429 means something is requesting in a loop, and a player that renews on
 * `expires_at` never meets it.
 */
export async function fetchVideoUrl(
  cardId: number,
  { locale = DEFAULT_LOCALE, signal }: { locale?: Locale; signal?: AbortSignal },
): Promise<PlaybackUrl> {
  signal?.throwIfAborted();

  const response = await fetch(`${apiBaseUrl()}/api/v1/${locale}/cards/${cardId}/video`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new PlaybackRefused(readPlaybackFailure(response.status), response.status);
  }

  const body = (await response.json()) as ApiPlayback;

  return {
    // The backend's own `card_id` rather than the argument, so a response that
    // somehow answered about another card is visible to the caller's identity
    // check rather than silently relabelled as the one that was asked for.
    cardId: body.card_id,
    url: body.url,
    expiresAt: body.expires_at,
  };
}
