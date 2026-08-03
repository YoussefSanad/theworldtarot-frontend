"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";

import { useReveal } from "@/components/reveal";
import { hero } from "@/content/home";
import { cn } from "@/lib/cn";
import type { ImageAsset } from "@/lib/assets";

/**
 * The hero's two secondary actions, plus what happens to them after a reveal.
 *
 * Once the card is revealed the pair takes a slow glow pulse — the nudge toward
 * the next step now that the free look is spent — and the return prompt fades
 * in beneath them a beat later, so the two land in that order rather than
 * together. Both also apply on a restored visit, where the status is already
 * `revealed` on first render.
 *
 * This is a client component only because it reads the reveal status; it sits
 * inside `RevealProvider`'s subtree in the hero, so no provider change is
 * needed. `ConceptHero` keeps its own static copy of the action markup.
 */

const PROMPT_DELAY_SECONDS = 0.5;

/** Secondary hero action: icon beside a two-line Cinzel label. */
function HeroAction({
  href,
  icon,
  label,
  pulsing,
}: {
  href: string;
  icon: ImageAsset;
  label: string[];
  pulsing: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "btn btn-ghost w-fit min-h-[3.7em] justify-start gap-[0.75em] py-[0.65em] pr-[1.75em] pl-[1.1em] text-caption",
        pulsing && "pulse-glow",
      )}
    >
      <Image src={icon.src} alt="" width={icon.width} height={icon.height} className="h-[2em] w-auto shrink-0" />
      <span className="text-left leading-[1.36] tracking-[-0.02em]">
        {label.map((line) => (
          <span key={line} className="block whitespace-nowrap">
            {line}
          </span>
        ))}
      </span>
    </Link>
  );
}

export function HeroActions() {
  const { status } = useReveal();
  const reducedMotion = useReducedMotion();

  const revealed = status === "revealed";
  const skipMotion = Boolean(reducedMotion);

  return (
    <div className="mt-[0.5em] flex w-full flex-col items-center gap-[0.9em] lg:items-start">
      <div className="flex w-full flex-col items-center gap-[1.25em] text-caption sm:flex-row sm:flex-wrap sm:justify-center lg:flex-nowrap lg:justify-start lg:gap-[1.5em]">
        {hero.secondaryActions.map((action) => (
          <HeroAction
            key={action.href}
            href={action.href}
            icon={action.icon}
            label={action.label}
            pulsing={revealed}
          />
        ))}
      </div>

      {revealed ? (
        <motion.p
          className="w-full text-center text-caption tracking-[0.01em] text-mist-dim"
          initial={skipMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: skipMotion ? 0 : 0.6,
            delay: skipMotion ? 0 : PROMPT_DELAY_SECONDS,
            ease: "easeOut",
          }}
        >
          {hero.returnPrompt}
        </motion.p>
      ) : null}
    </div>
  );
}
