"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import { brand } from "@/lib/assets";
import { cn } from "@/lib/cn";

import { useReveal } from "./reveal-context";

const EXIT_SECONDS = 0.45;
const ENTER_SECONDS = 0.5;

/**
 * Drives the reveal, then yields to the card's name.
 *
 * The CTA paints immediately — no enter animation. It is the first thing the
 * hero asks the visitor to do, so it should already be there, not arrive.
 * On click the gold button exits (blur + lift) before the card name enters in
 * the same footprint. On a restored visit the button never mounts — only the
 * name enters — so there is no button flash and no gray disabled hold.
 *
 * The swap is keyed to `revealing`, i.e. the click itself, not to the card's
 * crossfade finishing: the press has to feel answered right away rather than a
 * second and a half later. `RevealStage` still drives `revealed` when its fade
 * completes — that is what commits the card to the session — but nothing here
 * waits for it. A restored visit is already `revealed` on first render, so it
 * still shows the name immediately.
 */
export function RevealTrigger({
  label = "REVEAL YOUR CARD",
  question = "Why has this card appeared for you today?",
  className,
}: {
  label?: string;
  question?: string;
  className?: string;
}) {
  const { status, card, ready, reveal } = useReveal();
  const reducedMotion = useReducedMotion();

  const showName = status !== "idle";
  const skipMotion = Boolean(reducedMotion);

  const enterFrom = skipMotion ? false : { opacity: 0, y: 10, filter: "blur(4px)" };
  const visible = { opacity: 1, y: 0, filter: "blur(0px)" };
  const exitTransition = {
    duration: skipMotion ? 0 : EXIT_SECONDS,
    ease: "easeOut" as const,
  };
  const enterTransition = {
    duration: skipMotion ? 0 : ENTER_SECONDS,
    ease: "easeOut" as const,
  };

  return (
    <div
      className={cn(
        "stack w-fit max-w-full min-h-[2.66em] place-items-center text-center text-nav lg:w-full lg:max-w-[28.0625rem]",
        className,
      )}
    >
      {ready ? (
        <AnimatePresence mode="wait">
          {!showName ? (
            <motion.div
              key="button"
              className="w-fit max-w-full"
              initial={false}
              exit={
                skipMotion
                  ? { opacity: 0, transition: exitTransition }
                  : { opacity: 0, y: -8, filter: "blur(4px)", transition: exitTransition }
              }
            >
              <Button
                size="lg"
                onClick={reveal}
                className="w-fit justify-start gap-[0.72em] pl-[0.4em] pr-[1.2em] font-bold tracking-[-0.01em] lg:w-full"
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
          ) : (
            <motion.div
              key="name"
              className="flex w-full flex-col justify-center gap-[0.15em]"
              initial={enterFrom}
              animate={visible}
              transition={enterTransition}
              aria-live="polite"
            >
              {/* Set to match the hero tagline above it exactly — same family, size and colour. */}
              <p className="font-serif text-lead text-gold">
                {card.number} · {card.name}
              </p>
              <p className="text-caption leading-[1.2] text-mist">{question}</p>
            </motion.div>
          )}
        </AnimatePresence>
      ) : null}
    </div>
  );
}
