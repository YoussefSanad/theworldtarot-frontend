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
 * hairline, body — turned on their side: there the compass sits over the words,
 * here it stands beside them. Both are the client's, and this is the reason
 * neither is a component of the other: what they share is a compass and a rule,
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
          than a rhythm; equal columns here. They stack below `md` — a compass
          beside two lines of 22px type has nowhere to go on a phone.
        */}
        <ul className="grid gap-[clamp(1.5rem,3.13vw,3.75rem)] md:grid-cols-3">
          {readingPageChrome.features.map((feature, index) => (
            /*
              `min-w-0` so a title wider than its third of the row overhangs it
              rather than growing the track — `1fr` columns keep an automatic
              minimum otherwise, and one long name would push the row past the
              page.
            */
            <li key={feature.title} className="flex min-w-0 items-center justify-center gap-[0.55em] text-caption">
              <Image
                src={brand.compass.src}
                alt=""
                width={brand.compass.width}
                height={brand.compass.height}
                /*
                  132px at 1920, and the same slow halo the homepage's three
                  breathe with — offset per compass so they are not in step.
                */
                className="compass-breathe w-[clamp(3.5rem,6.875vw,8.25rem)] shrink-0"
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
