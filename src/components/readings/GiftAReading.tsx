import Image from "next/image";
import Link from "next/link";

import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { OrnateFrame } from "@/components/ui/OrnateFrame";
import { Phrase } from "@/components/ui/Phrase";
import { gift } from "@/content/readings";

/**
 * Gift a Reading — a short, wide panel, photograph left and copy right.
 *
 * Figma gives this block no control of any kind: it describes a product and
 * then leaves the visitor nowhere to go. Rather than add a button the design
 * doesn't draw, the whole panel is the link, which is the construction the
 * product tiles already use, and it answers a pointer with the same gold glow
 * they do. Everything visible is still exactly what Figma draws.
 *
 * The order changes between her two frames: the desktop sets title, small
 * caps, rule, copy; the mobile one sets title, rule, small caps. Flex `order`
 * swaps the two without a second copy of either.
 */
export function GiftAReading() {
  return (
    <Section padding="none" className="pb-[clamp(1.5rem,2.86vw,3.4375rem)]">
      <Container width="readingsGift">
        {/* Her mobile frame carries the crest; the desktop one doesn't. */}
        <OrnateFrame
          variant="panel"
          crest
          className="group"
          bodyClassName="transition-[box-shadow] duration-300 group-hover:shadow-(--glow-gold)"
        >
          {/* A row at every width — the client's mobile mockup keeps this one as drawn. */}
          <Link href={gift.href} className="flex items-stretch">
            {/* Fills its share of the panel; the frame clips it to its own curve. */}
            <div className="w-[38.9%] shrink-0 transition-[filter] duration-300 group-hover:brightness-110">
              <Image
                src={gift.image.src}
                alt={gift.imageAlt}
                width={gift.image.width}
                height={gift.image.height}
                className="photo-fade h-full w-full object-cover"
              />
            </div>

            <div className="flex w-full flex-1 flex-col items-center justify-center px-[clamp(1rem,2vw,2.5rem)] pt-[clamp(0.5rem,1.3vw,1.5625rem)] pb-[clamp(0.375rem,0.68vw,0.8125rem)] text-center">
              <h2 className="order-1 font-display text-[7.87cqw] tracking-[-0.01em] text-cream lg:text-h2-md">{gift.title}</h2>

              {/* Under the rule on the phone, above it on the desktop. */}
              {/* She sets this in a 105px box, which is what breaks it onto two lines. */}
              <p className="order-3 mt-[clamp(0.375rem,0.68vw,0.8125rem)] max-w-[38cqw] font-serif text-[5.9cqw] leading-[1.11] text-gold lg:order-2 lg:max-w-none lg:text-body lg:leading-none">
                <Phrase parts={gift.subtitle} />
              </p>

              {/* Same 448px cap as the signature panel's — see the note there. */}
              <Divider
                variant="hero"
                className="order-2 mt-[2%] max-w-none lg:order-3 lg:-mt-[clamp(0.125rem,0.21vw,0.25rem)] lg:max-w-(--measure-flourish)"
              />

              {/* The mobile frame drops this line; there is no room for it beside the photograph. */}
              <p className="order-4 hidden font-light text-body leading-[1.056] text-cream lg:block">
                <Phrase parts={gift.body} />
              </p>
            </div>
          </Link>
        </OrnateFrame>
      </Container>
    </Section>
  );
}
