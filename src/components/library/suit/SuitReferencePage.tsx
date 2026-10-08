import { LookFor } from "@/components/library/card/LookFor";
import { SpheresCarousel } from "@/components/library/card/SpheresCarousel";
import { LibraryIntro } from "@/components/library/LibraryIntro";
import { StillUnfolding } from "@/components/library/suit/StillUnfolding";
import { SuitIntro } from "@/components/library/suit/SuitIntro";
import { Container, Section } from "@/components/layout/Section";
import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { ClosingSaying } from "@/components/readings/ClosingSaying";
import type { Suit } from "@/content/library";
import type { SuitContent } from "@/content/suit-content";
import { suitPaper, suitPaperMobile } from "@/lib/assets";

/**
 * A suit's reference page — one per suit, describing the suit rather than its
 * cards.
 *
 * **It is the card reference page's structure with her suit blocks in it**, and
 * it shares that page's whole measurement system: `--card-scale`,
 * `--measure-card-paper`, `.card-paper` and `.card-reading-ground` all apply
 * unchanged, because her suit frames are the same 1920x3237 and put the sheet
 * in the same box. See `CardReferencePage` for why those exist; nothing about
 * them is re-derived here.
 *
 * **Her sheets are wider than a card's** — about 1460 against 1337 — which
 * costs nothing: `.card-paper` is a box the image fills, so a sheet's own width
 * is only its aspect, and all four suits share one. The aspect is checked at
 * conversion time (`scripts/optimize-suit-assets.mjs`) because an export
 * trimmed to layer bounds breaks it, and did once.
 *
 * **What this page does not have**: no numeral, no `AppearsPanel`, no
 * `ShadowPanel`, no `MetaStrip` — a suit has no element, planet, sign or
 * yes/no — and no emblem component, because her emblems are painted into the
 * parchments. See this directory's README.
 */
export function SuitReferencePage({ suit, content }: { suit: Suit; content: SuitContent }) {
  return (
    <div className="library-card-page min-h-full pb-[clamp(calc(3rem*var(--card-scale)),calc(8.9vw*var(--card-scale)),calc(10.7rem*var(--card-scale)))]">
      {/*
        **Deliberately not `relative`** — see the note in `CardReferencePage`,
        which this page follows exactly: the atmosphere has to resolve against
        the layout column so the artwork can reach up behind the transparent
        masthead.
      */}
      <PageAtmosphere variant="card-reference" />

      {/*
        The Library's own navigation, above the sheet and marking which suit
        this is. Her frame draws neither it nor the masthead, the same way her
        card frame draws no masthead: a visitor arriving here from a search has
        to be able to reach the other three suits and the grid, and this strip
        is how the rest of the Library already does that.
      */}
      <LibraryIntro current={suit.slug} />

      {/*
        **`--container-card-paper` is overridden here**, because her suit sheets
        are ~1460 wide where the card sheets are 1337 and `.card-paper` paints
        at `100% 100%` — the image takes the box's aspect, not its own. In the
        card box the parchment was squeezed about 8% horizontally, which shows
        on these sheets in a way it does not on a card's: a card's sheet is flat
        grain with no figure to skew, while each of these has her emblem painted
        into it.

        **`--measure-card-paper` is set, not `--container-card-paper`.** The
        measure is declared on `:root`, where it is already computed from the
        root's container value — so overriding the container on this element
        would change nothing. The measure itself is what `.card-paper` reads,
        and the expression mirrors the one in globals.css with 1460's own vw
        term (1460 / 19.2 = 76.042).
      */}
      <div
        className="card-paper suit-paper mt-[clamp(calc(1.5rem*var(--card-scale)),calc(5.28vw*var(--card-scale)),calc(6.34rem*var(--card-scale)))] pb-[clamp(calc(3.813rem*var(--card-scale)),calc(12.708vw*var(--card-scale)),calc(15.25rem*var(--card-scale)))] lg:[--measure-card-paper:calc(min(var(--container-suit-paper),76.042vw)*var(--content-scale)*var(--card-scale))]"
        data-paper-mobile=""
        style={
          {
            "--card-paper": `url("${suitPaper(suit.slug)}")`,
            "--card-paper-mobile": `url("${suitPaperMobile(suit.slug)}")`,
          } as React.CSSProperties
        }
      >
        <Section padding="none" className="pt-[clamp(calc(1.969rem*var(--card-scale)),calc(6.563vw*var(--card-scale)),calc(7.875rem*var(--card-scale)))]">
          {/*
            **`cardWide`, not `card`.** The narrower measure is her *card*
            prose column, and inside a suit sheet it left 212px of parchment
            either side where her own frame leaves about 100. `cardWide` is
            1234 against the sheet's 1460, which lands within a dozen pixels
            of hers.
          */}
          <Container width="cardWide">
            {/*
              **No reading ground on this section, unlike the card pages.**

              `.card-reading-ground` exists because a card's sheet is a
              watercolour vignette painted *around* a pale centre, so copy that
              reaches the sides loses its ground and black type goes dark on
              dark. Her suit sheets are the opposite composition: the wash is
              heaviest where the emblem is, and the column the writing occupies
              is the palest part of the sheet. A wash here had nothing to
              correct and read as a panel laid over her painting — which is the
              failure mode that rule's own note warns about.
            */}
            <SuitIntro title={suit.title} content={content} />
          </Container>
        </Section>

        <Section padding="none" className="mt-[clamp(calc(1.25rem*var(--card-scale)),calc(3.6vw*var(--card-scale)),calc(4.25rem*var(--card-scale)))]">
          <Container width="cardWide">
            {/*
              The ground runs the full measure here, unlike the opening section
              above: this block spans the sheet rather than sharing it with the
              emblem, so there is no painting to keep clear of.
            */}
            <div className="card-reading-ground">
              <LookFor label="KEY THEMES" lines={content.keyThemes} tone="suit" />
            </div>
          </Container>
        </Section>

        <Section padding="none" className="mt-[clamp(calc(0.547rem*var(--card-scale)),calc(1.823vw*var(--card-scale)),calc(2.188rem*var(--card-scale)))]">
          <Container width="cardWide">
            {/*
              **Black here, not the page's navy.** The three cards sit on their
              own pale ground inside her ornate frames, and she sets their type
              black the way the card pages do — so this takes the component's
              default rather than the `suit` tone the rest of the page uses.
            */}
            <SpheresCarousel cardName={suit.title} spheres={content.spheres} />
          </Container>
        </Section>

        {/*
          Her frame draws the saying between two rules with no button under it,
          exactly as the card pages do — so `action={null}` and `hugRule`, for
          the reasons `CardReferencePage` records on the same call.
        */}
        <ClosingSaying
          className="mt-[clamp(calc(0.313rem*var(--card-scale)),calc(1.042vw*var(--card-scale)),calc(1.25rem*var(--card-scale)))]"
          saying={content.closing}
          action={null}
          width="cardClosing"
          rule="green"
          tone="ink"
          hugRule
        />

        <Section padding="none" className="mt-[clamp(calc(0.5rem*var(--card-scale)),calc(1.25vw*var(--card-scale)),calc(1.5rem*var(--card-scale)))]">
          <Container width="cardWide">
            <StillUnfolding heading={content.unfolding.heading} body={content.unfolding.body} />
          </Container>
        </Section>
      </div>
    </div>
  );
}
