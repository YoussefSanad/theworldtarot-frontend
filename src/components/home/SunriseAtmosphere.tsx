"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useReveal } from "@/components/reveal";
import { artwork } from "@/lib/assets";

/**
 * 0.7 rather than the 0.18 this animation originally shipped with. 0.18 matched
 * the old baked-alpha world-globe.webp; that artwork was replaced (80bc920) by
 * one that reads washed out at 0.18, and the replacement is still what's in
 * public/figma. Only the motion below was rolled back, not the asset. Tune by
 * eye.
 */
const GLOBE_OPACITY_CAP = 0.7;

const DAWN_SECONDS = 3;
const GLOBE_FADE_SECONDS = 1.1;
/** Faster than the dawn-in — this is an echo of a moment already in progress, not a second reveal. */
const REVEAL_SECONDS = 2.6;

type SkyPhase = "night" | "dawn" | "full";

/**
 * Animates the hero's sun (world-shine) and earth (world-globe) in on load,
 * then brightens further when the card is revealed. Portals into #hero-sky
 * (PageAtmosphere's hero variant) so it paints behind the header despite
 * living inside Hero.tsx's RevealProvider. Placement is entirely CSS
 * (.hero-sky-shine / .hero-sky-globe in globals.css) — Motion only ever
 * touches opacity, filter and a translateY nudge, so the resting placement
 * math can't be perturbed by the animation.
 *
 * **This is the intended animation. Do not let a merge swap it again.** A
 * second iteration — phases "approach"/"landed", a 48px rise on a shared
 * wrapper, and a 5.6s brightness crescendo built from keyframe arrays — was
 * written on the `ui-fixes` branch on 2026-08-12 and arrived on the shipping
 * line uninvited. The readings line still had this file at `840e3dc`
 * (08-20); `6498cc2b` ("Merge branch 'ui-fixes' into readings-page", 08-20)
 * overwrote it, and `f00eb75` (08-21) carried the same swap into
 * lang-currency-selection and on into staging. Neither merge was about the
 * sky — the file rode along. If SHINE_* constants and a wrapper `y` animation
 * appear here again, that is what has happened; this is the version to keep.
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
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-x-clip">
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
    </div>,
    portalTarget,
  );
}
