import Image from "next/image";

import { HeroActions } from "@/components/home/HeroActions";
import { SunriseAtmosphere } from "@/components/home/SunriseAtmosphere";
import { Container, Section } from "@/components/layout/Section";
import { RevealProvider, RevealStage, RevealTrigger } from "@/components/reveal";
import { Divider } from "@/components/ui/Divider";
import { hero } from "@/content/home";
import { artwork } from "@/lib/assets";

export function Hero() {
  return (
    <Section padding="none" className="pt-5 pb-[clamp(2rem,4.7vw,5.6rem)] lg:pt-[clamp(2rem,6.04vw,7.25rem)]">
      <Container width="hero">
        <RevealProvider oncePerVisit>
          <SunriseAtmosphere />
          <div className="grid items-center gap-gutter lg:grid-cols-[797fr_673fr]">
            <div className="flex flex-col items-center gap-[0.6em] text-center lg:items-start lg:text-left">
              <h1 className="font-display text-snow">
                <span className="block text-hero-sm leading-none tracking-[0.025em] lg:leading-[1.15]">{hero.titleTop}</span>
                <span className="block text-hero tracking-[0.02em]">{hero.titleMain}</span>
              </h1>

              {/* The divider centres on the tagline rather than on the column. Above lg
                  the column is left-aligned and much wider than the line of text, so the
                  group shrinks to the tagline's own width and `items-center` has
                  something to centre the rule against; below lg it is full width and
                  everything is centred anyway. The gap repeats the column's so the
                  grouping costs no vertical rhythm. */}
              <div className="flex w-full flex-col items-center gap-[0.6em] lg:w-fit">
                <p className="font-serif text-lead text-gold">{hero.tagline}</p>

                <Divider variant="hero" />
              </div>

              <p className="max-w-[80%] text-body leading-[1.05] text-mist lg:leading-[1.11]">
                <span className="sm:hidden">{hero.bodyMobile}</span>
                <span className="hidden sm:inline">{hero.body}</span>
              </p>

              {/* `self-center` overrides the column's `lg:items-start`: the client wants
                  this one block centred while the actions below stay left-aligned. The
                  margins are its own, not the column's `gap`, so the reveal keeps clear
                  air around it whichever of its two states is showing. */}
              <RevealTrigger className="mt-[0.6em] mb-[0.4em] lg:mt-[0.8em] lg:mb-[0.55em] lg:self-center" />

              <HeroActions />
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
