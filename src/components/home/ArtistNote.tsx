import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { artist } from "@/content/home";
import { artwork } from "@/lib/assets";

/**
 * Book plane is absolute so it keeps Figma’s 1540×543 size without stretching
 * the section or getting cropped by a content-sized background box.
 *
 * `max-w-[1540px]` freezes at a flat pixel value — unlike every other
 * Figma-derived measure in this codebase, that freeze point is keyed to the
 * *viewport* reaching 1540px, not 1920px, so past that (most laptop widths)
 * it sits static while the screen keeps growing around it. Past 1920px it
 * switches to the same `1540 / 19.2 = 80.2083vw` Figma ratio and keeps
 * scaling instead, matching the frozen value exactly at 1920px so there's no
 * jump — `max-w-none` is required alongside it, or the still-active
 * `max-w-[1540px]` clamps the new width straight back down.
 */
export function ArtistNote() {
  return (
    <Section padding="none">
      <Divider variant="flourish" />

      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 z-0 flex -translate-y-1/2 justify-center"
        >
          <Image
            src={artwork.book.src}
            alt=""
            width={1540}
            height={543}
            className="h-auto w-full max-w-[1540px] opacity-58 min-[1920px]:w-[80.2083vw] min-[1920px]:max-w-none"
          />
        </div>

        <Container width="copy" className="relative z-10 py-[clamp(2rem,5.2vw,6.25rem)] text-center">
          {artist.body.map((paragraph) => (
            <p key={paragraph} className="mt-[0.5em] text-lead leading-[1.05] text-champagne first:mt-0">
              {paragraph}
            </p>
          ))}

          <p className="mt-[1.4em] font-light text-lead italic leading-[1.05] tracking-[-0.01em] text-gold">
            {artist.quote}
          </p>
        </Container>
      </div>
    </Section>
  );
}
