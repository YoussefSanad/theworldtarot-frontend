import type { ReactNode } from "react";

import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { Container, Section } from "@/components/layout/Section";
import { ReadingPanel } from "@/components/reading/ReadingPanel";
import { Divider } from "@/components/ui/Divider";

/**
 * A reading this build has no page for, drawn from what the backend answered.
 *
 * **Refusing to render is refusing to redeem.** The backend's catalogue is not
 * this repository's, so it can hold a reading nobody here has drawn a
 * `ReadingPage` for — and a code for a *withdrawn* product still redeems too,
 * because the person paid. Either way the querent is holding something they
 * paid nothing for and cannot get back, so the page falls back to the API's own
 * name and long description rather than to an apology.
 *
 * **It is one panel rather than two.** The composition
 * `ReadingPresentation` draws is made of things this fallback does not have and
 * cannot invent: a tagline, five things that arrive, and a testimonial — which
 * is a real person's sentence about a real reading and is the one item on that
 * page that may not be improvised. So the shell keeps the frame, the ornament
 * and the type, states what the reading is in the backend's own words, and puts
 * the same panel in it.
 *
 * The form inside is content-independent — the same three fields for every
 * reading — which is what makes this fallback a rendering choice rather than a
 * second flow.
 */
export function PlainReading({
  name,
  description,
  children,
}: {
  name: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="relative isolate">
      <PageAtmosphere variant="reading" className="max-lg:-top-20" />

      <Section padding="none" className="pt-[clamp(1rem,2.6vw,3.125rem)] pb-section">
        {/*
          `measure` rather than `reading`: one panel standing alone wants a
          reading measure, not half of a two-column grid stretched across the
          page.
        */}
        <Container width="measure">
          <ReadingPanel moon bodyClassName="reading-panel-sky px-[4.44cqw] pt-[11.35cqw] pb-[8.59cqw]">
            <div className="flex flex-col items-center text-center">
              <h1 className="font-display text-h1 leading-none tracking-[-0.01em] text-cream">
                {name}
              </h1>

              <Divider variant="hero" className="mt-[clamp(0.125rem,0.16vw,0.1875rem)]" />

              {/*
                The backend's long description, wrapped to its own measure. It
                is prose written for this product rather than a list of phrases
                chosen to break at drawn points, so it is one string and not a
                `<Phrase>`.
              */}
              <p className="mt-[clamp(0.5rem,1.46vw,1.75rem)] max-w-[80cqw] font-light text-nav leading-[1.3] tracking-[0.01em] text-white">
                {description}
              </p>
            </div>

            {children}
          </ReadingPanel>
        </Container>
      </Section>
    </div>
  );
}
