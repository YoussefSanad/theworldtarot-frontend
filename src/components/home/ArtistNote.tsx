import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { artist } from "@/content/home";
import { artwork } from "@/lib/assets";

/**
 * Book plane is absolute so it keeps Figma’s 1540×543 size without stretching
 * the section or getting cropped by a content-sized background box.
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
            className="h-auto w-full max-w-[1540px] opacity-58"
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
