import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { Phrase } from "@/components/ui/Phrase";
import { intro } from "@/content/readings";

/**
 * Page masthead. Figma allows 106px above the title on a frame that has no
 * site header at all; ours renders one, so the lead-in here is only the air
 * the design leaves between the two, not that whole gap.
 *
 * The 73% Figma sets on the standfirst is folded into `text-champagne/73`
 * rather than an `opacity` on the element, so it tints the text without also
 * dimming anything that might later sit beside it.
 */
export function ReadingsIntro() {
  return (
    <Section padding="none" className="pt-[clamp(0.75rem,1.6vw,2rem)] pb-[clamp(2rem,6.09vw,7.3rem)]">
      <Container width="measure" className="flex flex-col items-center text-center">
        <h1 className="font-display text-h1 tracking-[0.01em] text-cream">{intro.heading}</h1>

        {/* The one place Figma draws this rule at 538px rather than 448px. */}
        <Divider variant="heroWide" className="mt-[clamp(0.375rem,0.94vw,1.125rem)]" />

        <p className="mt-[clamp(0.5rem,1.25vw,1.5rem)] font-serif text-h3 text-gold">
          <Phrase parts={intro.tagline} />
        </p>

        {/*
          Two blocks in the frame, broken mid-sentence before "traditional" so
          the 1085px desktop measure lands on three even lines. Below `lg` they
          join and `text-balance` equalizes the rag. A narrower cap and glued
          last words were tried; both pushed this onto five lines.
        */}
        <p className="mt-[clamp(0.75rem,1.35vw,1.625rem)] w-full max-lg:text-balance font-light text-[clamp(0.75rem,3.2vw,2.25rem)] leading-[1.17] tracking-[0.025em] text-champagne/73 lg:max-w-[min(67.8125rem,56.51vw)] lg:text-body lg:leading-[1.056]">
          {intro.body[0]} <span className="lg:block">{intro.body[1]}</span>
        </p>
      </Container>
    </Section>
  );
}
