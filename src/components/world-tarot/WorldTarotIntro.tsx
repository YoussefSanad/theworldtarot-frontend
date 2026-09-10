import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { Phrase } from "@/components/ui/Phrase";
import { intro } from "@/content/world-tarot";

/**
 * Page masthead — Figma's "TOP TEXT", 898x236 at (543,107).
 *
 * Her gaps, of a 1920px frame: 16px title to rule, 22px rule to tagline, 22px
 * tagline to the first panel.
 *
 * **The 107px above the title is reproduced whole, and is deliberately not
 * discounted for the masthead.** `ReadingsIntro` takes the other view — it
 * treats that lead-in as air the frame only needs because it draws no site
 * header, and spends about a third of it. This page wants the opposite: the
 * client's point here is the artwork, so the copy starting further down the
 * path is the design rather than wasted space, and the masthead's own height
 * sits on top of this rather than being subtracted from it.
 *
 * The title is 60px (`--text-h1`) and the tagline 40px Cinzel — which is
 * `--text-lead`'s 40px rather than `--text-h3`'s 42px, the nearer of the two
 * and the one that is exact.
 */
export function WorldTarotIntro() {
  return (
    /* 107px of a 1920px frame, above; 22px below, to the first panel. */
    <Section padding="none" className="pt-[clamp(2rem,5.57vw,6.6875rem)] pb-[clamp(0.75rem,1.15vw,1.375rem)]">
      <Container width="measure" className="flex flex-col items-center text-center">
        <h1 className="font-display text-h1 leading-none tracking-[0.01em] text-cream">{intro.heading}</h1>

        {/* The one place this page draws the rule at 538px rather than 448px. */}
        <Divider variant="heroWide" className="mt-[clamp(0.25rem,0.83vw,1rem)]" />

        <p className="mt-[clamp(0.5rem,1.15vw,1.375rem)] font-serif text-lead leading-[1.05] text-gold">
          <Phrase parts={intro.tagline} />
        </p>
      </Container>
    </Section>
  );
}
