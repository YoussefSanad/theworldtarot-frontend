import { Container, Section } from "@/components/layout/Section";
import { CarouselSlide } from "@/components/ui/Carousel";
import { journey, PRODUCTS_SECTION_ID, products } from "@/content/home";

import { ProductCard } from "./ProductCard";
import { ProductCarousel } from "./ProductCarousel";

export function ChooseYourJourney() {
  return (
    <Section id={PRODUCTS_SECTION_ID} padding="tight" className="scroll-mt-8">
      <Container>
        <header className="text-center">
          <h2 className="font-display text-h1 text-cream">{journey.heading}</h2>
          <p className="mt-[0.2em] text-lead leading-[1.2] text-gold">
            {journey.subheading.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </header>

        <ProductCarousel
          slideCount={products.length}
          dotsLabel={journey.carousel.dotsLabel}
          dotLabels={products.map((product) => `${journey.carousel.dotAction} ${product.title}`)}
        >
          {products.map((product) => (
            // 66.7% is the tile's own mobile scale, relocated to the slide that
            // now places it (see ProductCard's doc comment) — the peek on each
            // side below `sm` is the leftover third, not extra chrome.
            <CarouselSlide key={product.id} className="[--carousel-slide:66.7%]">
              <ProductCard product={product} />
            </CarouselSlide>
          ))}
        </ProductCarousel>
      </Container>
    </Section>
  );
}
