import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { hero } from "@/content/learn";
import { learnArtwork } from "@/lib/assets";

import { JoinTheList } from "./JoinTheList";

/**
 * The page's first band: the pitch on the left, the laptop on the right.
 *
 * **The laptop is a bleed layer, not a grid column**, and the measurements are
 * why. In her 1920 frame the artwork runs x859..1920 and ends at y1034 of a band
 * that closes at 1035 — so it is flush to the viewport's right edge and sitting
 * on the band's floor, with a single pixel to spare. The `hero` measure is
 * 1537px centred, which stops at x1728: anything inside the container cannot
 * reach the edge, and a grid cell cannot sit on the section's bottom while its
 * sibling column is centred. So above `lg` the picture leaves the flow — pinned
 * `bottom-0 right-0` at `55vw` (1061/19.2, her own width) — and the text column
 * keeps the container to itself.
 *
 * **The text column is her width, not half the grid.** Her copy runs x262..840,
 * about 30vw, and an earlier draft that split the row `1fr / 1.1fr` squeezed it
 * to roughly half that and set the body in a ribbon. `lg:max-w-[33vw]` holds it
 * near her measure; the column is otherwise free.
 *
 * Below `lg` the laptop returns to the flow under the text, full width inside
 * the measure, because a photograph bleeding off a phone is just one with its
 * subject cut off.
 *
 * The clip is `overflow-x-clip` rather than `hidden`, so nothing here can trap
 * the page's vertical scroll — the same choice `ValueProps` and `ArtistNote`
 * make for their own bleeds.
 *
 * It needs no rounded corner, no mask and no scrim: the artwork's own left edge
 * fades into transparency, so it dissolves into the night rather than ending on
 * a line. That is baked into the delivery — see `learnArtwork` in `lib/assets`.
 *
 * `priority` because this is the page's one above-the-fold image at every width.
 */
export function LearnHero() {
  return (
    <Section
      padding="none"
      /*
        `lg:min-h-[53.9vw]` is her band, 1035/19.2. Above `lg` the laptop is out
        of the flow and contributes no height, and the text alone is shorter
        than she draws the band — so without a floor the section would close
        above the artwork's top edge and crop it. The picture stands 49.6vw, or
        92% of this, and hangs from the bottom.

        **No bottom padding at any width**, which is what puts the artwork on
        the band's floor. Above `lg` the picture is absolute and padding would
        not move it anyway; below `lg` it is the last thing in the flow, and any
        padding here would show as a strip of navy under the desk. The cream
        band that follows is what the image ends against.
      */
      className="overflow-x-clip pt-5 pb-0 lg:min-h-[53.9vw] lg:pt-[clamp(2rem,5.2vw,6.25rem)]"
    >
      <Container width="hero" className="relative z-10">
        {/*
          Her copy runs x262..840 of 1920 — about 30vw — so the cap keeps the
          measure she set rather than letting the line run the full shell.

          **The text and the laptop share the band; they are not two rows.** In
          her frame the copy runs y208..927 while the artwork runs y82..1034 —
          the picture starts above the text and ends below it. The band's height
          comes from the section's own `lg:min-h`, not from this column, and the
          overlap costs the text nothing because the two never meet
          horizontally: the copy stops at x825 and the lit laptop starts at
          x860. An earlier draft reserved the picture's height as padding here,
          which pushed it into a row of its own under a screen of empty navy.
        */}
        <div className="flex flex-col items-center pb-[clamp(2rem,6vw,7rem)] text-center lg:max-w-[33vw] lg:items-start lg:pb-0 lg:text-left">
          <h1 className="font-display text-hero-sm leading-[1.1] tracking-[0.01em] text-snow">{hero.title}</h1>

          <p className="mt-[0.35em] font-serif text-nav leading-tight tracking-[0.08em] text-cream">
            {hero.eyebrow.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>

          {/*
              The rule under the eyebrow.

              **The wrapper is `w-full`, never `w-fit`.** `.divider` is a span
              with `width: 100%` and an `aspect-ratio`, so it has no intrinsic
              width of its own: inside a shrink-wrapping box it resolves to zero
              and the rule silently disappears. Above `lg` the column is left
              aligned, so the rule is capped to its artwork's own measure
              (`--measure-flourish-wide`, via `.divider--hero-wide`) and sits
              flush left rather than being centred on a column far wider than
              the text above it.
            */}
          <Divider variant="heroWide" className="my-[clamp(0.75rem,1.4vw,1.7rem)] w-full lg:mx-0" />

          {/*
            **Gill Sans, not the display face**, and measured rather than
            guessed: her lead's cap height is 42px, which at Gill's ~0.70 cap
            ratio is a 60px type — `text-h1` exactly. An earlier draft set this
            in `font-display` at `text-h2`, which was both the wrong family and
            16px short.
          */}
          <p className="font-sans text-h1 leading-[1.15] tracking-[0.01em] text-champagne">{hero.lead}</p>

          {/*
            Her body is 30px on 37px leading — `text-nav` and 1.23 — where this
            was `text-body` (36px). Both blocks are `#fff3d7`, sampled off the
            PSD and already the site's `--color-champagne` to the byte, so the
            lead and the paragraphs under it share one ink.
          */}
          <div className="mt-[0.6em] flex flex-col gap-[0.75em] font-light text-nav leading-[1.23] text-champagne lg:max-w-[88%]">
            {hero.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <JoinTheList label={hero.action.label} className="mt-[clamp(1.1rem,2vw,2.4rem)]" />

          {/* Her smallest line on the page, and the only one under the button. */}
          <p className="mt-[clamp(0.6rem,1vw,1.2rem)] font-light text-fine tracking-[0.01em] text-mist">{hero.note}</p>
        </div>
      </Container>

      {/*
        **Outside the `Container` on purpose.** Above `lg` this pins to the
        *section*, which is full width, so it can reach the viewport's right
        edge — the shell is 1537px centred and stops 192px short of it. Inside
        the container, `right-0` would land on that inner edge instead.

        **It is drawn at very nearly native size: 83vw.** Measured against the
        flat navy rather than by brightness, the artwork occupies x327..1920 and
        y82..1034 of her frame — 1593x952, which is 0.99 of the file's own
        1606x960. So it stands 49.6vw tall and fills the band top to bottom.

        An earlier draft used 55vw, read off a brightness threshold that found
        only the lit laptop and missed the candlelit desk around it; at that
        width the picture stood 33vw and read as a small inset. **The left
        two-fifths of this image is nearly transparent**, which is what lets it
        run back behind the text column without touching it — the lit body of
        the laptop begins around x860, clear of the copy that ends at x825.

        **Below `lg` it keeps both of those edges.** It is back in the flow,
        under the text, but still runs the full width to the screen's edge and
        still sits on the band's floor — so it is `w-full` with no gutter, no
        centring cap, and the section drops its bottom padding (`max-lg:pb-0`)
        rather than leaving a strip of navy beneath the desk. The alignment is
        the same as the desktop reading; only the stacking changes.
      */}
      <Image
        src={learnArtwork.computer.src}
        alt={hero.imageAlt}
        width={learnArtwork.computer.width}
        height={learnArtwork.computer.height}
        sizes="(width >= 64rem) 83vw, 100vw"
        className="h-auto w-full lg:absolute lg:right-0 lg:bottom-0 lg:z-0 lg:w-[83vw]"
        priority
      />
    </Section>
  );
}
