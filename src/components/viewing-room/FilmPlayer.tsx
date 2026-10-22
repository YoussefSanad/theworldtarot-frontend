"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ReplayControl } from "@/components/viewing-room/ReplayControl";
import type { ViewingRoomCard } from "@/content/viewing-room";
import { cn } from "@/lib/cn";
import { createRequestGuard } from "@/lib/video-request";
import { attachVideoSource, type VideoSource } from "@/lib/video-source";
import {
  fetchVideoUrl,
  hasExpired,
  type PlaybackFailure,
  type PlaybackUrl,
} from "@/lib/viewing-room-video";

/**
 * The featured player: one card's film, at the size the frame draws it
 * (`384:24`, 509x842).
 *
 * **It is a tarot card, not a cinema screen.** 509x842 is 1:1.654, which is
 * the deck's own 3:5 and the shape the films were shot in. The ticket asked
 * for "cinematic proportions, no letterboxing", which reads as 16:9 and is the
 * opposite of what her frame draws. The aspect is fixed and the player scales
 * within it, so there is nothing to letterbox at any width.
 *
 * ## Nothing is fetched until somebody presses play
 *
 * Not on page load, not on selection, not for the other twenty-one cards. The
 * element carries `preload="none"` until then. A signed URL is a credential
 * with a thirty-minute timer, and fetching twenty-two of them for a visitor
 * who watches one is both a waste and a pile of live credentials in a page.
 *
 * ## The URL lives in a ref and dies with the page
 *
 * Never state that could be serialised, never storage of any kind. It is
 * re-used while it is alive — a replay inside the half hour costs no request —
 * and re-fetched the moment `hasExpired` says it is gone, which is what makes
 * a tab left open overnight work rather than fail.
 */

type PlayerState =
  | { phase: "resting" }
  | { phase: "loading" }
  | { phase: "playing" }
  | { phase: "ended" }
  | { phase: "error" };

