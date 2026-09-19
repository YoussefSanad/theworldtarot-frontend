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
 * The title is 60px (`--text-h1`). ~~The tagline is 40px Cinzel, `--text-lead`
 * rather than `--text-h3`, the nearer of the two and the one that is exact.~~
 * **The tagline is `--text-nav` from the Library feedback round**: the client
 * named the Library's own subheading as the reference for every subheading on
 * the site, and it is 30px. Her frame here draws 40 — this is a departure from
 * the drawing at her own instruction, like the section padding above it.
 */
export function WorldTarotIntro() {
  return (
    /*
      107px of a 1920px frame, above.

      Below, the frame's own gap to the first panel is 22px (1.15vw) — and it
      is deliberately **not** what ships. The client asked for more breathing
      room between the gold tagline and the framed section, so this is 56px at
      1920 (2.92vw), with the floor lifted to match. That is a departure from
      the frame at her own request, like the four `README.md` already lists;
      the frame's number is kept here so the original is one edit away.
    */
    <Section padding="none" className="pt-[clamp(2rem,5.57vw,6.6875rem)] pb-[clamp(1.75rem,2.92vw,3.5rem)]">
      <Container width="measure" className="flex flex-col items-center text-center">
        <h1 className="font-display text-h1 leading-none tracking-[0.01em] text-cream">{intro.heading}</h1>

        {/* The one place this page draws the rule at 538px rather than 448px. */}
        <Divider variant="heroWide" className="mt-[clamp(0.25rem,0.83vw,1rem)]" />

        {/*
          **`text-nav`, which is the site's subheading size.** The client picked
          the Library's "An Archive of the Symbol and Meaning" as her reference
          — "I prefer the font and smaller size used for [it] ... please use
          this as the reference for consistent subheadings across the site" —
          so this gold line follows it rather than the 40px the frame drew here.

          Same family and colour as before; only the ramp changes. See
          `LibraryIntro` for the line this is matching.
        */}
        <p className="mt-[clamp(0.5rem,1.15vw,1.375rem)] font-serif text-nav leading-[1.05] text-gold">
          <Phrase parts={intro.tagline} />
        </p>
      </Container>
    </Section>
  );
}
