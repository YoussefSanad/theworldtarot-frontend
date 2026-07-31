import { Container, Section } from "@/components/layout/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { StarRating } from "@/components/ui/StarRating";
import { closingCta } from "@/content/home";

export function ClosingCta() {
  return (
    <Section padding="none">
      <Divider variant="ornate" />

      {/* Figma stacks the section on a flat 25px rhythm, with the divider over the top of it. */}
      <Container
        width="measure"
        className="flex flex-col items-center gap-[clamp(0.75rem,1.3vw,1.5625rem)] pb-[clamp(1rem,1.77vw,2.125rem)]"
      >
        <h2 className="glow-text text-center font-display text-h1 leading-none tracking-[-0.01em] text-cream">
          {closingCta.heading}
        </h2>

        <ButtonLink href={closingCta.action.href}>{closingCta.action.label}</ButtonLink>

        <figure className="flex w-full flex-col items-center gap-[clamp(0.75rem,1.3vw,1.5625rem)]">
          <div className="flex flex-wrap items-center justify-center gap-x-[0.33em] gap-y-[0.25em] text-note">
            <StarRating className="text-h2" />

            <blockquote className="leading-[1.084] text-cream">
              {closingCta.testimonial.quote.map((line) => (
                <span key={line} className="block whitespace-nowrap">
                  {line}
                </span>
              ))}
            </blockquote>
          </div>

          <figcaption className="w-fit max-w-full self-end font-light text-fine text-cream lg:w-full lg:text-right">
            {closingCta.testimonial.attribution}
          </figcaption>
        </figure>
      </Container>
    </Section>
  );
}
