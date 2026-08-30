import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { Phrase } from "@/components/ui/Phrase";
import { readingPageChrome } from "@/content/reading-pages";
import { brand } from "@/lib/assets";

/**
 * Three props under the panels, each opened by a compass.
 *
 * The same three parts the homepage's value props are made of — compass, title,
 * hairline, body — and the same two arrangements.
 *
 * **The two things that move here move at different widths, and that is not an
 * oversight.** How a prop is *arranged* switches at `md`: above it the compass
 * stands beside the words, as this frame draws it, and below it sits **over**
 * them the way the homepage's do, at the homepage's own size. Whether the three
 * props sit *side by side* switches much later, at `xl` — see the note on the
 * row below for the measurement that forces it. In between, a prop is a row of
 * its own, one per line, which is the arrangement that suits a wide box with
 * only two lines of type in it.
 *
 * A compass beside two lines of 22px type has nowhere to go on a phone; a
 * column has the height to spare that a narrow row has no width for. That is
 * the whole of the `md` rule.
 *
 * Both arrangements are the client's, and this is why neither section is a
 * component of the other: what they actually share is a compass and a rule,
 * and both of those are already shared.
 *
 * The compass is `brand.compass`, not the 132x149 Figma exports here — the same
 * artwork at a different scale, checked pixel for pixel against the file
 * already in the repo. The rules under the titles are `.divider--hairline`,
 * which is the same white line the homepage draws at 368px, at the 40% alpha
 * she sets it at on this page and capped to the 277px she draws it at.
 */
export function ReadingFeatures() {
  return (
    <Section padding="none" className="pt-[clamp(1.5rem,2.66vw,3.1875rem)]">
      <Container width="reading">
        {/*
          Figma spaces the three at 480px and 460px, which is the PSD rather
          than a rhythm; equal columns here — but not the page gutter between
          them. Her pitch leaves the props about 35px and 3px apart, and under
          the gutter's 60px a third of the row is 437px, which is 293px once
          the compass and its gap are out. The first body's opening phrase
          measures 301px: it wrapped inside itself and that prop ran to three
          lines. 24px hands the measure back with room over.

          Three across only holds while the column grows with the type, and it
          stops below about 1150px — `--text-caption` bottoms out at 13px while
          the column keeps shrinking, so past there no gap or compass size fits
          the phrase. Hence `xl` for the columns rather than `md`. The props
          keep their `md` arrangement either way; one per row, they have width
          to spare.
        */}
        <ul className="grid gap-y-[clamp(1.5rem,3.13vw,3.75rem)] xl:grid-cols-3 xl:gap-x-[clamp(1rem,1.25vw,1.5rem)]">
          {readingPageChrome.features.map((feature, index) => (
            /*
              `min-w-0` so a title wider than its third of the row overhangs it
              rather than growing the track — `1fr` columns keep an automatic
              minimum otherwise, and one long name would push the row past the
              page.
            */
            <li
              key={feature.title}
              className="flex min-w-0 flex-col items-center justify-center gap-[0.45em] text-caption md:flex-row md:gap-[0.55em]"
            >
              <Image
                src={brand.compass.src}
                alt=""
                width={brand.compass.width}
                height={brand.compass.height}
                /*
                  132px at 1920 beside the words, and the homepage's own size
                  below `md` where it sits over them instead — that clamp's
                  floor holds at 96px across every phone width. Same slow halo
                  as the homepage's three, offset per compass so the row does
                  not breathe in step.
                */
                className="compass-breathe w-[clamp(6rem,9.9vw,11.875rem)] shrink-0 md:w-[clamp(3.5rem,6.875vw,8.25rem)]"
                style={{ animationDelay: `${(-4 / 3) * index}s` }}
              />

              {/*
                Three different widths, which is what the frame draws and what
                took two passes to get right. The rule is 277px. The title
                never wraps — Figma sets it `nowrap` and lets it overhang its
                own rule, which is the whole look: a name on one line over a
                line. And the body gets its own 408px, wider than the rule
                again, which is the measure her two phrases were broken to; at
                the rule's 277px the first of them wrapped and the prop ran to
                three lines.

                So no measure sits on this column. It takes its width from
                whichever child is widest, and each states its own.
              */}
              <div className="min-w-0 text-center">
                {/* 28px in the frame, a step under the page's 30px. */}
                <h2 className="font-display text-nav leading-none tracking-[0.01em] whitespace-nowrap text-gold-deep">
                  {feature.title}
                </h2>

                <Divider variant="hairline" className="mt-[0.32em] mb-[0.5em] w-[12.59em] opacity-40" />

                <p className="mx-auto max-w-[18.55em] font-display leading-[1.18] tracking-[0.01em] text-mist-dim">
                  <Phrase parts={feature.body} />
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
