"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cardBack } from "@/content/cards";
import { cn } from "@/lib/cn";

import { useReveal } from "./reveal-context";

const CROSSFADE_SECONDS = 1.4;

/**
 * The card itself: a looping back-of-card video that crossfades into the
 * revealed card in the same frame. Both layers share one grid cell, so the
 * swap never moves anything on the page.
 *
 * The fade waits until the card video has pixels to show, otherwise the
 * crossfade lands on a black frame while the file buffers.
 */
export function RevealStage({ className }: { className?: string }) {
  const { status, card, restored, onRevealComplete } = useReveal();
  const backVideoRef = useRef<HTMLVideoElement>(null);
  const cardVideoRef = useRef<HTMLVideoElement>(null);
  const [cardReady, setCardReady] = useState(false);
  const reducedMotion = useReducedMotion();

  const cardMounted = status !== "idle";

  useEffect(() => {
    const video = cardVideoRef.current;
    if (!video || !cardMounted) return;

    if (restored) {
      // A card already revealed this visit is shown on its closing frame.
      const freeze = () => {
        video.currentTime = Math.max(0, video.duration - 0.05);
      };
      if (video.readyState >= 1) freeze();
      else video.addEventListener("loadedmetadata", freeze, { once: true });
      return;
    }

    // The reveal is user-initiated, so the browser allows sound here.
    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      void video.play();
    });
  }, [cardMounted, restored]);

  useEffect(() => {
    if (cardReady) backVideoRef.current?.pause();
  }, [cardReady]);

  const handleFadeComplete = useCallback(() => {
    if (cardReady && !restored) onRevealComplete();
  }, [cardReady, restored, onRevealComplete]);

  const fade = { duration: reducedMotion ? 0 : CROSSFADE_SECONDS, ease: "easeInOut" as const };

  return (
    <div className={cn("stack aspect-[449/743] overflow-hidden", className)}>
      <motion.video
        ref={backVideoRef}
        className="size-full object-cover"
        poster={cardBack.poster.src}
        src={cardBack.video}
        aria-hidden
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        animate={{ opacity: cardReady ? 0 : 1 }}
        transition={fade}
      />

      {cardMounted ? (
        <motion.video
          ref={cardVideoRef}
          className="size-full object-cover"
          src={card.video}
          playsInline
          preload="auto"
          aria-label={`${card.name}, your card`}
          initial={{ opacity: 0 }}
          animate={{ opacity: cardReady ? 1 : 0 }}
          transition={fade}
          onPlaying={() => setCardReady(true)}
          onSeeked={() => setCardReady(true)}
          onAnimationComplete={handleFadeComplete}
        />
      ) : null}
    </div>
  );
}
