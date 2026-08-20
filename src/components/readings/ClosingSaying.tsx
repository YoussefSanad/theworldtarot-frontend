import { Container, Section } from "@/components/layout/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Phrase } from "@/components/ui/Phrase";
import { closing } from "@/content/readings";

/**
 * The line the page closes on, ruled above and below, with the page's last
 * call to action under it. Figma draws the two rules from the same 448x55
 * artwork the rest of the page uses.
 *
 * Shares the panels' measure so the button lines up with the cards above it,
 * and runs full width below `lg` — her mobile mockup sets every button on the
 * page to the panel's own width, and only lets them hug their label on the
 * desktop frame.
 */
export function ClosingSaying() {
  return (
    <Section padding="none" className="pb-[clamp(2rem,4vw,5rem)]">
      <Container width="readings" className="flex flex-col items-center text-center">
        <Divider variant="hero" />

        <p className="mt-[clamp(0.5rem,0.78vw,0.9375rem)] font-display text-h2-lg leading-[1.1] text-gold">
          <Phrase parts={closing.saying} />
        </p>

        <Divider variant="hero" className="mt-[clamp(0.5rem,1.04vw,1.25rem)]" />

        {/* 68px tall at 30px type in Figma; the width is the label's own. */}
        <ButtonLink
          href={closing.action.href}
          size="fluid"
          className="mt-[clamp(0.75rem,2.19vw,2.625rem)] w-full px-[0.9em] py-[0.72em] text-[clamp(0.9375rem,4.8vw,1.125rem)] leading-none tracking-[0.01em] lg:w-fit lg:max-w-full lg:py-[0.633em] lg:text-nav"
        >
          {closing.action.label}
        </ButtonLink>
      </Container>
    </Section>
  );
}
