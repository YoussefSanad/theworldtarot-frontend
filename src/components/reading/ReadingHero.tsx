"use client";

import Image from "next/image";

import { Divider } from "@/components/ui/Divider";
import { Phrase } from "@/components/ui/Phrase";
import { readingPageChrome, type ReadingPage } from "@/content/reading-pages";
import { useReadingName } from "@/lib/reading-prices";

const { hero } = readingPageChrome;

/**
 * The head of the left panel: the reading's name, the rule under it, the line
 * the client sells it on, and the film.
 *
 * Figma names that box `hero-video-placeholder` and it was one. The client's
 * film now fills it — the cards turning over their own fire, one loop shared
 * by all three written readings, since it is the deck rather than any one
 * spread. Cropped at encode time to the 606x406 she draws rather than fitted
 * in CSS, so nothing is downloaded to be thrown away.
 *
 * The still under it is that film's own first frame, and it is doing two jobs.
 * It is the `poster`, so the box is never empty while the video buffers, and
 * it is what stays on screen for a visitor who has asked their system for less
 * motion — the film is `motion-reduce:hidden` and the frame beneath it simply
 * shows through. The pair share a `.stack` cell rather than being swapped, so
 * neither state moves the panel.
 *
 * `muted` is not a preference here, it is the price of `autoPlay`: a browser
 * will not start a film with sound without a gesture, and there is no gesture
 * to give it. `playsInline` keeps iOS from taking it fullscreen.
 *
 * Unlike the photographs on the readings index this does not dissolve into the
 * panel — she draws it with four square edges, and there is no copy beside it
 * for it to dissolve towards.
 */
export function ReadingHero({ reading }: { reading: ReadingPage }) {
  const title = useReadingName(reading.productKey, reading.title);

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display text-h1 leading-none tracking-[-0.01em] text-cream">{title}</h1>

      {/* 448px, which is the cap `.divider--hero` already carries. */}
      <Divider variant="hero" className="mt-[clamp(0.125rem,0.16vw,0.1875rem)]" />

      <p className="mt-[clamp(0.25rem,0.31vw,0.375rem)] font-serif text-body leading-[1.19] tracking-[-0.01em] text-gold">
        <Phrase parts={reading.tagline} />
      </p>

      {/* 606px of the 687px panel, at the frame's own 606x406. */}
      <div className="stack mt-[clamp(1rem,2.66vw,3.1875rem)] aspect-606/406 w-[88.21cqw]">
        <Image
          src={hero.poster.src}
          alt={hero.alt}
          width={hero.poster.width}
          height={hero.poster.height}
          priority
          className="h-full w-full object-cover"
        />

        <video
          className="h-full w-full object-cover motion-reduce:hidden"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={hero.poster.src}
          aria-hidden
        >
          <source src={hero.video} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
