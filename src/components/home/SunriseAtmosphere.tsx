"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useReveal } from "@/components/reveal";
import { artwork } from "@/lib/assets";

/** Same effective strength as the baked-alpha webp — see assets.ts. */
const GLOBE_OPACITY_CAP = 0.18;

const DAWN_SECONDS = 3;
const GLOBE_FADE_SECONDS = 1.1;
/** Faster than the dawn-in — this is an echo of a moment already in progress, not a second reveal. */
const REVEAL_SECONDS = 2.6;

type SkyPhase = "night" | "dawn" | "full";

/**
 * Animates the hero's sun (world-shine) and earth (world-globe) in on load,
 * then brightens further when the card is revealed. Portals into #hero-sky
 * (src/app/(site)/layout.tsx) so it paints behind the header despite living
 * inside Hero.tsx's RevealProvider. Placement is entirely CSS
 * (.hero-sky-shine / .hero-sky-globe in globals.css) — Motion only ever
 * touches opacity, filter and a translateY nudge, so the resting placement
 * math can't be perturbed by the animation.
 */
export function SunriseAtmosphere() {
  const { status } = useReveal();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<SkyPhase>("night");
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
      setPhase(isFull ? "full" : "dawn");
      return;
    }

    if (isFull) {
      setPhase("full");
      return;
    }

    setPhase("night");
    if (!assetsReady) return;

    const frame = requestAnimationFrame(() => setPhase("dawn"));
    return () => cancelAnimationFrame(frame);
  }, [isFull, reducedMotion, assetsReady]);

  const shineTransition = reducedMotion
    ? { duration: 0 }
    : isFull
      ? { duration: REVEAL_SECONDS, ease: "easeInOut" as const }
      : { duration: DAWN_SECONDS, ease: "easeOut" as const };

  const globeTransition = reducedMotion
    ? { duration: 0 }
    : { duration: GLOBE_FADE_SECONDS, ease: "easeOut" as const };

  const shineAnimate = isFull
    ? { opacity: 1, filter: "brightness(1)", y: "0%" }
    : phase === "dawn"
      ? { opacity: 0.85, filter: "brightness(0.9)", y: "0%" }
      : { opacity: 0, filter: "brightness(0.45)", y: "6%" };

  const globeOpacity = phase === "night" && !isFull ? 0 : GLOBE_OPACITY_CAP;

  if (!mounted) return null;

  const portalTarget = document.getElementById("hero-sky");
  if (!portalTarget) return null;

  return createPortal(
    <>
      <motion.div
        className="hero-sky-globe"
        initial={{ opacity: 0 }}
        animate={{ opacity: globeOpacity }}
        transition={globeTransition}
      >
        <Image
          src={artwork.worldGlobe.src}
          alt=""
          width={artwork.worldGlobe.width}
          height={artwork.worldGlobe.height}
          className="h-auto w-full max-w-none"
          onLoad={() => markLoaded("globe")}
        />
      </motion.div>

      <motion.div
        className="hero-sky-shine"
        initial={{ opacity: 0, filter: "brightness(0.45)", y: "6%" }}
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
    </>,
    portalTarget,
  );
}
