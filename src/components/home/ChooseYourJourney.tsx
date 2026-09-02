"use client";

import { Container, Section } from "@/components/layout/Section";
import { CarouselSlide } from "@/components/ui/Carousel";
import { journey, products as bundledProducts, PRODUCTS_SECTION_ID } from "@/content/home";
import { useProducts } from "@/lib/products";

import { ProductCard } from "./ProductCard";
import { ProductCarousel } from "./ProductCarousel";

/**
 * The shop.
 *
 * **A client component, unlike the rest of the homepage's sections**, because
 * prices are resolved per visitor and can only be read in the browser. The
 * exported HTML holds the bundled tiles from `content/home.ts`, and the live
 * copy and prices replace them once the API answers. See
 * `docs/plans/products-api-wiring.md`.
 *
 * `ProductCarousel`'s docblock argues that passing tiles as children keeps
 * `ProductCard` and the `next/image`/`next/link` machinery out of the client
 * bundle. **The second half of that has not been true for a while**:
 * `SiteHeader` and `HeroActions` are both client components importing both, so
 * that machinery ships whatever this section does. The children pattern is kept
 * because it still separates the carousel's mechanics from the data filling it,
 * which is the half that was always the real point.
 */
export function ChooseYourJourney() {
  const products = useProducts(bundledProducts);

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
            <CarouselSlide key={product.key} className="[--carousel-slide:66.7%]">
              <ProductCard product={product} />
            </CarouselSlide>
          ))}
        </ProductCarousel>
      </Container>
    </Section>
  );
}
