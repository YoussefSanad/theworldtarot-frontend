import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { worldTarot } from "@/content/home";
import { brand } from "@/lib/assets";

export function WorldTarotIntro() {
  return (
    <Section padding="none">
      <Divider variant="ornate" />

      <Container width="copy" className="py-[clamp(1.5rem,3.6vw,4.3rem)] text-center">
        <h2 className="glow-text-soft font-display text-h1 tracking-[-0.01em] text-cream">{worldTarot.heading}</h2>
        <p className="mt-[0.2em] text-lead tracking-[-0.01em] text-gold">{worldTarot.subheading}</p>

        <p className="mt-[1em] text-lead leading-[1.2] tracking-[0.03em] text-mist">
          {worldTarot.body.before}
          <Image
            src={brand.livingTarotBadge.src}
            alt="The Living Tarot"
            width={brand.livingTarotBadge.width}
            height={brand.livingTarotBadge.height}
            className="inline-block h-[0.82em] w-auto align-baseline"
          />
          {worldTarot.body.after}
        </p>
      </Container>

      <Divider variant="ornate" />
    </Section>
  );
}
