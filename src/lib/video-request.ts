/**
 * Makes rapid switching between cards safe.
 *
 * The Viewing Room asks the backend for a signed URL when a member presses
 * play, and a visitor dragging along the carousel can start several of those
 * before the first one answers. **Playing the wrong film is the failure this
 * prevents**, and it is the kind that appears only under a fast hand on a slow
 * connection — which is to say, never in development and immediately in the
 * wild.
 */

/**
 * One attempt to fetch a playback URL.
 *
 * `isCurrent` is asked **after** the await, never before: an aborted `fetch`
 * can still resolve, and a response arriving for a card the visitor has
 * already left is exactly what must be dropped.
 */
export type VideoRequest = {
  signal: AbortSignal;
  isCurrent(): boolean;
};

export type RequestGuard = {
  /** Retires whatever was in flight and hands back a fresh attempt. */
  begin(cardId: string): VideoRequest;
  /** Retires everything. For teardown, and for leaving the page. */
  abort(): void;
};

/**
 * Two mechanisms, because one is not enough.
 *
 * The `AbortController` stops the network. The identity check stops a response
 * that had already arrived when the visitor moved on — `fetch` can resolve
 * before an abort lands, so aborting alone still races. A token alone would
 * leave the request running and the bytes being paid for.
 *
 * **Identity is the attempt, not the card.** Selecting the same card twice
 * retires the first attempt, so a slow first response cannot satisfy a second
 * press that should have fetched a fresh URL — which matters once URLs expire,
 * since the second press may be the one that needed a live one.
 */
export function createRequestGuard(): RequestGuard {
  let current: AbortController | null = null;

  return {
    begin(): VideoRequest {
      current?.abort();

      const controller = new AbortController();
      current = controller;

      return {
        signal: controller.signal,
        isCurrent: () => current === controller,
      };
    },

    abort() {
      current?.abort();
      current = null;
    },
  };
}
