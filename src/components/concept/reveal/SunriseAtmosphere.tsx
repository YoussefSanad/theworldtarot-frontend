"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
/**
 * Whether we are past the server render, which gates the portal below: the
 * target element does not exist until the client has painted.
 *
 * A `useState` + `useEffect(() => setMounted(true), [])` pair is the usual
 * spelling and is a render that only exists to schedule another. This asks the
 * question directly instead — the server snapshot is `false`, the client one
 * `true`, and nothing ever changes so the subscribe is a no-op.
 */
const subscribeToNothing = () => () => {};

function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

export function SunriseAtmosphere() {
  const { status, onDawnSettled } = useReveal();
  const reducedMotion = useReducedMotion();
  const [assetsReady, setAssetsReady] = useState(false);
  const mounted = useMounted();
  const loaded = useRef({ globe: false, shine: false });
  const dawnNotified = useRef(false);

  // Held in a ref so the effects below can call the latest one without
  // resubscribing whenever the context hands back a new identity. Written in an
  // effect rather than during render: a render can be thrown away or replayed,
  // and one that mutates a ref on the way past leaves that write behind either
  // way.
  const onDawnSettledRef = useRef(onDawnSettled);

  useEffect(() => {
    onDawnSettledRef.current = onDawnSettled;
  }, [onDawnSettled]);

  const isFull = status === "revealing" || status === "revealed";

  const markLoaded = (key: "globe" | "shine") => {
    loaded.current[key] = true;
    if (loaded.current.globe && loaded.current.shine) setAssetsReady(true);
  };

  /**
   * The sky is derived from the reveal below, with one exception: the night to
   * dawn move has to be a *transition*, so the sky must paint at night for one
   * frame before it is told to go to dawn. That single frame is the only thing
   * here that is genuinely state, and it is recorded as the situation it was
   * awarded for rather than as a bare boolean — when `isFull` goes back to
   * false the key changes, the frame is stale, and the sky starts from night
   * again instead of snapping straight to dawn.
   */
  const dawnKey = `${isFull}:${reducedMotion}:${assetsReady}`;
  const [dawnFrameFor, setDawnFrameFor] = useState<string | null>(null);

  useEffect(() => {
    if (reducedMotion || isFull || !assetsReady) return;

    const frame = requestAnimationFrame(() => setDawnFrameFor(dawnKey));
    return () => cancelAnimationFrame(frame);
  }, [dawnKey, isFull, reducedMotion, assetsReady]);

  const phase: SkyPhase = reducedMotion
    ? isFull
      ? "full"
      : "dawn"
    : isFull
      ? "full"
      : dawnFrameFor === dawnKey
        ? "dawn"
        : "night";

  /**
   * Under reduced motion the dawn never animates, so there is no animation
   * completion to report it — this is the only path that has to announce the
   * settled dawn itself. Every other path is announced by the shine's own
   * `onAnimationComplete` below, which is why both go through `dawnNotified`:
   * the reveal downstream must be told exactly once.
   */
  useEffect(() => {
    dawnNotified.current = false;

    if (!reducedMotion || isFull) return;

    dawnNotified.current = true;
    onDawnSettledRef.current();
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
