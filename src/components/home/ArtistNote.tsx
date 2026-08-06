import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { artist } from "@/content/home";
import { artwork, brand } from "@/lib/assets";

/**
 * Book plane is absolute so it keeps its aspect without stretching the section
 * or getting cropped by a content-sized background box.
 *
 * Anchored to the viewport's left edge at a flat 70vw, per the client: the book
 * always touches the left edge and never takes more than 70% of the screen. The
 * art needs no offset to sit flush — it is opaque from its first column and
 * fades out on the right, so the left edge lands on the screen edge and the
 * built-in fade blends it into the page. No opacity here either: the source
 * carries its own 58% fade, and a class on top of that compounded to ~34%.
 */
export function ArtistNote() {
  return (
    <Section padding="none">
      <Divider variant="flourish" />

      <div className="relative overflow-x-clip">
        <div aria-hidden className="pointer-events-none absolute top-1/2 left-0 z-0 w-[60vw] -translate-y-1/2">
          <Image
            src={artwork.book.src}
            alt=""
            width={artwork.book.width}
            height={artwork.book.height}
            className="h-auto w-full"
          />
        </div>

        <Container width="copy" className="relative z-10 py-[clamp(2rem,5.2vw,6.25rem)] text-center">
          {artist.body.map((paragraph) => (
            <p key={paragraph} className="mt-[0.5em] text-lead leading-[1.05] text-champagne first:mt-0">
              {paragraph}
            </p>
          ))}

          {/*
            Margin is 1.4 × the lead size the copy is set in, so the ornament
            keeps the same rhythm above it that the quote keeps below it — an
            `em` here would resolve against the container's base size instead.
          */}
          <Image
            src={brand.butterfly.src}
            alt=""
            width={brand.butterfly.width}
            height={brand.butterfly.height}
            className="mx-auto mt-[calc(1.4*var(--text-lead))] h-auto w-[clamp(2.5rem,4.53vw,5.4375rem)]"
          />

          <p className="mt-[1.4em] font-light text-lead italic leading-[1.05] tracking-[-0.01em] text-gold">
            {artist.quote.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </Container>
      </div>
    </Section>
  );
}
