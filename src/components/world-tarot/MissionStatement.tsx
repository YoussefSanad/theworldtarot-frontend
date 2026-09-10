import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { OrnateFrame } from "@/components/ui/OrnateFrame";
import { ornaments, worldTarotArtwork } from "@/lib/assets";
import { mission } from "@/content/world-tarot";

/**
 * The closed panel under the masthead — Figma's "SECTION 1 - FRAME 1", 932x543.
 * Same `panel` frame the readings gift band and signature panel use, with the
 * client's own trio astride the top edge, bracketed by the studs those panels
 * wear a fifth of the way in from either end.
 *
 * **Everything inside is `cqw` off the panel's own box**, which is the rule
 * `src/app/README.md` sets for anything whose internal proportions are driven
 * by its container rather than the viewport — the same reason `ProductCard`
 * and the reading panels are sized that way. A `vw` clamp here reads correct
 * at 1920 and shrinks out of proportion everywhere else, which is exactly what
 * the first cut of this panel did.
 *
 * The moth is not one of the top-edge marks. Figma centres it at (427,250) of
 * the 932x543 frame — mid-body, in the gap between the two paragraphs, which
 * her text block spends four empty 32px lines on. That gap is reproduced as
 * the moth's own margin rather than as blank lines.
 *
 * **This panel is narrower than the page's measure, and stays so.** Figma
 * draws it at 932 against the artist panel's 1029, both centred on 960 — so
 * the container is the wider of the pair (see `--container-world-tarot`) and
 * this one takes 90.57% of it, which is 932/1029. Widening it to the measure
 * would be a design change, and would put every `cqw` below out by a tenth.
 */
export function MissionStatement() {
  return (
    /* 24px between the two panels, of a 1920px frame. */
    <Section padding="none" className="pb-[clamp(0.75rem,1.25vw,1.5rem)]">
      <Container width="worldTarot" className="flex justify-center">
        <div className="w-full max-w-[90.57%]">
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
                  /* 26px of the 932px frame. */
                  className="w-[2.79cqw] max-w-none shrink-0"
                />
                <Stud mirrored />
              </>
            }
            /*
              Her copy sits 121px down a 543px panel and runs 836px of its
              932 — 12.98cqw and 5.15cqw — and her ten lines of 32px leading
              leave 102px under it, which is 10.94cqw. **The padding is not
              symmetric in the frame and is not symmetric here**: the panel
              sits slightly low in its own border, and evening the two out
              is what makes it look wrong.

              A pass that read "a bit more padding" as 17cqw on both edges
              added 94px — 17% of the panel's height — and the panel stood
              visibly taller than the frame. The extra is now the 1cqw it
              should have been.

              `bg-ink/50` is the panel's own fill, not a readability tweak:
              her export measures a flat `rgba(0,2,2,130)` edge to edge —
              51% — over the whole panel, which is the same wash the reading
              page's right panel carries and ships as a colour rather than a
              932x543 bitmap for the same reason.
            */
            bodyClassName="bg-ink/50 px-[5.15cqw] pt-[13.98cqw] pb-[11.94cqw]"
          >
            {/*
              30px of the 932px panel. The `max()` is the floor a pure `cqw`
              cannot have: below `lg` this panel is 81.33% of a phone, so
              3.22cqw alone would set her copy at 10px there. 17px is the
              same floor `--text-body` holds, and it only ever binds under
              about 530px of panel.
            */}
            <p className="mx-auto max-w-[89.7cqw] text-center font-light text-[max(1.0625rem,3.22cqw)] leading-[1.15] tracking-[0.01em] text-cream">
              {mission.body[0]}
            </p>

            {/*
              71px of the 932px panel — 7.62cqw.

              **The four blank lines between her paragraphs are not all
              margin: the moth stands in them.** Her gap runs from the first
              paragraph's last line at y=217 to the second's first at y=345,
              and the moth occupies y=250..317 of it — so the air is 33px
              above and 28px below, 3.54cqw and 3cqw, not the 128px of blank
              line divided in two. Reading it as pure margin put 64px on each
              side and added about 67px to the panel on its own.
            */}
            <Image
              src={worldTarotArtwork.moth.src}
              alt=""
              width={worldTarotArtwork.moth.width}
              height={worldTarotArtwork.moth.height}
              className="mx-auto mt-[3.54cqw] mb-[3cqw] h-auto w-[7.62cqw] max-w-none"
            />

            <p className="mx-auto max-w-[89.7cqw] text-center font-light text-[max(1.0625rem,3.22cqw)] leading-[1.15] tracking-[0.01em] text-cream">
              {mission.body[1]}
            </p>
          </OrnateFrame>
        </div>
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
      className={mirrored ? "w-[2.04cqw] max-w-none shrink-0 -scale-x-100" : "w-[2.04cqw] max-w-none shrink-0"}
    />
  );
}
