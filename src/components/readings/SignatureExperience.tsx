"use client";

import Image from "next/image";

import Link from "next/link";

import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { OrnateFrame, OrnateMark } from "@/components/ui/OrnateFrame";
import { Phrase } from "@/components/ui/Phrase";
import { readingAction, signature } from "@/content/readings";
import { useReadingPrice } from "@/lib/reading-prices";

/**
 * The one-card experience, in the page's only open-top panel — the heading
 * rides the border rather than sitting under it, at every width.
 *
 * Both of the client's frames draw this panel the same way: photograph beside
 * the copy, heading on the border, ornaments bracketing it. The single thing
 * the mobile mockup changes is that the price steps *outside* the frame. See
 * the `< 64rem` block in globals.css for how it gets out without being written
 * twice — the body and the copy dissolve into the panel's own grid, where the
 * price can be given a row the border doesn't span.
 *
 * Figma centres the four things in the right-hand column on four different
 * axes, 84px apart at the extremes; that is the PSD conversion, not a design
 * decision, so they all centre on the column here.
 *
 * The photograph fills its half of the panel — stretched to the row and
 * cropped by `object-cover` — rather than sitting in it at its natural aspect,
 * which would open a band of backdrop along the frame's edge. It dissolves
 * into the panel along the edge that meets the copy; see `.photo-fade`.
 *
 * The whole panel is the link, and the price a `<span>` inside it, so it
 * behaves and hovers like the four cards below it rather than being the one
 * panel on the page whose surface does nothing. `.panel-hover` is that hover,
 * defined once in globals.css.
 *
 * The bottom padding is the 101px Figma leaves between this panel and the
 * Traditional Tarot Readings heading below it.
 *
 * **A client component, for the reason `ChooseYourJourney` is one**: the price
 * is resolved per visitor and can only be read in the browser. The exported
 * HTML holds the bundled string and the live figure replaces it once the
 * catalogue answers — one answer shared with the three cards below, since both
 * read the same store.
 */
export function SignatureExperience() {
  const price = useReadingPrice(signature.productKey, signature.price);

  return (
    <Section padding="none" className="pb-[clamp(1.5rem,5.26vw,6.3125rem)]">
      <Container width="readings">
        <Link
          href={signature.href}
          aria-label={`${signature.title} — ${price} ${readingAction}`}
          className="panel-hover block no-underline"
        >
          <OrnateFrame
            variant="panel"
            legend={
              /*
              The mark brackets the heading's *first line*, which is this
              phrase — so below `lg`, where the heading wraps, the marks live
              inside it rather than beside the block. At `lg` the two phrases
              share one line and `OrnateFrame`'s own pair takes over outside.
              Written out rather than passed through `<Phrase>` because only
              the first of the two is bracketed.
            */
              <h2 className="text-center font-serif tracking-[-0.01em] text-gold lg:mx-[0.8em]">
                {/*
                Block below `lg`, inline above it. Inline, the heading's
                max-content is both phrases on one line — wider than the panel,
                so it fills whatever it is given and the border's rules get
                nothing. Block, its max-content is the wider of the two lines,
                which is what lets it shrink to its own width and the rules run
                in to meet the marks.
              */}
                <span className="flex items-center justify-center lg:contents">
                  <OrnateMark size="sm" className="lg:hidden" />
                  <span className="mx-[0.3em] lg:mx-0">
                    {signature.eyebrow[0]}
                  </span>
                  <OrnateMark size="sm" mirrored className="lg:hidden" />
                </span>{" "}
                <span className="block lg:inline-block">
                  {signature.eyebrow[1]}
                </span>
              </h2>
            }
          >
            <div className="signature-body lg:flex lg:items-stretch">
              <div className="signature-media lg:w-[45.8%]">
                <Image
                  src={signature.image.src}
                  alt={signature.imageAlt}
                  width={signature.image.width}
                  height={signature.image.height}
                  priority
                  className="photo-fade panel-hover__photo h-full w-full object-cover"
                />
              </div>

              <div className="signature-copy lg:flex lg:w-full lg:flex-1 lg:flex-col lg:items-center lg:justify-center lg:px-[clamp(1rem,2vw,2.5rem)] lg:py-[clamp(1.25rem,2.6vw,3.125rem)]">
                <div className="signature-text flex flex-col items-center justify-center px-[4%] pb-[4%] text-center lg:contents">
                  <h3 className="font-display text-[clamp(1.375rem,6.4vw,1.75rem)] tracking-[-0.01em] text-cream lg:text-h1-sm">
                    {signature.title}
                  </h3>

                  {/*
                  Figma draws this rule at 448px in an 812px column, so the cap
                  `.divider--hero` carries has to come back at `lg` — without
                  it the rule stretches to the column and, being aspect-sized,
                  renders 90px tall instead of 55. Below `lg` it fills the
                  narrow column, which is what she draws there. The margins go
                  negative on the phone because her mobile frame overlaps this
                  rule with both of its neighbours.
                */}
                  <Divider
                    variant="hero"
                    className="-mt-[0.3125rem] max-w-none lg:mt-[clamp(0.375rem,0.68vw,0.8125rem)] lg:max-w-(--measure-flourish)"
                  />

                  <p className="-mt-[0.125rem] font-light text-[clamp(0.75rem,3.2vw,0.875rem)] leading-[1.17] text-cream lg:mt-[clamp(0.5rem,0.99vw,1.1875rem)] lg:text-body lg:leading-[1.056]">
                    <Phrase parts={signature.body} />
                  </p>
                </div>

                {/*
                Figma draws an 81px-tall box at 30px type; the 458px width that
                came with it is dead space either side of the label, so the
                button takes the height and hugs its own text. Below `lg` it
                spans the panel, which is what the mockup draws.
              */}
                <span className="signature-cta panel-hover__cta btn btn-gold readings-cta mt-[3%] lg:mt-[clamp(0.75rem,1.51vw,1.8125rem)] lg:py-[0.85em] lg:text-nav lg:leading-none">
                  {`${price} ${readingAction}`}
                </span>
              </div>
            </div>
          </OrnateFrame>
        </Link>
      </Container>
    </Section>
  );
}