export function FilmPlayer({
  card,
  onRefused,
  labels,
}: {
  card: ViewingRoomCard;
  /** A backend refusal the room must answer with a modal, not the player. */
  onRefused: (failure: PlaybackFailure) => void;
  labels: { play: string; replay: string; retry: string; loading: string; error: string };
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceRef = useRef<VideoSource | null>(null);
  const guardRef = useRef(createRequestGuard());

  /**
   * The live credential. A ref rather than state: nothing renders from it, and
   * state would invite it into a store or a serialised payload one day.
   */
  const playbackRef = useRef<PlaybackUrl | null>(null);

  /** One automatic recovery per card, then the retry state. Reset on change. */
  const recoveredRef = useRef(false);

  const [state, setState] = useState<PlayerState>({ phase: "resting" });

  /**
   * Which card `state` describes.
   *
   * The reset on selection is derived during render rather than done in an
   * effect: an effect that calls `setState` synchronously renders the new
   * card's first frame in the *old* card's phase, which for a card picked
   * while another was playing means one frame of somebody else's film.
   */
  const [stateCardId, setStateCardId] = useState(card.id);

  if (stateCardId !== card.id) {
    setStateCardId(card.id);
    setState({ phase: "resting" });
  }

  /**
   * `start` calls itself to recover once, and a `useCallback` cannot reference
   * itself before it is declared. The ref is that indirection, kept in step
   * below.
   */
  const startRef = useRef<(options?: { recovering?: boolean }) => void>(() => {});

  /** Tears down the source and the request, leaving the element empty. */
  const teardown = useCallback(() => {
    guardRef.current.abort();
    sourceRef.current?.detach();
    sourceRef.current = null;

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  /*
    Selection changed. Stop first, swap second: a film still playing while its
    successor attaches is the state where two sources briefly share one
    element, and it is audible.

    The phase itself was already reset during render, above — this is the
    teardown of everything that is not React state.
  */
  useEffect(() => {
    teardown();
    playbackRef.current = null;
    recoveredRef.current = false;

    return teardown;
  }, [card.id, teardown]);

  const start = useCallback(
    async ({ recovering = false }: { recovering?: boolean } = {}) => {
      const video = videoRef.current;
      if (!video) return;

      setState({ phase: "loading" });

      const request = guardRef.current.begin(card.id);

      let playback = playbackRef.current;

      // Re-use what we hold while it is alive; a replay inside the half hour
      // owes the backend nothing. `hasExpired` carries the safety margin, so
      // this never hands the player a URL that dies mid-manifest.
      if (recovering || !playback || hasExpired(playback)) {
        try {
          playback = await fetchVideoUrl(card.id, { signal: request.signal });
        } catch (error) {
          // An abort is the ordinary case — the visitor moved on — and is not
          // a failure anybody should see.
          if (!request.isCurrent()) return;

          const failure = readFailure(error);
          if (failure) onRefused(failure);
          setState({ phase: "error" });
          return;
        }

        // Asked AFTER the await, which is the whole point of the guard: an
        // aborted fetch can still resolve, and this response may be for a card
        // the visitor has already left.
        if (!request.isCurrent()) return;

        playbackRef.current = playback;
      }

      const source = attachVideoSource(video, playback.url);
      sourceRef.current = source;

      const fail = () => {
        if (!request.isCurrent()) return;

        // One silent recovery per card: a URL can die between the fetch and
        // the first segment, and asking again is almost always enough. Twice
        // is a real failure and the visitor should be told.
        if (!recoveredRef.current) {
          recoveredRef.current = true;
          playbackRef.current = null;
          startRef.current({ recovering: true });
          return;
        }

        setState({ phase: "error" });
      };

      try {
        await source.ready;
      } catch {
        fail();
        return;
      }

      if (!request.isCurrent()) return;

      // A segment can 403 long after the manifest parsed clean, which is the
      // second channel `video-source.ts` exists to provide.
      source.onFatalError(fail);

      source.release();
      setState({ phase: "playing" });

      try {
        await video.play();
      } catch {
        // Sound can be refused even after a gesture in some browsers; a muted
        // retry is better than a dead player.
        video.muted = true;
        try {
          await video.play();
        } catch {
          fail();
        }
      }
    },
    [card.id, onRefused],
  );

  // Kept in step so the one recursive call inside `start` always reaches the
  // current closure rather than the first render's. In an effect rather than
  // during render, because a render that writes a ref is not replayable.
  useEffect(() => {
    startRef.current = (options) => void start(options);
  }, [start]);

  const resting = state.phase === "resting";
  const ended = state.phase === "ended";

  return (
    <div
      className={cn(
        "relative mx-auto w-full overflow-hidden",
        // Her 509x842. The ratio, never a height: this is the one measurement
        // that has to survive every breakpoint intact.
        "aspect-[509/842]",
        // A 3:5 portrait at phone width is taller than the screen, so the
        // player yields height before it yields shape — the carousel has to
        // stay reachable without a scroll.
        "max-h-[min(842px,70dvh)]",
      )}
    >
      {/* The card rests on its own artwork, which is what the poster used to be. */}
      {(resting || state.phase === "loading") && (
        <img
          src={card.image.src}
          alt=""
          width={card.image.width}
          height={card.image.height}
          className="absolute inset-0 size-full object-contain"
        />
      )}

      <video
        ref={videoRef}
        // Never `autoPlay`, in any state, on any breakpoint.
        preload="none"
        playsInline
        poster={card.image.src}
        onEnded={() => setState({ phase: "ended" })}
        className={cn(
          "absolute inset-0 size-full object-contain",
          resting && "invisible",
        )}
      />

      {resting && (
        <button
          type="button"
          onClick={() => void start()}
          aria-label={labels.play}
          className="absolute inset-0 grid place-items-center"
        >
          <span className="grid size-[88px] place-items-center rounded-full border border-[color:var(--gold-line,#d4b06a)]/70 bg-black/40 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-1 size-8 fill-[color:var(--gold,#d4b06a)]">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}

      {state.phase === "loading" && (
        <p role="status" className="absolute inset-x-0 bottom-6 text-center text-sm tracking-wide text-white/70">
          {labels.loading}
        </p>
      )}

      {ended && <ReplayControl onReplay={() => void start()} label={labels.replay} />}

      {state.phase === "error" && (
        <div className="absolute inset-0 grid place-items-center gap-3 bg-black/60 p-6 text-center">
          <p className="text-sm text-white/80">{labels.error}</p>
          <button
            type="button"
            onClick={() => {
              recoveredRef.current = false;
              void start({ recovering: true });
            }}
            className="rounded-full border border-[color:var(--gold-line,#d4b06a)]/70 px-5 py-2 text-sm tracking-wide text-[color:var(--gold,#d4b06a)]"
          >
            {labels.retry}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A refusal the room has to answer, or null for anything else.
 *
 * Phase one's seam cannot refuse, so this reads the shape phase two will throw
 * rather than inventing one: a `status` on the error is what the API seams in
 * this repo already carry.
 */
function readFailure(error: unknown): PlaybackFailure | null {
  if (typeof error !== "object" || error === null) return null;

  const failure = (error as { playbackFailure?: PlaybackFailure }).playbackFailure;

  return failure ?? null;
}
