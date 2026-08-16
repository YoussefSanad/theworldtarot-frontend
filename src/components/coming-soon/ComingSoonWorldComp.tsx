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
 * .fade-top) as direct children of the .stack they sit in. The one thing
 * their wrapper owns is the tablet lift — see the note on it below for why
 * that could not live on the images themselves.
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

      {/*
        Earth and glare are lifted together across the tablet band. `self-end`
        anchors them to the bottom of `<main>`, which is the bottom of the
        *document*, not of the screen — on a phone those are the same thing,
        but the tablet composition is taller than one viewport, so the world
        settles below the card instead of meeting it. The client's standing
        requirement is that it meet the card's bottom edge, so it comes up
        here and is left alone at `lg`, where the two-column desktop
        composition already lines up.

        `vh` and not `%`: a percentage translate resolves against the
        translated element's own height, which here is the document's height
        and therefore moves whenever the copy rewraps. A `vh` lift is a fixed
        fraction of the screen and holds. It is also the only knob — tune the
        number, nothing else.

        The lift belongs to this wrapper rather than the two images for two
        reasons: the earth and the glare are different heights, so any
        self-relative offset would move them by different amounts and pull
        the composition apart; and Motion animates `y` on the glare and owns
        its transform outright. The flower stays put one level up.

        The lift is also what makes `--fade-bottom` necessary on the two
        images below, and why that too is scoped to this band. Sitting on the
        document's bottom edge, neither layer has a visible bottom — there is
        nothing under it to cut against. Raising them puts that edge in the
        middle of the page, where `world-globe.webp` in particular would show
        it as a straight line, having no alpha of its own. Both feather over
        the same 8vh so the pair still reads as one body of light.

        `stack size-full grid-rows-[100%]` repeats for the reason its parent
        carries it (see above, and ComingSoonBackdrop): `self-end` has to
        resolve against a row pinned to the container's real height, not an
        auto row sized to the tallest image inside it.
      */}
      <div className="stack size-full grid-rows-[100%] md:max-lg:translate-y-[-11vh]">
        <MotionImage
          src={artwork.worldGlobe.src}
          alt=""
          width={artwork.worldGlobe.width}
          height={artwork.worldGlobe.height}
          priority
          className="fade-top relative h-[38vh] w-full self-end object-cover object-[center_40%] opacity-35 md:max-lg:[--fade-bottom:3vh]"
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
          className="fade-top relative h-[25vh] w-full self-end object-cover object-[center_55%] md:max-lg:[--fade-bottom:8vh]"
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
    </div>
  );
}
