"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { artwork } from "@/lib/assets";

const GLOBE_OPACITY = 0.25;
const GLOBE_FADE_SECONDS = 1.1;
const DAWN_SECONDS = 3;

const FLOWER_OPACITY = 0.08;
const FLOWER_FADE_SECONDS = 0.6;
/** How long before the shine's own dawn-in completes the flower should already be fully visible. */
const FLOWER_LEAD_SECONDS = 0.3;
const FLOWER_DELAY_SECONDS = DAWN_SECONDS - FLOWER_LEAD_SECONDS - FLOWER_FADE_SECONDS;

const MotionImage = motion.create(Image);

/**
 * Dawns the earth and sun glare in on load, same mechanism as the homepage's
 * SunriseAtmosphere (motion/react, gated on both images' onLoad) but landing
 * on THIS page's resting values (opacity-25 globe, full-strength shine) —
 * not the homepage's GLOBE_OPACITY_CAP or its post-reveal "full" waypoint,
 * neither of which has an equivalent here.
 *
 * Animates the <Image>s directly via motion.create(Image) rather than the
 * homepage's wrapper-<motion.div> pattern: on the homepage the wrapper owns
 * position/left/top/width that Motion must never touch, but here the globe
 * and shine images themselves carry the layout (self-end, h-[Nvh],
 * .fade-top) as direct .stack children, and an inserted wrapper would
 * become the grid item instead, duplicating that placement. This component
 * renders a fragment (no wrapper element) so both images stay direct
 * children of .stack in ComingSoonBackdrop.
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
 * FLOWER_LEAD_SECONDS − FLOWER_FADE_SECONDS), landing on its resting 0.08
 * shortly before the world comp finishes settling. Its wrapper div keeps
 * the `.slow-spin` rotation running throughout — only opacity fades in, so
 * a fully-formed, already-turning flower simply becomes visible rather
 * than spinning up from a standstill.
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
    <>
      <div className="absolute top-0 left-1/2 aspect-square w-screen -translate-x-1/2">
        <MotionImage
          src={artwork.flowerOfLife.src}
          alt=""
          width={artwork.flowerOfLife.width}
          height={artwork.flowerOfLife.height}
          className="slow-spin size-full opacity-[0.08]"
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
        className="fade-top relative h-[38vh] w-full self-end object-cover object-[center_40%] opacity-25"
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
    </>
  );
}
