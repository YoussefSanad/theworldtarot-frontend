"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { artwork } from "@/lib/assets";

import { useReveal } from "./reveal-context";

/** Matches former `.page-atmosphere` slots for shine / globe (scroll with the page). */
const SHINE = {
  widthPct: 121.93,
  posX: 0.613,
  posY: "5%",
} as const;

const GLOBE = {
  widthPct: 100.21,
  posX: 1.5,
  posY: "1%",
  /** Same effective strength as the old baked-alpha webp. */
  opacityCap: 0.18,
} as const;

/** Figma homepage frame width — content caps here; atmosphere keeps growing past it. */
const DESIGN_WIDTH = 1920;

/**
 * Absolute `top` that matches `posY` at DESIGN_WIDTH, then rises 1:1 with image
 * height growth so the bottom edge stays put on ultra-wide viewports.
 */
function bottomLockedTop(posY: string, widthPct: number, asset: { width: number; height: number }) {
  const aspect = asset.height / asset.width;
  const heightAtDesign = (widthPct / 100) * DESIGN_WIDTH * aspect;
  return `calc(${posY} + ${heightAtDesign}px - ${widthPct * aspect}vw)`;
}

const DAWN_SECONDS = 3;
const GLOBE_FADE_SECONDS = 1.1;
const REVEAL_SECONDS = 1.4;

type SkyPhase = "night" | "dawn" | "full";

/**
 * Rising sun + world behind the hero. Portals into `#concept-sky` so layers
 * sit above the CSS atmosphere backgrounds and behind page chrome.
 */
export function SunriseAtmosphere() {
  const { status, onDawnSettled } = useReveal();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<SkyPhase>("night");
  const [mounted, setMounted] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const loaded = useRef({ globe: false, shine: false });
  const dawnNotified = useRef(false);
  const onDawnSettledRef = useRef(onDawnSettled);
  onDawnSettledRef.current = onDawnSettled;

  const isFull = status === "revealing" || status === "revealed";

  const markLoaded = (key: "globe" | "shine") => {
    loaded.current[key] = true;
    if (loaded.current.globe && loaded.current.shine) setAssetsReady(true);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    dawnNotified.current = false;

    if (reducedMotion) {
      setPhase(isFull ? "full" : "dawn");
      if (!isFull) {
        dawnNotified.current = true;
        onDawnSettledRef.current();
      }
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

  const globeOpacity = phase === "night" && !isFull ? 0 : GLOBE.opacityCap;

  if (!mounted) return null;

  const portalTarget = document.getElementById("concept-sky") ?? document.body;

  return createPortal(
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-full min-h-full overflow-x-clip">
      <motion.div
        className="absolute max-w-none"
        style={{
          width: `${GLOBE.widthPct}%`,
          left: `calc((100% - ${GLOBE.widthPct}%) * ${GLOBE.posX})`,
          top: bottomLockedTop(GLOBE.posY, GLOBE.widthPct, artwork.worldGlobe),
        }}
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
          priority
          onLoad={() => markLoaded("globe")}
        />
      </motion.div>

      <motion.div
        className="absolute max-w-none"
        style={{
          width: `${SHINE.widthPct}%`,
          left: `calc((100% - ${SHINE.widthPct}%) * ${SHINE.posX})`,
          top: bottomLockedTop(SHINE.posY, SHINE.widthPct, artwork.worldShine),
        }}
        initial={{ opacity: 0, filter: "brightness(0.45)", y: "6%" }}
        animate={shineAnimate}
        transition={shineTransition}
        onAnimationComplete={() => {
          if (isFull || phase !== "dawn" || dawnNotified.current) return;
          dawnNotified.current = true;
          onDawnSettledRef.current();
        }}
      >
        <Image
          src={artwork.worldShine.src}
          alt=""
          width={artwork.worldShine.width}
          height={artwork.worldShine.height}
          className="h-auto w-full max-w-none"
          priority
          onLoad={() => markLoaded("shine")}
        />
      </motion.div>
    </div>,
    portalTarget,
  );
}
