/**
 * The Viewing Room's playback seam: one card's film, as a URL that expires.
 *
 * **Stubbed in phase one and written to its real shape.** The client needs to
 * see and approve the room before it is worth wiring, so this answers the
 * bundled film — but the signature, the abort handling and the refusal mapping
 * are the real ones, because the shape is what the player is built against.
 * Phase two replaces one function body.
 *
 * ## Why the shape matters more than the body
 *
 * The thing this returns is **a credential with a timer**, not a file path.
 * `API_CONTRACT.md` is emphatic: do not cache it, do not store it, do not put
 * it anywhere it can be shared, and the response carries `Cache-Control:
 * no-store` to say so. A player built against a local path learns to treat
 * playback URLs as ordinary strings, and keeps doing so when the string
 * becomes a credential. So the stub is honest about the shape even while it is
 * dishonest about the source.
 */

import { videos } from "./assets.ts";

/** A signed playback URL and its deadline. Never persisted, anywhere. */
export type PlaybackUrl = {
  cardId: string;
  url: string;
  /** ISO 8601. Thirty minutes out, once this is wired. */
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
 * The signed URL for one card's film.
 *
 * **Phase two** points this at `GET /api/v1/{locale}/cards/{id}/video`, maps
 * the status through `readPlaybackFailure`, and passes `cache: "no-store"`
 * the way `session.ts` and `drawCard` already do. Nothing above it changes.
 *
 * The `signal` is honoured now rather than later because the race guard is
 * built against it, and a seam that quietly ignores aborts would make that
 * guard look like it works while it does not.
 */
export async function fetchVideoUrl(
  cardId: string,
  { signal }: { signal?: AbortSignal },
): Promise<PlaybackUrl> {
  signal?.throwIfAborted();

  return {
    cardId,
    url: videos.theStar,
    // Far enough out that `hasExpired` is false, so the expiry path is
    // exercised by its own tests rather than tripped by the scaffold.
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  };
}
