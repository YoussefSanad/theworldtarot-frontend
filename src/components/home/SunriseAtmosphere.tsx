"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useReveal } from "@/components/reveal";
import { artwork } from "@/lib/assets";

/** Same effective strength as the baked-alpha webp — see assets.ts. Constant, not animated: the globe is "already there" from frame one. */
const GLOBE_OPACITY_CAP = 0.18;

/** px — resolves against the shared wrapper, not either layer's own height, so it can't drift the two apart. */
const RISE_PX = 48;
const RISE_SECONDS = 1.6;
/** easeOutCubic — settles, doesn't snap. */
const RISE_EASE = [0.33, 1, 0.68, 1] as const;

/** The beat of near-total dark before the glare begins its climb. */
const SHINE_DELAY_SECONDS = 0.4;
/** Deliberately much longer than the world's own rise — the glare is still working long after the world has landed. */
const SHINE_SECONDS = 5.6;
const SHINE_START_OPACITY = 0.12;
const SHINE_START_BRIGHTNESS = 0.35;
/** Today's dawn values, unchanged — the crescendo lands exactly where the old fade-in used to. */
const SHINE_REST_OPACITY = 0.85;
const SHINE_REST_BRIGHTNESS = 0.9;
/** ~1.07x rest — the bloom the crescendo overshoots into before settling. */
const SHINE_PEAK_BRIGHTNESS = 0.96;

/** Faster than the crescendo — this is an echo of a moment already in progress, not a second reveal. */
const REVEAL_SECONDS = 2.6;

type SkyPhase = "approach" | "landed" | "full";

/**
 * Animates the hero's world arriving after page load: the earth and glare
 * slide up into place from below over a short beat, while the sun's glare
 * keeps climbing on its own much longer timeline — a slow crescendo that
 * gathers speed and crests in a brief bloom before settling to today's
 * resting values. Then brightens further when the card is revealed. Portals
 * into #hero-sky (src/app/(site)/layout.tsx) so it paints behind the header
 * despite living inside Hero.tsx's RevealProvider.
 *
 * .hero-sky-shine / .hero-sky-globe (globals.css) are two separately
 * absolutely-positioned layers whose left/top/width are tuned calc()
 * percentages, carrying their own warning: move both together, by the same
 * pixels, or the glint slides off the globe. Both images are portaled
 * inside one shared wrapper div, and the rise (a plain `y` translate) lives
 * on THAT wrapper — pure translation needs no transform-origin and can't
 * desync the two layers riding inside it, the way a scale would.
 *
 * The globe never fades — it renders at GLOBE_OPACITY_CAP from the first
 * frame ("the world was already there"); its arrival is carried entirely by
 * the wrapper's rise, which lands at RISE_SECONDS. The shine's own timeline
 * is deliberately much longer (SHINE_SECONDS, starting after
 * SHINE_DELAY_SECONDS of near-total dark) and keeps running well after the
 * wrapper has landed — the glare is still visibly dim once the world has
 * stopped moving, then gathers speed and blooms. That shape needs keyframe
 * arrays with explicit `times`, not a single easing curve, and opacity and
 * filter each carry their own keyframe/timing arrays since they don't share
 * the same number of stops — `delay` is set once at the transition's top
 * level so both inherit it.
 */
export function SunriseAtmosphere() {
  const { status } = useReveal();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<SkyPhase>("approach");
  const [mounted, setMounted] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const loaded = useRef({ globe: false, shine: false });

  const isFull = status === "revealing" || status === "revealed";

  const markLoaded = (key: "globe" | "shine") => {
    loaded.current[key] = true;
    if (loaded.current.globe && loaded.current.shine) setAssetsReady(true);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setPhase(isFull ? "full" : "landed");
      return;
    }

    if (isFull) {
      setPhase("full");
      return;
    }

    setPhase("approach");
    if (!assetsReady) return;

    const frame = requestAnimationFrame(() => setPhase("landed"));
    return () => cancelAnimationFrame(frame);
  }, [isFull, reducedMotion, assetsReady]);

  const wrapperTransition = reducedMotion ? { duration: 0 } : { duration: RISE_SECONDS, ease: RISE_EASE };

  const wrapperAnimate = phase === "approach" && !isFull ? { y: RISE_PX } : { y: 0 };

  const shineTransition = reducedMotion
    ? { duration: 0 }
    : isFull
      ? { duration: REVEAL_SECONDS, ease: "easeInOut" as const }
      : phase === "approach"
        ? { duration: 0 }
        : {
            delay: SHINE_DELAY_SECONDS,
            opacity: { duration: SHINE_SECONDS, times: [0, 0.6, 1], ease: ["linear", [0.4, 0, 0.2, 1]] as const },
            filter: {
              duration: SHINE_SECONDS,
              times: [0, 0.6, 0.88, 1],
              ease: ["linear", [0.4, 0, 0.2, 1], "easeOut"] as const,
            },
          };

  const shineAnimate = isFull
    ? { opacity: 1, filter: "brightness(1)" }
    : phase === "approach"
      ? { opacity: SHINE_START_OPACITY, filter: `brightness(${SHINE_START_BRIGHTNESS})` }
      : {
          opacity: [SHINE_START_OPACITY, 0.28, SHINE_REST_OPACITY],
          filter: [
            `brightness(${SHINE_START_BRIGHTNESS})`,
            "brightness(0.48)",
            `brightness(${SHINE_PEAK_BRIGHTNESS})`,
            `brightness(${SHINE_REST_BRIGHTNESS})`,
          ],
        };

  if (!mounted) return null;

  const portalTarget = document.getElementById("hero-sky");
  if (!portalTarget) return null;

  return createPortal(
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-x-clip"
      initial={{ y: RISE_PX }}
      animate={wrapperAnimate}
      transition={wrapperTransition}
    >
      <div className="hero-sky-globe">
        <Image
          src={artwork.worldGlobe.src}
          alt=""
          width={artwork.worldGlobe.width}
          height={artwork.worldGlobe.height}
          className="h-auto w-full max-w-none"
          style={{ opacity: GLOBE_OPACITY_CAP }}
          onLoad={() => markLoaded("globe")}
        />
      </div>

      <motion.div
        className="hero-sky-shine"
        initial={{ opacity: SHINE_START_OPACITY, filter: `brightness(${SHINE_START_BRIGHTNESS})` }}
        animate={shineAnimate}
        transition={shineTransition}
      >
        <Image
          src={artwork.worldShine.src}
          alt=""
          width={artwork.worldShine.width}
          height={artwork.worldShine.height}
          className="h-auto w-full max-w-none"
          onLoad={() => markLoaded("shine")}
        />
      </motion.div>
    </motion.div>,
    portalTarget,
  );
}
