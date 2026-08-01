"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cardBack } from "@/content/cards";
import { cn } from "@/lib/cn";

import { useReveal } from "./reveal-context";

const CROSSFADE_SECONDS = 1.4;

/**
 * The card itself: a looping back-of-card video that crossfades into the
 * revealed card face in the same frame. Both layers share one grid cell, so the
 * swap never moves anything on the page.
 *
 * The fade waits until the face image has pixels to show, otherwise the
 * crossfade can land on an empty frame while the file loads.
 */
export function RevealStage({ className }: { className?: string }) {
  const { status, card, restored, onRevealComplete } = useReveal();
  const backVideoRef = useRef<HTMLVideoElement>(null);
  const cardImageRef = useRef<HTMLImageElement>(null);
  const [cardReady, setCardReady] = useState(false);
  const reducedMotion = useReducedMotion();

  const cardMounted = status !== "idle";

  useEffect(() => {
    const image = cardImageRef.current;
    if (!image || !cardMounted) return;
    if (image.complete) setCardReady(true);
  }, [cardMounted, card.image.src]);

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
        <motion.img
          ref={cardImageRef}
          className="size-full object-cover"
          src={card.image.src}
          width={card.image.width}
          height={card.image.height}
          alt={`${card.name}, your card`}
          initial={{ opacity: 0 }}
          animate={{ opacity: cardReady ? 1 : 0 }}
          transition={fade}
          onLoad={() => setCardReady(true)}
          onAnimationComplete={handleFadeComplete}
        />
      ) : null}
    </div>
  );
}
