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

        {/*
          Columns cap at 38rem each, so the row has ~352px of slack at 1920 to spend on this gap.
          On tablet the columns are still stacked (row layout only starts at `lg`), so the gap
          here sits between item 3 and item 4. `1.2*--text-lead` mirrors the `gap-[1.2em]` between
          items inside each list, so that seam reads the same as every other item gap.
        */}
        <div className="mt-stack flex flex-col items-center gap-[clamp(1.5rem,6.1vw,7.375rem)] md:gap-y-[calc(1.2*var(--text-lead))] lg:flex-row lg:items-start lg:justify-center lg:gap-[clamp(3rem,6.25vw,7.5rem)]">
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
                /*
                  Hanging indent (0.48em bullet + 0.3em gap) rather than flex, so the
                  bullet can ride `vertical-align: middle` — baseline plus half the
                  x-height, both read from the font. Gill Sans ships hhea and usWin
                  metrics that disagree by 0.17em and no USE_TYPO_METRICS bit to settle
                  it, so anything measured from the top of the line box lands correctly
                  on one platform and low on the other. Measuring off the glyphs instead
                  keeps the bullet with the text everywhere; -top is the optical nudge
                  from x-height centre up toward the cap.
                */
                <li key={item} className="pl-[0.78em] indent-[-0.78em]">
                  <Image
                    src={brand.bulletStar.src}
                    alt=""
                    width={brand.bulletStar.width}
                    height={brand.bulletStar.height}
                    className="relative top-[-0.12em] mr-[0.3em] inline-block size-[0.48em] align-middle opacity-88"
                  />
                  {item}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </Container>
    </Section>
  );
}
