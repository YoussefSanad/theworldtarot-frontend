import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { HouseName } from "@/components/ui/HouseName";
import { OrnateFrame } from "@/components/ui/OrnateFrame";
import { ornaments, worldTarotArtwork } from "@/lib/assets";
import { artistNote } from "@/content/world-tarot";

/**
 * "SECTION 2 - FRAME 2", 1029x1111 — the widest panel on the page and the one
 * `--container-world-tarot` measures off. Photograph left in a frame of its
 * own, heading and bio right, the client's signature under the copy.
 *
 * **Every number here is `cqw` off the panel**, per `src/app/README.md`'s rule
 * for a box whose internals are driven by its own width rather than the
 * viewport. Read off the frame:
 *
 * | | Figma | cqw |
 * |---|---|---|
 * | photo | 294 wide at x=48, y=113 | 28.57 / 4.66 / 10.98 |
 * | frame ornament | 359 wide at x=16, y=80 | 34.89 / 1.55 / 7.77 |
 * | bio column | 558 wide at x=415, y=229 | 54.23 / 40.33 / 22.25 |
 * | bio type | 26px on 30px | 2.53 |
 * | signature | 153 wide at x=681 | 14.87 |
 *
 * **The heading is not flush with the bio.** "Between" starts at x=413,
 * within two pixels of the bio's own 415 — but "SKY & STONE" starts at 499,
 * 86px (8.36cqw) further in, and 58px lower. The script word therefore sits
 * above and to the *left* of the caps, overhanging them, which is the whole
 * look of that pair; setting them flush loses it.
 *
 * The photograph ships pre-clipped to its octagon in its own alpha and the
 * gold frame is a separate transparent export on a larger box, so the two
 * share a `.stack` cell at Figma's own offsets rather than being one CSS
 * clip — same reasoning as the reading panels' inset photographs.
 */
