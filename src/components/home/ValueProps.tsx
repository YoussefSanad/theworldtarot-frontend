import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { valueProps } from "@/content/home";
import { brand, surfaces } from "@/lib/assets";

/** Figma section-bg (102:55): 2164×1053, bleeds past a 1920 viewport (~112.7vw). */
const SECTION_BG = { width: 2164, height: 1053 } as const;

/**
 * Backdrop is absolute so it keeps its Figma aspect and bleed without driving
 * section height or cover-cropping inside a content-sized box.
 */
export function ValueProps() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 z-0 w-[min(112.7vw,2164px)] -translate-x-1/2 -translate-y-1/2"
      >
        <Image
          src={surfaces.valueProps}
          alt=""
          width={SECTION_BG.width}
          height={SECTION_BG.height}
          className="h-auto w-full opacity-74"
        />
      </div>

      <Section padding="none" className="relative z-10">
        <Container className="py-[clamp(2rem,7.3vw,8.75rem)]">
          {/* Column widths follow Figma, where the middle prop is wider so its title stays on one line. */}
          <div className="mx-auto grid w-full max-w-(--measure-value-props) justify-center gap-[clamp(2rem,2vw,2.375rem)] md:grid-cols-[367fr_457fr_367fr] md:items-start">
            {valueProps.map((prop) => (
              <article
                key={prop.title}
                className="mx-auto flex w-full max-w-[22rem] flex-col items-center gap-[0.3em] text-center md:max-w-none"
              >
                <Image
                  src={brand.compass.src}
                  alt=""
                  width={brand.compass.width}
                  height={brand.compass.height}
                  className="w-[clamp(6rem,9.9vw,11.875rem)] drop-shadow-[0_29px_32px_rgba(74,63,64,0.25)]"
                />
                <h3 className="font-display text-h2 tracking-[0.01em] text-gold-deep">{prop.title}</h3>
                <Divider variant="hairline" className="my-[0.4em]" />
                <p className="max-w-[18rem] font-display text-nav tracking-[0.01em] text-balance text-white md:max-w-none">
                  {prop.body}
                </p>
              </article>
            ))}
          </div>
        </Container>

        <Divider variant="flourishEnd" />
      </Section>
    </div>
  );
}
