import Image from "next/image";

import { artwork } from "@/lib/assets";

/**
 * `bg-night` (from `<body>`) sits beneath: the star/nebula field (this
 * frame's own `comingSoonStars`, not the homepage's `section-1-bg` — see
 * assets.ts), the rotating flower of life, the earth, then the sun glare —
 * the homepage hero's own `world-globe`/`world-shine`, not
 * `.page-atmosphere-hero`. That class's `background-position` percentages are
 * calibrated to the homepage's ~6674px scroll height and would misplace every
 * layer on this single-viewport page.
 *
 * The flower's source art is a circle inscribed in its canvas — a circle's
 * silhouette is rotationally symmetric, so unlike a square layer it can spin
 * at any size without ever sweeping a straight edge through frame. That's
 * what lets it sit at a plain `w-screen`, full-bleed and centered, rather
 * than needing the oversized-square trick a non-circular layer would.
 *
 * `grid-rows-[100%]` on `.stack` here isn't decorative — without it this
 * silently breaks. `.stack` sets no `grid-template-rows`, so its one
 * implicit row is `auto`: sized to fit its tallest item's own preferred
 * size. A CSS-spec circularity kicks in for any percentage-sized child
 * (`size-full` → `height: 100%`) inside that auto row: since the row's size
 * depends on the item and the item's percentage height would depend right
 * back on the row, the spec requires treating that percentage as `auto`
 * instead — so the star field (an `<img>` with an intrinsic aspect ratio from
 * its width/height attributes) falls back to whatever height its own aspect
 * ratio resolves to at the container's width, rather than the container's
 * real height. That inflates or shrinks the *shared* row every `self-end`
 * sibling aligns within, which is what was pushing earth and shine out of
 * place — confirmed by measuring `getComputedStyle` in a real browser, not
 * guessed from the markup. Pinning the row to `100%` of the container's own
 * already-definite height (fixed independently by `<main>`) breaks the
 * circularity outright, regardless of whatever image fills this first slot.
 *
 * The flower wrapper is `position: absolute` for the same underlying
 * reason, belt-and-suspenders: on a landscape viewport `w-screen` +
 * `aspect-square` computes taller than the viewport, and grid excludes
 * absolutely-positioned items from row auto-sizing by spec, so it can't
 * reintroduce this even if the row template above is ever loosened.
 *
 * Earth + shine box heights started from the Figma source — in frame 270:63
 * (1920×1440), WORLD sits at y=703 and Layer 2 (the glow) at y=952, each
 * clipped by the frame's bottom edge, so only their own top ~51%/~34%
 * survive there — then were pulled back down to `h-[38vh]`/`h-[25vh]`, since
 * that literal Figma proportion read as reaching too far up this page.
 *
 * The *crop position* within each image is tuned by eye against the actual
 * pixels, not ported from that same Figma math — porting it gave a crop
 * that opened on each image's own empty lead-in (plain black space for
 * `world-globe`, transparent fade for `world-shine`) and never reached the
 * lit curve at all, because Figma's clip lands at a frame aspect ratio
 * (4:3-ish) that a real widescreen viewport doesn't share. Both images spend
 * roughly their first third on that lead-in, then a bright rim band (the
 * atmosphere's edge lit up) before settling into the lit surface — landing
 * the box's top edge inside that rim band is worse than landing it in the
 * lead-in, since the rim is the single brightest, most saturated part of the
 * whole image and reads as a hard-edged stripe the instant it's clipped by a
 * box boundary. `object-[center_40%]`/`object-[center_55%]` keep the rim
 * comfortably inside each box instead of *at* its edge. `.fade-top` (see
 * globals.css) is the belt-and-suspenders on top of that: it masks the box's
 * own top ~20% to transparent regardless of what lands there, so a seam
 * can't reappear from a crop tweak alone. `world-globe` additionally keeps
 * `opacity-25` since it has no alpha channel of its own — the mask hides the
 * hard edge, but not the flat rectangle of color it would otherwise be.
 */
export function ComingSoonBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="stack size-full grid-rows-[100%]">
        <Image
          src={artwork.comingSoonStars.src}
          alt=""
          width={artwork.comingSoonStars.width}
          height={artwork.comingSoonStars.height}
          priority
          className="size-full object-cover"
        />

        <div className="absolute top-0 left-1/2 aspect-square w-screen -translate-x-1/2">
          <Image
            src={artwork.flowerOfLife.src}
            alt=""
            width={artwork.flowerOfLife.width}
            height={artwork.flowerOfLife.height}
            className="slow-spin size-full opacity-[0.08]"
          />
        </div>

        <Image
          src={artwork.worldGlobe.src}
          alt=""
          width={artwork.worldGlobe.width}
          height={artwork.worldGlobe.height}
          className="fade-top h-[38vh] w-full self-end object-cover object-[center_40%] opacity-25"
        />

        <Image
          src={artwork.worldShine.src}
          alt=""
          width={artwork.worldShine.width}
          height={artwork.worldShine.height}
          className="fade-top h-[25vh] w-full self-end object-cover object-[center_55%]"
        />
      </div>
    </div>
  );
}
