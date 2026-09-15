import Image from "next/image";
import Link from "next/link";

import { AppearsPanel } from "@/components/library/card/AppearsPanel";
import { CardEssay } from "@/components/library/card/CardEssay";
import { CardHeader } from "@/components/library/card/CardHeader";
import { LookFor } from "@/components/library/card/LookFor";
import { MetaStrip } from "@/components/library/card/MetaStrip";
import { ShadowPanel } from "@/components/library/card/ShadowPanel";
import { SpheresCarousel } from "@/components/library/card/SpheresCarousel";
import { Container, Section } from "@/components/layout/Section";
import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { ClosingSaying } from "@/components/readings/ClosingSaying";
import type { MajorArcanaContent } from "@/content/card-content";
import { comingSoon, libraryPath, type MajorArcanaCard } from "@/content/library";
import { cardReference } from "@/lib/assets";

/**
 * A Major Arcana card's reference page (Figma `357:261`).
 *
 * The sections run in the client's order and each owns its own block; this file
 * composes them and owns the page's measures, its rhythm and its backdrop.
 *
 * **Two measures, because she draws two.** Her prose runs 1035px and her panels
 * run 1234px, so the dark panels and the meta strip break out past the text
 * rather than everything sharing one column — see `--container-card` and
 * `--container-card-wide`.
 *
 * **The masthead and footer are additions**, in the sense that her frame draws
 * neither: it begins at the paper's torn top edge. They stay because a visitor
 * arriving here from a search must be able to leave, the same reasoning behind
 * the mobile menu button. The back link under the meta strip is the other half
 * of that, and it is the only navigation this page adds — prev/next would point
 * at twenty-one placeholders today.
 */
export function CardReferencePage({
  card,
  content,
}: {
  card: MajorArcanaCard;
  content: MajorArcanaContent;
}) {
  return (
    <div className="library-card-page relative isolate min-h-full pb-[clamp(3rem,8.9vw,10.7rem)]">
      <PageAtmosphere variant="card-reference" />

      {/*
        **Everything below lives on the sheet**, which is the page's structure
        rather than its decoration — see `.card-paper` in globals.css. Her paper
        runs y=171..3166 of a 3237 frame, so the space above it is the top
        margin here and the page's own bottom padding is the space below.
      */}
      <div className="card-paper mt-[clamp(1.5rem,5.28vw,6.34rem)]">
        {/*
          Her gold ornament (`FRAME`, 1229x604 at x=345, y=228) frames the top
          of the sheet: flourished corners, three diamonds centred on its top
          edge, and sides that run down and simply stop. It is drawn, not
          stretched — a 604px-tall ornament on a page of unknown height would
          smear — so it keeps its own aspect and the content sits over it.

          Her sheet starts at y=171 and this at y=228, so it hangs 57px below
          the paper's top edge rather than sitting flush with it: 57/1920 as a
          vw term, with the Figma pixel as the maximum.
        */}
        <div className="stack">
          <Image
            src={cardReference.frameOrnament.src}
            alt=""
            width={cardReference.frameOrnament.width}
            height={cardReference.frameOrnament.height}
            className="mt-[clamp(1.125rem,2.969vw,3.563rem)] h-auto w-[91.92%] justify-self-center self-start"
            sizes="(width >= 64rem) 64.01vw, 92vw"
            priority
          />

          {/*
            Her numeral starts at y=297 and the artwork beside the essay at
            y=473, both against a sheet that begins at y=171 — so 126px down to
            the heading and 176 more to the essay. Explicit here for the same
            reason the gaps below are: a shared `Section` padding gives every
            block the same air, and hers are all different.
          */}
          <div className="flex flex-col">
            <Section padding="none" className="pt-[clamp(1.969rem,6.563vw,7.875rem)]">
              <Container width="card">
                <CardHeader card={card} />
              </Container>
            </Section>

            <Section padding="none" className="pt-[clamp(0.875rem,2.917vw,3.5rem)]">
              <Container width="card">
                <CardEssay card={card} content={content} />
              </Container>
            </Section>
          </div>
        </div>

        {/*
          **The gaps are hers, one at a time, rather than a shared rhythm.**
          Her frame spaces these blocks 34, 35, 41 and 69px apart — they tighten
          through the middle of the page — so a single `Section` padding cannot
          produce them. Each is the Figma gap as the clamp's maximum and that
          gap / 19.2 as its vw term, the conversion `src/app/README.md` requires.

          Two are tighter than her frame: the gap above this panel and the one
          above the closing line. Her numbers measure to a *text box* whose
          empty tail is part of the gap, and the same value applied to a box
          that ends at its last line reads as far more air.

          **The panel sits close under the essay, and her frame is the reason.**
          She starts it at y=1119 while the essay column's own box runs to
          y=1166 — they overlap by 47px, because that column is sized for the
          artwork beside it rather than for the prose, which ends higher. So the
          gap here is small by design: the air the essay appears to have below it
          is the empty tail of its own column, not spacing.
        */}

        <Section padding="none" className="mt-[clamp(0.5rem,1.25vw,1.5rem)]">
          <Container width="cardWide">
            <AppearsPanel cardName={card.name} columns={content.appears} />
          </Container>
        </Section>

        <Section padding="none" className="mt-[clamp(0.531rem,1.771vw,2.125rem)]">
          <Container width="cardWide">
            <LookFor lines={content.lookFor} />
          </Container>
        </Section>

        <Section padding="none" className="mt-[clamp(0.547rem,1.823vw,2.188rem)]">
          <Container width="cardWide">
            <SpheresCarousel cardName={card.name} spheres={content.spheres} />
          </Container>
        </Section>

        <Section padding="none" className="mt-[clamp(0.641rem,2.135vw,2.563rem)]">
          <Container width="cardWide">
            <ShadowPanel lines={content.shadow} />
          </Container>
        </Section>

        <Section padding="none" className="mt-[clamp(1.078rem,3.594vw,4.313rem)]">
          <Container width="cardWide">
            <MetaStrip meta={content.meta} />
          </Container>
        </Section>

        {/*
          `action={null}` is the case this block already has for a page with
          nowhere to send the reader — `/redeem/` uses it — and it is right here
          for the same reason the Library index sells nothing: her frame draws
          the saying between two rules and no button under it.
        */}
        <ClosingSaying
          className="mt-[clamp(0.875rem,2.917vw,3.5rem)]"
          saying={content.closing}
          action={null}
          width="cardClosing"
          rule="green"
          tone="ink"
        />

        {/*
          Her sheet runs 305px past the closing line — empty paper, which is
          the same "let the artwork breathe" the Library page records. The back
          link sits in that room rather than below the sheet, because a visitor
          who has read to the end is still on the page.
        */}
        <Section padding="none" className="pb-[clamp(2.375rem,7.917vw,9.5rem)] pt-[clamp(1.875rem,6.25vw,7.5rem)]">
          <Container width="card" className="flex justify-center">
            <Link
              href={libraryPath}
              className="font-sans text-nav tracking-wide text-card-forest underline-offset-4 hover:underline"
            >
              {comingSoon.back}
            </Link>
          </Container>
        </Section>
      </div>
    </div>
  );
}
