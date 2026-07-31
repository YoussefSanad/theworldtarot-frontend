import { Container, Section } from "@/components/layout/Section";
import { StarRating } from "@/components/ui/StarRating";
import { featuredTestimonial } from "@/content/home";

export function FeaturedTestimonial() {
  return (
    <Section padding="tight">
      <Container width="measure">
        <figure className="flex flex-col items-center gap-[0.45em] text-center">
          <StarRating className="text-h2" />
          <blockquote className="font-display text-lead leading-[1.05] tracking-[-0.025em] text-gold">
            {featuredTestimonial.quote}
          </blockquote>
          {/* Desktop: full-width right. Tablet/mobile: hang so caption midpoint sits under quote end. */}
          <figcaption className="w-fit max-w-full self-end font-light text-nav text-champagne lg:w-full lg:text-right">
            {featuredTestimonial.attribution}
          </figcaption>
        </figure>
      </Container>
    </Section>
  );
}
