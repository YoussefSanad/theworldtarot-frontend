import { Container, Section } from "@/components/layout/Section";
import { journey, PRODUCTS_SECTION_ID, products } from "@/content/home";

import { ProductCard } from "./ProductCard";

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

        <div className="mt-[clamp(1.75rem,3.1vw,3.7rem)] grid grid-cols-1 gap-x-0 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
