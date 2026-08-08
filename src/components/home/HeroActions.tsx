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
 * Neither effect may change this column's height: the hero grid centres it, so
 * anything that grows here moves the title and the card name too. That is why
 * the pulse is a shadow and the prompt is always in flow (see below).
 *
 * This is a client component only because it reads the reveal status; it sits
 * inside `RevealProvider`'s subtree in the hero, so no provider change is
 * needed. `ConceptHero` keeps its own static copy of the action markup.
 */

const PROMPT_DELAY_SECONDS = 0.5;

/**
 * Secondary hero action: icon beside a two-line Cinzel label.
 *
 * Below `sm` the row goes on one line even on phones, so the label swaps to
 * `labelMobile` — shorter copy at a smaller inherited font (`text-fine` on
 * the row wrapper) plus tighter icon/gap/padding here. Both label sets stay
 * in the DOM with one hidden via CSS (matching the `body`/`bodyMobile`
 * pattern in Hero.tsx) rather than picked in JS, so there's no
 * hydration-dependent branch. From `sm` up this is identical to before.
 */
function HeroAction({
  href,
  icon,
  label,
  labelMobile,
  pulsing,
}: {
  href: string;
  icon: ImageAsset;
  label: string[];
  labelMobile: string[];
  pulsing: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "btn btn-ghost min-w-[155px] min-h-[3em] justify-start gap-[0.4em] py-[0.4em] pr-[1.05em] pl-[0.75em] sm:min-w-(--hero-action-btn-min-w) sm:gap-(--hero-action-gap) sm:py-(--hero-action-py) sm:pr-(--hero-action-pr) sm:pl-(--hero-action-pl) lg:min-h-[3.7em]",
        pulsing && "pulse-glow",
      )}
    >
      <Image
        src={icon.src}
        alt=""
        width={icon.width}
        height={icon.height}
        className="h-[1.7em] w-auto shrink-0"
      />
      <span className="text-left leading-[1.15] tracking-[-0.02em] lg:leading-[1.36]">
        <span className="sm:hidden">
          {labelMobile.map((line) => (
            <span key={line} className="block whitespace-nowrap">
              {line}
            </span>
          ))}
        </span>
        <span className="hidden sm:block">
          {label.map((line) => (
            <span key={line} className="block whitespace-nowrap">
              {line}
            </span>
          ))}
        </span>
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
    <div className="mt-[0.4em] flex w-full flex-col items-center gap-[0.9em] lg:mt-[0.5em] lg:items-start">
      <div className="flex items-center gap-[0.55em] text-fine sm:gap-(--hero-action-row-gap) sm:text-caption">
        {hero.secondaryActions.map((action) => (
          <HeroAction
            key={action.href}
            href={action.href}
            icon={action.icon}
            label={action.label}
            labelMobile={action.labelMobile}
            pulsing={revealed}
          />
        ))}
      </div>

      {/* The prompt holds its place in the flow from first paint and only its
          opacity animates. Mounting it on reveal grew this column by a line of
          text, and because the hero grid centres the column, everything above —
          title, divider, the card name that had just appeared — jumped up half
          that height the instant the crossfade landed. Reserving the line
          instead of measuring one is also what keeps it right when the prompt
          wraps to two lines on a narrow screen. */}
      <motion.p
        className="w-full text-center text-caption tracking-[0.01em] text-mist-dim"
        aria-hidden={!revealed}
        initial={skipMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 6 }}
        transition={{
          duration: skipMotion ? 0 : 0.6,
          delay: skipMotion || !revealed ? 0 : PROMPT_DELAY_SECONDS,
          ease: "easeOut",
        }}
      >
        <span className="inline-block rounded-2xl bg-night/20 px-[1em] py-[0.35em] backdrop-blur-[2px]">
          <span aria-hidden className="text-gold">
            ★{" "}
          </span>
          {hero.returnPrompt}
        </span>
      </motion.p>
    </div>
  );
}
