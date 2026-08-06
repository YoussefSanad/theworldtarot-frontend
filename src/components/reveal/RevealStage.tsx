"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cardBack } from "@/content/cards";
import { cn } from "@/lib/cn";
import { attachVideoSource, type VideoSource } from "@/lib/video-source";

import { REVEAL_CROSSFADE_SECONDS, useReveal } from "./reveal-context";

const STILL_HANDOFF_SECONDS = 0.35;

/**
 * The card itself: a looping back-of-card video that crossfades into the
 * revealed card in the same frame. Both layers share one grid cell, so the
 * swap never moves anything on the page.
 *
 * The still sits above the back video (not as a native `poster`) so the handoff
 * is a controlled fade once playback has real frames — browsers otherwise snap
 * from poster to video and the card jitters on load.
 *
 * The reveal fade waits until the face has pixels to show, otherwise the
 * crossfade can land on a black frame while the file buffers.
 *
 * The card video does not loop: it plays once and holds on its closing frame,
 * which is where the card is meant to stay for the rest of the visit.
 *
 * A restored visit crossfades into `card.image` instead of the video. That
 * image *is* the video's closing frame, so it looks identical to the state the
 * visitor left — and it means a second page view in the same session doesn't
 * re-download the whole MP4 just to seek it to the end.
 */
export function RevealStage({ className }: { className?: string }) {
  const { status, card, restored, warming, settled, onFilmFailed, onRevealComplete } = useReveal();
  const backVideoRef = useRef<HTMLVideoElement>(null);
  const cardVideoRef = useRef<HTMLVideoElement>(null);
  const cardImageRef = useRef<HTMLImageElement>(null);
  const sourceRef = useRef<VideoSource | null>(null);
  const [backReady, setBackReady] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [sourceReady, setSourceReady] = useState(false);
  const reducedMotion = useReducedMotion();

  const cardMounted = status !== "idle";

  // The film is fetched before the click, so the element exists while the card
  // back is still showing. Everything visible stays gated on the click.
  //
  // **Unprompted warming waits for the backend to answer.** Until it does,
  // `card` is the bundled fallback, and fetching that on spec would pull an
  // 18MB MP4 for a card almost nobody will end up seeing. A click does not
  // wait, because by then the visitor is owed something to watch.
  const filmWanted = !restored && Boolean(card.video) && (cardMounted || (warming && settled));

  const showFace = cardMounted && cardReady;
  const showBack = !showFace;
  const showStill = showBack && !backReady;
  const instant = Boolean(reducedMotion);

  useEffect(() => {
    const video = backVideoRef.current;
    if (!video || showFace) return;

    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setBackReady(true);
    };

    const tryPlay = () => {
      video.muted = true;
      void video.play().then(markReady).catch(() => {
        // Autoplay can still fail in edge cases; keep the still until it recovers.
      });
    };

    if (!video.paused && video.readyState >= 2) markReady();

    video.addEventListener("playing", markReady);
    video.addEventListener("loadeddata", tryPlay);
    tryPlay();

    return () => {
      cancelled = true;
      video.removeEventListener("playing", markReady);
      video.removeEventListener("loadeddata", tryPlay);
    };
  }, [showFace]);

  useEffect(() => {
    if (!cardMounted || !restored) return;

    // Already-seen card: the still stands in for the film, nothing to play.
    const image = cardImageRef.current;
    if (image?.complete) setCardReady(true);
  }, [cardMounted, restored, card.image.src]);

  // Fetching the film. Runs as soon as the visitor looks like they will press
  // the button, which is what stops the crossfade landing on the lowest
  // rendition. The source is attached here rather than through `src` because
  // the API serves HLS and only Safari can take that from an attribute.
  useEffect(() => {
    const video = cardVideoRef.current;
    if (!video || !filmWanted || !card.video) return;

    const source = attachVideoSource(video, card.video);
    sourceRef.current = source;

    let cancelled = false;

    const handleFailure = (error: unknown) => {
      if (cancelled) return;
      // Falls back to the bundled card through the same path an unreachable
      // API already uses — see `onFilmFailed`. Loud here, invisible to the
      // visitor: the card back is still showing, so the swap underneath it
      // is not.
      console.error("The card's film could not play, falling back to the bundled card.", error);
      onFilmFailed();
    };

    void source.ready.then(() => {
      if (!cancelled) setSourceReady(true);
    }, handleFailure);
    source.onFatalError(handleFailure);

    return () => {
      cancelled = true;
      sourceRef.current = null;
      setSourceReady(false);
      source.detach();
    };
  }, [filmWanted, card.video, onFilmFailed]);

  // Playing it, once they have actually asked.
  useEffect(() => {
    if (!cardMounted || restored || !sourceReady) return;

    const video = cardVideoRef.current;
    const source = sourceRef.current;
    if (!video || !source) return;

    // They are watching now, so the warm buffer cap comes off.
    source.release();

    // The reveal is user-initiated, so the browser allows sound here.
    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      void video.play();
    });
  }, [cardMounted, restored, sourceReady]);

  useEffect(() => {
    if (showFace) backVideoRef.current?.pause();
  }, [showFace]);

  const handleFadeComplete = useCallback(() => {
    if (cardReady && !restored) onRevealComplete();
  }, [cardReady, restored, onRevealComplete]);

  const fade = { duration: instant ? 0 : REVEAL_CROSSFADE_SECONDS, ease: "easeInOut" as const };
  const stillFade = {
    duration: instant ? 0 : STILL_HANDOFF_SECONDS,
    ease: "easeOut" as const,
  };

  return (
    <div className={cn("stack aspect-[449/743] overflow-hidden", className)}>
      <motion.video
        ref={backVideoRef}
        className="size-full object-cover"
        src={cardBack.video}
        aria-hidden
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        animate={{ opacity: showBack ? 1 : 0 }}
        transition={fade}
      />

      <motion.img
        className="pointer-events-none size-full object-cover"
        src={cardBack.poster.src}
        width={cardBack.poster.width}
        height={cardBack.poster.height}
        alt=""
        aria-hidden
        animate={{ opacity: showStill ? 1 : 0 }}
        transition={showFace ? fade : stillFade}
      />

      {cardMounted && restored ? (
        <motion.img
          ref={cardImageRef}
          className="size-full object-cover"
          src={card.image.src}
          width={card.image.width}
          height={card.image.height}
          alt={`${card.name}, your card`}
          initial={{ opacity: 0 }}
          animate={{ opacity: showFace ? 1 : 0 }}
          transition={fade}
          onLoad={() => setCardReady(true)}
          onAnimationComplete={handleFadeComplete}
        />
      ) : null}

      {/*
        Mounted while warming, which is before the click, so it is deliberately
        transparent and inert until `showFace`. `showFace` requires the click,
        so a film that finishes buffering early cannot reveal itself.
      */}
      {filmWanted ? (
        <motion.video
          ref={cardVideoRef}
          className="size-full object-cover"
          aria-label={`${card.name}, your card`}
          aria-hidden={!cardMounted}
          playsInline
          preload="auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: showFace ? 1 : 0 }}
          transition={fade}
          onPlaying={() => setCardReady(true)}
          onAnimationComplete={handleFadeComplete}
        />
      ) : null}
    </div>
  );
}
