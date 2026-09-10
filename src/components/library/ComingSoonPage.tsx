import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { LibraryIntro } from "@/components/library/LibraryIntro";
import { Container, Section } from "@/components/layout/Section";
import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { Divider } from "@/components/ui/Divider";
import { comingSoon, libraryPath } from "@/content/library";
import type { ImageAsset } from "@/lib/assets";

/**
 * What a reference page says before its content exists.
 *
 * **These are placeholders on purpose, and they are not the designs.** The
 * Fool's page is the template for all twenty-two Major Arcana and has its own
 * issue; each suit gets its own page with its own design and none have been
 * drawn. Both were still worth routing now: the grid links to twenty-two cards
 * and the navigation to four suits, and a page that answers is better than a
 * 404 while the client writes them.
 *
 * They keep the Library's masthead and navigation so a visitor who arrives here
 * is still somewhere, and can leave by the same nav they came in by. The suit
 * navigation marks where they are, which is the whole reason `SuitNav` takes a
 * `current`.
 */
export function ComingSoonPage({
  heading,
  eyebrow,
  message,
  image,
  imageAlt,
  current,
}: {
  heading: string;
  /** The Roman numeral on a card's page; a suit has none. */
  eyebrow?: ReactNode;
  message: string;
  image?: ImageAsset;
  imageAlt?: string;
  current?: string;
}) {
  return (
    <div className="relative isolate min-h-full">
      <PageAtmosphere variant="library" />

      <LibraryIntro current={current} />

      <Section padding="none" className="pb-[clamp(4rem,10vw,12rem)]">
        <Container width="library" className="flex flex-col items-center text-center">
          {image ? (
            <Image
              src={image.src}
              alt={imageAlt ?? ""}
              width={image.width}
              height={image.height}
              /* One card, at the width the grid gives four of them. */
              className="h-auto w-full max-w-[min(20rem,42vw)]"
              sizes="(width >= 64rem) 20rem, 42vw"
              priority
            />
          ) : null}

          {eyebrow ? (
            <p className="mt-[clamp(1rem,2vw,2.25rem)] font-serif text-h3 tracking-[0.08em] text-gold">{eyebrow}</p>
          ) : null}

          <h2 className="mt-[clamp(0.5rem,1vw,1.25rem)] font-display text-h2-lg leading-[1.1] text-cream">{heading}</h2>

          <Divider variant="heroWide" className="mt-[clamp(0.5rem,1.04vw,1.25rem)]" />

          <p className="mt-[clamp(0.75rem,1.35vw,1.625rem)] font-light text-body leading-[1.056] tracking-[0.025em] text-champagne/73">
            {message}
          </p>

          <Link
            href={libraryPath}
            className="mt-[clamp(1rem,2vw,2.25rem)] font-sans text-nav tracking-[0.025em] text-gold underline-offset-4 hover:underline"
          >
            {comingSoon.back}
          </Link>
        </Container>
      </Section>
    </div>
  );
}
