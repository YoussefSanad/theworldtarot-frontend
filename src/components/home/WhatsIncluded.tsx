import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { included } from "@/content/home";
import { brand } from "@/lib/assets";

export function WhatsIncluded() {
  return (
    <Section padding="none">
      <Divider variant="ornate" />

      <Container className="py-[clamp(1.5rem,3.1vw,3.7rem)]">
        <h2 className="text-center font-display text-h1 text-cream">{included.heading}</h2>

        {/* Columns cap at 38rem each, so the row has ~352px of slack at 1920 to spend on this gap. */}
        <div className="mt-stack flex flex-col items-center gap-[clamp(1.5rem,6.1vw,7.375rem)] lg:flex-row lg:items-start lg:justify-center lg:gap-[clamp(3rem,6.25vw,7.5rem)]">
          {/*
            Type sits on the list, not the item, so the em gap between bullets
            resolves against the fluid `text-lead` rather than the inherited 16px.
            Line spacing stays tight inside an item and opens up between them,
            which is the rhythm Figma draws.
          */}
          {included.columns.map((column, index) => (
            <ul
              key={index}
              className="flex w-full max-w-[36rem] flex-col gap-[1.2em] font-light text-lead leading-[1.05] text-champagne lg:max-w-[38rem]"
            >
              {column.map((item) => (
                <li key={item} className="flex items-start gap-[0.3em]">
                  <Image
                    src={brand.bulletStar.src}
                    alt=""
                    width={brand.bulletStar.width}
                    height={brand.bulletStar.height}
                    className="mt-[0.29em] size-[0.48em] shrink-0 opacity-88"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </Container>
    </Section>
  );
}
