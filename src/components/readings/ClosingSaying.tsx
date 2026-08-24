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
 *
 * The air below the button is the client's, not the PSD's: she wants the
 * parlour to run on well past the last call to action before the footer cuts
 * it off. Because the artwork stands on the floor of the page, every pixel of
 * this padding is another pixel of the room on show — so this is the one
 * number to move if she wants more of it or less.
 *
 * Below `lg` that room-space is section padding, with the button sitting
 * right under the rule the way the mobile mockup draws it. At `lg` the same
 * clamp becomes the button's own box instead, so the button centres in the
 * space rather than hugging the rule above it.
 */
export function ClosingSaying() {
  return (
    <Section padding="none" className="pb-[clamp(4rem,10vw,12rem)] lg:pb-0">
      <Container width="readings" className="flex flex-col items-center text-center">
        <Divider variant="hero" />

        <p className="mt-[clamp(0.5rem,0.78vw,0.9375rem)] font-display text-h2-lg leading-[1.1] text-gold">
          <Phrase parts={closing.saying} />
        </p>

        <Divider variant="hero" className="mt-[clamp(0.5rem,1.04vw,1.25rem)]" />

        <div className="mt-[clamp(0.75rem,2.19vw,2.625rem)] flex flex-col items-center justify-center lg:mt-0 lg:h-[clamp(6rem,14vw,16rem)]">
          {/* 68px tall at 30px type in Figma; the width is the label's own. */}
          <ButtonLink
            href={closing.action.href}
            size="fluid"
            className="readings-cta tracking-[0.01em] lg:py-[0.633em] lg:text-nav lg:leading-none"
          >
            {closing.action.label}
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
