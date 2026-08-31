import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { Phrase } from "@/components/ui/Phrase";
import { readingPageChrome } from "@/content/reading-pages";
import { brand } from "@/lib/assets";

/**
 * Three props under the panels, each opened by a compass.
 *
 * The same three parts the homepage's value props are made of — compass, title,
 * hairline, body — and the same two arrangements.
 *
 * **Three things move here and they move at three different widths, which is
 * not an oversight.** Whether the props sit *side by side* switches at `md`,
 * the homepage's own breakpoint for the same row. How a prop is *arranged*
 * switches much later, at 1152px: above that the compass stands **beside** the
 * words, as this frame draws it, and below it sits **over** them the way the
 * homepage's do, at the homepage's own size. And the row's own *measure*
 * switches at `lg` — `readingProps` rather than `reading`, because below there
 * the page is capped at 440px and three props do not fit inside it.
 *
 * All three are the same measurement wearing different clothes. The longest
 * description line wants about 178px, and it stops getting cheaper below
 * 1134px where `--text-caption` hits its 13px floor while the column carries on
 * narrowing. Three columns of it need 566px of row, which is why the measure
 * opens out below `lg`; and none of those columns can also carry a compass
 * across its middle, which is why the compass stands up below 1152. From `md`
 * to 1152 what is left *is* the homepage's value props — three columns, a
 * compass over each, at the homepage's own size.
 *
 * Both arrangements are the client's, and this is why neither section is a
 * component of the other: what they actually share is a compass and a rule,
 * and both of those are already shared.
 *
 * The compass is `brand.compass`, not the 132x149 Figma exports here — the same
 * artwork at a different scale, checked pixel for pixel against the file
 * already in the repo. The rules under the titles are `.divider--hairline`,
 * which is the same white line the homepage draws at 368px, at the 40% alpha
 * she sets it at on this page and capped to the 277px she draws it at.
 */
export function ReadingFeatures() {
  return (
    <Section padding="none" className="pt-[clamp(1.5rem,2.66vw,3.1875rem)]">
      {/*
        `readingProps`, not `reading`: below `lg` the page is capped at 440px
        and this row opens out past it to 763px so three props can go across.
        The 160px it stands proud of the panels either side is the trade, and
        globals.css carries the note on it. At `lg` the two measures meet and
        the row is flush again.
      */}
      <Container width="readingProps">
        {/*
          Figma spaces the three at 480px and 460px, which is the PSD rather
          than a rhythm; equal columns here — but not the page gutter between
          them. Her pitch leaves the props about 35px and 3px apart, and under
          the gutter's 60px a third of the row is 437px, which is 293px once
          the compass and its gap are out. The first body's opening phrase
          measures 301px: it wrapped inside itself and that prop ran to three
          lines. 24px hands the measure back with room over.

          That 301px is the number the whole row is measured against, and which
          arrangement can pay it is what moves at 1152 rather than the columns.
          *Beside* the words it only holds while the type and the column shrink
          together: `--text-caption` floors at 13px around 1134px while the
          column carries on narrowing, so the phrase stops getting cheaper at
          178px and by about 1090px no gap or compass size leaves it that much.
          *Over* them the phrase has the entire column — 198px at `md`, 212px at
          an iPad's 820 — and the floor is around 700px, under the breakpoint
          either way. Hence three across at `md` and the compass standing up
          below 1152, not one rule doing both.

          1152 rather than `xl`, and the 128px between them is the point of it.
          A 1920 screen at 150% scaling reports 1280 and then takes the classic
          scrollbar back out of it, so the laptop that ought to be the widest
          beside-the-words case landed a few pixels under `xl` and stood its
          compasses up. At 1152 the phrase still clears its column by 4.6%,
          against 5.3% at 1920.
        */}
        <ul className="grid gap-y-[clamp(1.5rem,3.13vw,3.75rem)] md:grid-cols-3 md:gap-x-[clamp(1rem,1.25vw,1.5rem)]">
          {readingPageChrome.features.map((feature, index) => (
            /*
              `min-w-0` so a title wider than its third of the row overhangs it
              rather than growing the track — `1fr` columns keep an automatic
              minimum otherwise, and one long name would push the row past the
              page.
            */
            <li
              key={feature.title}
              className="flex min-w-0 flex-col items-center justify-center gap-[0.45em] text-caption min-[72rem]:flex-row min-[72rem]:gap-[0.55em]"
            >
              <Image
                src={brand.compass.src}
                alt=""
                width={brand.compass.width}
                height={brand.compass.height}
                /*
                  132px at 1920 beside the words, and the homepage's own size
                  below 1152 where it sits over them instead — that clamp's
                  floor holds at 96px across every phone width, and on a tablet
                  it draws the same compass the homepage draws at that width.
                  Same slow halo as the homepage's three, offset per compass so
                  the row does not breathe in step.
                */
                className="compass-breathe w-[clamp(6rem,9.9vw,11.875rem)] shrink-0 min-[72rem]:w-[clamp(3.5rem,6.875vw,8.25rem)]"
                style={{ animationDelay: `${(-4 / 3) * index}s` }}
              />

              {/*
                Three different widths, which is what the frame draws and what
                took three passes to get right. The rule is 277px. The title
                never wraps — Figma sets it `nowrap` and lets it overhang its
                own rule, which is the whole look: a name on one line over a
                line.

                The body's is 15.15em, and it is a ceiling on *the copy* rather
                than the frame's 408px. Measured off MagicallyRegular at the
                frame's 22px with this tracking, her three descriptions are two
                phrases each and they bracket the measure from both sides: the
                longest single phrase is 13.67em ("Each reading unfolds through
                the") and the shortest whole description is 16.77em ("Insight
                that illuminates your next chapter"). Under 13.67 a phrase
                wraps inside itself and that prop runs to three lines; at 16.77
                or over, Clarity in Motion rides one line while its siblings
                take two and the row stops lining up. 15.15 is the middle of
                that window on a ratio — 10.8% clear at either end. Re-measure
                it if any of the six phrases changes.

                408px was not wrong so much as never reached. Three across, the
                column is narrower than the body's cap at every width from 1152
                up, so the cap only ever binds below there — where the compass
                steps out of the line and hands the column back, which is
                exactly where the third description found the room to close up.

                So no measure sits on this column. It takes its width from
                whichever child is widest, and each states its own.
              */}
              <div className="min-w-0 text-center">
                {/* 28px in the frame, a step under the page's 30px. */}
                <h2 className="font-display text-nav leading-none tracking-[0.01em] whitespace-nowrap text-gold-deep">
                  {feature.title}
                </h2>

                <Divider variant="hairline" className="mt-[0.32em] mb-[0.5em] w-[12.59em] opacity-40" />

                <p className="mx-auto max-w-[15.15em] font-display leading-[1.18] tracking-[0.01em] text-mist-dim">
                  <Phrase parts={feature.body} />
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
