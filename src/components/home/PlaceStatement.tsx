import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { placeStatement } from "@/content/home";

export function PlaceStatement() {
  return (
    <Section padding="none">
      <Divider variant="flourish" />

      <Container width="measure" className="py-[clamp(1.25rem,2.9vw,3.5rem)]">
        <p className="text-center font-display text-h1 leading-[1.2] tracking-[-0.01em] text-gold">
          {placeStatement.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </Container>

      <Divider variant="flourishEnd" />
    </Section>
  );
}
