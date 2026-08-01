"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cardBack } from "@/content/cards";
import { cn } from "@/lib/cn";

import { REVEAL_CROSSFADE_SECONDS, useReveal } from "./reveal-context";

const STILL_HANDOFF_SECONDS = 0.35;

/**
 * Concept card stage: looping back video crossfades into the still face.
 * Uses frontend media (compressed back + still) — no concept-only MP4s.
 */
export function RevealStage({ className }: { className?: string }) {
  const { status, card, onRevealComplete } = useReveal();
  const backVideoRef = useRef<HTMLVideoElement>(null);
  const cardImageRef = useRef<HTMLImageElement>(null);
  const [backReady, setBackReady] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const reducedMotion = useReducedMotion();

  const cardMounted = status !== "idle";
  const showFace = cardReady;
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
      void video.play().then(markReady).catch(() => {});
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
    const image = cardImageRef.current;
    if (!image || !cardMounted) return;
    if (image.complete) setCardReady(true);
  }, [cardMounted, card.image.src]);

  useEffect(() => {
    if (showFace) backVideoRef.current?.pause();
  }, [showFace]);

  const handleFadeComplete = useCallback(() => {
    if (cardReady) onRevealComplete();
  }, [cardReady, onRevealComplete]);

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

      {cardMounted ? (
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
    </div>
  );
}
