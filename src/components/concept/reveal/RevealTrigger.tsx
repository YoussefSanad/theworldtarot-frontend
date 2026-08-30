"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import { brand } from "@/lib/assets";
import { cn } from "@/lib/cn";

import { useReveal } from "./reveal-context";

const FADE_SECONDS = 0.8;

/**
 * Drives the reveal, then yields to the card's name.
 *
 * Once the crossfade finishes the gold button fades out and the revealed card
 * name plus a short question take its place in the same footprint. Restored
 * visits skip the button and fade the name in with the cinematic replay.
 */
export function RevealTrigger({
  label = "REVEAL YOUR CARD",
  question = "Why has this card appeared for you now?",
  className,
}: {
  label?: string;
  question?: string;
  className?: string;
}) {
  const { status, card, restored, reveal } = useReveal();
  const reducedMotion = useReducedMotion();

  const isRevealed = status === "revealed";
  const showButton = !restored && !isRevealed;
  const fade = { duration: reducedMotion ? 0 : FADE_SECONDS, ease: "easeInOut" as const };

  return (
    <div className={cn("stack w-fit max-w-full min-h-[2.66em] items-center text-nav lg:w-full lg:max-w-[28.0625rem]", className)}>
      <motion.div
        className={cn("w-fit max-w-full", !showButton && "pointer-events-none")}
        animate={{ opacity: showButton ? 1 : 0 }}
        transition={fade}
        aria-hidden={!showButton}
      >
        <Button
          size="lg"
          onClick={reveal}
          disabled={status === "revealing"}
          aria-busy={status === "revealing"}
          tabIndex={showButton ? undefined : -1}
          className="w-fit justify-start gap-[0.72em] pl-[0.4em] pr-[1.2em] font-bold tracking-[-0.01em]"
        >
          <span aria-hidden className="stack size-[2em] shrink-0 place-items-center rounded-full bg-black">
            <Image
              src={brand.revealStar.src}
              alt=""
              width={brand.revealStar.width}
              height={brand.revealStar.height}
              className="w-[1.77em]"
            />
          </span>
          {label}
        </Button>
      </motion.div>

      <motion.div
        className="flex w-full flex-col justify-center gap-[0.15em]"
        initial={false}
        animate={{ opacity: isRevealed ? 1 : 0 }}
        transition={fade}
        aria-hidden={!isRevealed}
        aria-live="polite"
      >
        {isRevealed ? (
          <>
            <p className="font-display text-h3 leading-none tracking-[0.01em] text-cream">{card.name}</p>
            <p className="text-caption leading-[1.2] text-mist">{question}</p>
          </>
        ) : null}
      </motion.div>
    </div>
  );
}
