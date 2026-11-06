import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { seventyEight } from "@/content/learn";

/**
 * The second night band: what the courses give you, in four gold marks.
 *
 * **Each mark is one column with its own border, rather than a shared grid.**
 * The homepage's `ValueProps` splits its columns into grid cells so their
 * dividers line up across a wrapped title; that is the right answer there, where
 * the rule sits *under* each title and would visibly step. Here the rule is
 * vertical and runs the full height of the column, so it absorbs any difference
 * in title height on its own and the simpler structure holds.
 *
 * **The rules are drawn by the columns, not between them.** A left border on
 * every column but the first costs no extra elements and cannot end up stranded
 * when the row wraps: at two columns it divides each pair, at one column it is
 * gone. Hence `sm:odd:border-l-0`: in the two-up band the odd-numbered marks
 * start a row, so each has to drop the border it would otherwise carry, and
 * `lg:odd:border-l` puts it back once all four are on one line again.
 *
 * They are `border-gold/25`: her hairlines are faint, and a full-strength gold
 * reads as a frame around each mark rather than a division between them.
 */
export function SeventyEight() {
  return (
    <Section padding="none" className="py-[clamp(2.5rem,6.25vw,7.5rem)]">
      <Container className="flex flex-col items-center text-center">
        <h2 className="font-serif text-h2 leading-[1.15] tracking-[0.04em] text-cream">{seventyEight.heading}</h2>

        {/* `w-full` is load-bearing: `.divider` has no intrinsic width, so
            `items-center` on the column would otherwise shrink it to nothing. */}
        <Divider variant="heroWide" className="my-[clamp(0.9rem,1.8vw,2.2rem)] w-full" />

        {/* A local clamp, like the marks below it: `text-nav` floors at 15px, which
            put this lead line under the size of the captions it introduces. 19px
            floor, 30px maximum — her own size at 1920. */}
        <p className="max-w-4xl font-light text-[clamp(1.1875rem,1.5625vw,1.875rem)] leading-[1.35] text-mist">
          {seventyEight.intro}
        </p>

        <div className="mt-[clamp(1.8rem,4.2vw,5rem)] grid w-full grid-cols-1 gap-y-[2.75em] sm:grid-cols-2 sm:gap-y-[3em] lg:grid-cols-4 lg:gap-y-0">
          {seventyEight.marks.map((mark, index) => (
            <article
              key={mark.title}
              className={`flex flex-col items-center gap-[0.75em] px-[clamp(0.5rem,1.5vw,1.8rem)] text-center sm:border-gold/25 ${
                index === 0 ? "" : "sm:border-l sm:odd:border-l-0 lg:border-l lg:odd:border-l"
              }`}
            >
              <Image
                src={mark.image.src}
                alt=""
                width={mark.image.width}
                height={mark.image.height}
                sizes="(width >= 64rem) 7vw, 20vw"
                className="h-auto w-[clamp(3.75rem,5.6vw,6.7rem)]"
              />

              {/* The title takes a local clamp for the same reason its caption does: at
                `text-nav` it floors at 15px, which on a phone left the heading
                *smaller* than the body under it. 19px floor keeps it above the
                caption's 17px at every width; the 30px maximum is the token's. */}
              <h3 className="font-serif text-[clamp(1.1875rem,1.5625vw,1.875rem)] font-bold tracking-[0.04em] text-cream">
                {mark.title}
              </h3>

              {/* **The caption size is a local clamp, not `text-note`.** The token tops out at
               * the right place — 24px, her own size — but floors at 14px, and every width
               * below about 1360px sits on that floor. These captions are the only body copy
               * in these two bands and they take the full column on a phone, so 14px read as
               * fine print. The floor here is 17px instead; the 24px maximum and the 1.25vw
               * ramp are the token's own, so nothing changes at desktop. */}
              <p className="max-w-[18rem] font-light text-[clamp(1.0625rem,1.25vw,1.5rem)] leading-[1.35] text-mist lg:max-w-none">
                {mark.body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
