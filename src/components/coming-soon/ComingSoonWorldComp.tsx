"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { artwork } from "@/lib/assets";

const GLOBE_OPACITY = 0.35;
const GLOBE_FADE_SECONDS = 1.1;
const DAWN_SECONDS = 3;

const FLOWER_OPACITY = 0.12;
const FLOWER_FADE_SECONDS = 0.6;
/** How long before the shine's own dawn-in completes the flower should already be fully visible. */
const FLOWER_LEAD_SECONDS = 0.3;
const FLOWER_DELAY_SECONDS = DAWN_SECONDS - FLOWER_LEAD_SECONDS - FLOWER_FADE_SECONDS;

const MotionImage = motion.create(Image);

/**
 * Dawns the earth and sun glare in on load, same mechanism as the homepage's
 * SunriseAtmosphere (motion/react, gated on both images' onLoad) but landing
 * on THIS page's resting values (opacity-35 globe, full-strength shine) —
 * not the homepage's GLOBE_OPACITY_CAP or its post-reveal "full" waypoint,
 * neither of which has an equivalent here.
 *
 * Animates the <Image>s directly via motion.create(Image) rather than the
 * homepage's wrapper-<motion.div> pattern: on the homepage the wrapper owns
 * position/left/top/width that Motion must never touch, but here the globe
 * and shine images themselves carry the layout (self-end, h-[Nvh],
 * .fade-top) as direct .stack children.
 *
 * The whole comp is mirrored horizontally via a plain (non-Motion) wrapper
 * div, not a Tailwind scale-x class on the images themselves: Motion writes
 * transform as an inline style on the globe/shine (it animates `y`), and an
 * inline style always wins over a class-based transform, so a scale-x class
 * on those images would simply be clobbered. The wrapper re-declares
 * .stack's `display: grid` + `grid-rows-[100%]` + full size, the same fix
 * ComingSoonBackdrop.tsx documents for its own outer .stack: without a
 * pinned row, this wrapper's one implicit row would auto-size to its
 * tallest item (the 38vh globe) and sit at the wrapper's own top edge,
 * so `self-end` on globe/shine would anchor to that short auto row
 * instead of the wrapper's real (100%-of-container) bottom edge — silently
 * pulling both back up toward the middle of the page. Pinning the row to
 * 100% keeps `self-end` resolving against the actual container bottom,
 * exactly as it did back when globe/shine were direct .stack children.
 * This wrapper becomes the single grid item ComingSoonBackdrop's own
 * .stack lays out.
 *
 * `relative` on the globe/shine images is load-bearing, not cosmetic: it
 * puts them in the same paint step as the flower's `absolute` wrapper so
 * DOM order (flower, then globe, then shine) governs stacking. See the
 * note in ComingSoonBackdrop.tsx.
 *
 * The flower also lives here, not in ComingSoonBackdrop, so its reveal can
 * share the same `ready` gate as the world comp instead of running off its
 * own independent image-load timer — that's what lets it be timed relative
 * to the comp's dawn rather than merely coincide with it by accident. It
 * fades in during the tail end of the shine's dawn (delay = DAWN_SECONDS −
 * FLOWER_LEAD_SECONDS − FLOWER_FADE_SECONDS), landing on its resting 0.12
 * shortly before the world comp finishes settling. The image itself carries
 * `.slow-spin` and keeps that rotation running throughout — only opacity
 * fades in, so a fully-formed, already-turning flower simply becomes visible
 * rather than spinning up from a standstill. The class sits on the image and
 * not its wrapper because the wrapper owns the centering `-translate-x-1/2`,
 * which the keyframe's own `transform` would clobber (see globals.css); the
 * image has no transform of its own to lose, and Motion only writes the one
 * property it animates here (opacity), so it never overwrites the spin.
 */
export function ComingSoonWorldComp() {
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const loaded = useRef({ globe: false, shine: false });

  const markLoaded = (key: "globe" | "shine") => {
    loaded.current[key] = true;
    if (loaded.current.globe && loaded.current.shine) setReady(true);
  };

  useEffect(() => {
    if (reducedMotion) setReady(true);
  }, [reducedMotion]);

  const globeTransition = reducedMotion
    ? { duration: 0 }
    : { duration: GLOBE_FADE_SECONDS, ease: "easeOut" as const };

  const shineTransition = reducedMotion
    ? { duration: 0 }
    : { duration: DAWN_SECONDS, ease: "easeOut" as const };

  const flowerTransition = reducedMotion
    ? { duration: 0 }
    : { duration: FLOWER_FADE_SECONDS, delay: FLOWER_DELAY_SECONDS, ease: "easeOut" as const };

  return (
    <div className="stack size-full grid-rows-[100%] -scale-x-100">
      <div className="absolute top-0 left-1/2 aspect-square w-[90vw] -translate-x-1/2">
        <MotionImage
          src={artwork.flowerOfLife.src}
          alt=""
          width={artwork.flowerOfLife.width}
          height={artwork.flowerOfLife.height}
          className="slow-spin size-full opacity-[0.12]"
          initial={{ opacity: 0 }}
          animate={{ opacity: ready ? FLOWER_OPACITY : 0 }}
          transition={flowerTransition}
        />
      </div>

      <MotionImage
        src={artwork.worldGlobe.src}
        alt=""
        width={artwork.worldGlobe.width}
        height={artwork.worldGlobe.height}
        priority
        className="fade-top relative h-[38vh] w-full self-end object-cover object-[center_40%] opacity-35"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? GLOBE_OPACITY : 0 }}
        transition={globeTransition}
        onLoad={() => markLoaded("globe")}
      />

      <MotionImage
        src={artwork.worldShine.src}
        alt=""
        width={artwork.worldShine.width}
        height={artwork.worldShine.height}
        priority
        className="fade-top relative h-[25vh] w-full self-end object-cover object-[center_55%]"
        initial={{ opacity: 0, filter: "brightness(0.45)", y: "6%" }}
        animate={
          ready
            ? { opacity: 1, filter: "brightness(1)", y: "0%" }
            : { opacity: 0, filter: "brightness(0.45)", y: "6%" }
        }
        transition={shineTransition}
        onLoad={() => markLoaded("shine")}
      />
    </div>
  );
}