export function ArtistPanel() {
  return (
    /* 72px between this panel and the closing rule, of a 1920px frame. */
    <Section padding="none" className="pb-[clamp(1.5rem,3.75vw,4.5rem)]">
      <Container width="worldTarot">
        <OrnateFrame
          variant="panel"
          marks={
            <>
              <Stud />
              <Image
                src={ornaments.trioSmall.src}
                alt=""
                width={ornaments.trioSmall.width}
                height={ornaments.trioSmall.height}
                /* 26px of the 1029px frame. */
                className="w-[2.53cqw] max-w-none shrink-0"
              />
              <Stud mirrored />
            </>
          }
          /*
            Her columns: 48 of padding, 294 of photograph, 73 of gap, 558 of
            copy, 56 to the far edge — which is the grid below, in the panel's
            own percentages. Stacked below `lg`, where there is no second
            column for the photograph to stand beside.

            `bg-ink/50` is the fill her export carries, a flat
            `rgba(0,2,2,130)` over the whole panel — see the note on the
            mission panel, which measures the same.
          */
          bodyClassName="bg-ink/50 grid grid-cols-1 gap-[6cqw] px-[4.66cqw] pt-[7.77cqw] pb-[6.66cqw] lg:grid-cols-[28.57fr_7.09fr_54.23fr] lg:items-start lg:gap-0 lg:pr-[5.44cqw]"
        >
          {/*
            The frame ornament is 359x522 on a photograph of 294x459, offset
            -32px left and -33px above it — 122.11% and 113.73% of the picture,
            at -10.88% / -7.19% of its own box.

            It is `absolute` rather than a second `.stack` child, and that is
            the point: a stack cell takes the height of its tallest child, so
            the ornament — which is 14% taller than the picture *by design*,
            since it is meant to overhang it — would otherwise grow the box it
            is decorating and push the copy beside it down. Out of flow, the
            photograph alone sizes the column and the gold hangs over it.
          */}
          {/*
            Below `lg` the photograph is a share of the panel rather than the
            grid column it is at `lg`, and that share is set by the *frame*
            rather than by the picture: the ornament overhangs it by 10.88% on
            the left and 7.19% above, so the gold — not the photograph — is
            what approaches the panel's border. At 70% the two lines were
            close enough to read as touching; 58% holds a clear margin on
            every side, and `my-` adds the same air above and below, which the
            overhang would otherwise eat out of the grid gap.
          */}
          <div className="relative mx-auto my-[4cqw] w-[58%] max-w-[18.375rem] lg:my-0 lg:mx-0 lg:w-full lg:max-w-none">
            <Image
              src={worldTarotArtwork.artistPhoto.src}
              alt={artistNote.photoAlt}
              width={worldTarotArtwork.artistPhoto.width}
              height={worldTarotArtwork.artistPhoto.height}
              className="h-auto w-full"
            />
            <Image
              aria-hidden
              src={worldTarotArtwork.photoFrame.src}
              alt=""
              width={worldTarotArtwork.photoFrame.width}
              height={worldTarotArtwork.photoFrame.height}
              className="pointer-events-none absolute top-0 left-0 h-[113.73%] w-[122.11%] max-w-none -translate-x-[10.88%] -translate-y-[7.19%]"
            />
          </div>

          {/* Her 73px gutter between the picture and the copy. */}
          <div aria-hidden className="hidden lg:block" />

          {/*
            The copy column starts 116px below the photograph's own top in the
            frame (229 against 113), which is the 4.4cqw here — on a phone the
            two are stacked and the grid gap does that job instead.
          */}
          <div className="flex flex-col lg:pt-[4.4cqw]">
            {/*
              The heading is two pictures, and the pair's own geometry is
              measured off the client's render of this page rather than read
              off the frame's text boxes — which disagree, the "Between" node
              reporting a 137x48 box for a 139x57 drawing.

              In her render, of the 1029px panel: "Between" is 139 wide with
              its ink from y=110 to y=167, and "SKY & STONE" starts at x=+86
              and y=168 — so the caps begin 2px under the script's lowest
              descender. They stack, tight, indented; they do not overlap.
            */}
            <h2 className="flex flex-col items-start">
              <Image
                src={worldTarotArtwork.between.src}
                alt=""
                width={worldTarotArtwork.between.width}
                height={worldTarotArtwork.between.height}
                className="h-auto w-[13.51cqw] min-w-[4.5rem] max-w-none"
              />
              {/* 86px of the 1029px panel, in from the script word's own left edge. */}
              <Image
                src={worldTarotArtwork.skyStone.src}
                alt={artistNote.legend}
                width={worldTarotArtwork.skyStone.width}
                height={worldTarotArtwork.skyStone.height}
                className="mt-[0.19cqw] ml-[8.36cqw] h-auto w-[20.12cqw] min-w-[6.5rem] max-w-none"
              />
            </h2>

            {/*
              26px on 30px — 1.154 — and the `max()` floors it the way the
              mission panel's copy is floored, for the same reason.
            */}
            {artistNote.body.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-[1.15em] font-light text-[max(0.9375rem,2.53cqw)] leading-[1.154] text-cream first:mt-[2.34cqw]"
              >
                <HouseName>{paragraph}</HouseName>
              </p>
            ))}

            {/*
              153px of the panel, its left edge 266px into the 558px column —
              which is 47.7% of the way across it, so it hangs to the right of
              the copy rather than centring under it.
            */}
            <Image
              src={worldTarotArtwork.signature.src}
              alt={artistNote.signatureAlt}
              width={worldTarotArtwork.signature.width}
              height={worldTarotArtwork.signature.height}
              className="mt-[3.4cqw] ml-[47.7%] h-auto w-[14.87cqw] min-w-[5rem] max-w-none"
            />
          </div>
        </OrnateFrame>
      </Container>
    </Section>
  );
}

function Stud({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <Image
      src={ornaments.stud.src}
      alt=""
      width={ornaments.stud.width}
      height={ornaments.stud.height}
      className={mirrored ? "w-[1.85cqw] max-w-none shrink-0 -scale-x-100" : "w-[1.85cqw] max-w-none shrink-0"}
    />
  );
}
