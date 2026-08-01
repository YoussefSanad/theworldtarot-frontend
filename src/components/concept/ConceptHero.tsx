import Image from "next/image";
import Link from "next/link";

import { RevealProvider, RevealStage, RevealTrigger, SunriseAtmosphere } from "@/components/concept/reveal";
import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { hero } from "@/content/home";
import { artwork, type ImageAsset } from "@/lib/assets";

/** Secondary hero action: icon beside a two-line Cinzel label. */
function HeroAction({ href, icon, label }: { href: string; icon: ImageAsset; label: string[] }) {
  return (
    <Link
      href={href}
      className="btn btn-ghost w-fit min-h-[3.7em] justify-start gap-[0.75em] py-[0.65em] pr-[1.75em] pl-[1.1em] text-caption"
    >
      <Image src={icon.src} alt="" width={icon.width} height={icon.height} className="h-[2em] w-auto shrink-0" />
      <span className="text-left leading-[1.36] tracking-[-0.02em]">
        {label.map((line) => (
          <span key={line} className="block whitespace-nowrap">
            {line}
          </span>
        ))}
      </span>
    </Link>
  );
}

export function ConceptHero() {
  return (
    <Section padding="none" className="pt-[clamp(2rem,6.04vw,7.25rem)] pb-[clamp(2rem,4.7vw,5.6rem)]">
      <Container width="hero">
        <RevealProvider oncePerVisit>
          <SunriseAtmosphere />
          <div className="grid items-center gap-gutter lg:grid-cols-[797fr_673fr]">
            <div className="flex flex-col items-center gap-[0.6em] text-center lg:items-start lg:text-left">
              <h1 className="font-display text-snow">
                <span className="block text-hero-sm tracking-[0.025em]">{hero.titleTop}</span>
                <span className="block text-hero tracking-[0.02em]">{hero.titleMain}</span>
              </h1>

              <p className="font-serif text-lead text-gold">{hero.tagline}</p>

              <Divider variant="hero" className="mx-auto lg:mx-0 lg:ml-[5%]" />

              <p className="max-w-[80%] text-body leading-[1.11] text-mist">{hero.body}</p>

              <RevealTrigger className="mt-[0.55em]" />

              <div className="mt-[0.5em] flex w-full flex-col items-center gap-[1.25em] text-caption sm:flex-row sm:flex-wrap sm:justify-center lg:flex-nowrap lg:justify-start lg:gap-[1.5em]">
                {hero.secondaryActions.map((action) => (
                  <HeroAction key={action.href} href={action.href} icon={action.icon} label={action.label} />
                ))}
              </div>
            </div>

            <div className="stack mx-auto w-full max-w-[673px] place-items-center">
              <div aria-hidden className="flex w-full justify-center">
                <Image
                  src={artwork.goldCircleLeft.src}
                  alt=""
                  width={artwork.goldCircleLeft.width}
                  height={artwork.goldCircleLeft.height}
                  className="h-auto w-[53.2%] opacity-60"
                />
                <Image
                  src={artwork.goldCircleRight.src}
                  alt=""
                  width={artwork.goldCircleRight.width}
                  height={artwork.goldCircleRight.height}
                  className="h-auto w-[46.9%] opacity-65"
                />
              </div>

              <RevealStage className="z-10 w-[66.7%] max-w-[449px] shadow-[0_0_2px_rgba(247,246,237,0.59)]" />
            </div>
          </div>
        </RevealProvider>

        <div className="mt-[clamp(2rem,5.2vw,6.25rem)] flex flex-col items-center gap-[0.43em] text-center">
          <p className="font-serif text-h3 tracking-[0.01em] text-gold">{hero.closing.lead}</p>
          <p className="text-body italic tracking-[0.01em] text-mist-dim">{hero.closing.question}</p>
        </div>
      </Container>
    </Section>
  );
}
