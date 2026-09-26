import { Divider } from "@/components/ui/Divider";
import { OrnateFrame } from "@/components/ui/OrnateFrame";
import { StarRating } from "@/components/ui/StarRating";
import type { ReadingPage } from "@/content/reading-pages";

/**
 * The reader's word for it, in a frame of its own under a rule.
 *
 * Two things here are not the frame's.
 *
 * The stars are `StarRating` — glyphs with the site's own halo on them —
 * rather than the 178x31 bitmap Figma exports, which is what the homepage's
 * two testimonials already do. A rating is a value, not a picture: as glyphs
 * it carries "rated 5 out of 5" to a screen reader and stays sharp at any
 * size, and there is one definition of it on the site instead of two.
 *
 * The opening quote mark is set in Cinzel, not the Cormorant Figma reaches for
 * — a face used for a single glyph on one page, against a site that already
 * has a serif for exactly this kind of ornament. Loading a fourth family for
 * one character is the only thing that would have been faithful about it.
 *
 * The figure carries the quote's own type size so everything in it can be
 * measured against that: the mark is five of it, which is the 150px Figma sets
 * over 30px.
 *
 * **The mark states its own height rather than taking the one its type gives
 * it.** A `“` is ink near the cap line and nothing else — at 150px its line
 * box is 150px tall with about 40px of that inked, so left alone it hangs
 * roughly 90px of empty box over the words and pushes the quote most of a
 * paragraph down the frame. Squeezing `line-height` instead is the trap: a
 * short line box shrinks around the *baseline*, so the ink climbs with it and
 * the top of the mark ends up above the frame, where the panel clips it off.
 * A declared height leaves the glyph exactly where its own metrics put it and
 * fixes only what it contributes to the flow.
 *
 * Where it sits inside that height is the padding, and the two are the pair to
 * turn together: the padding drops the mark down the frame, the height keeps
 * the air under it constant while it moves. Both are `em` of the mark's own
 * 5em, and the box is `border-box`, so raising the padding by a tenth and the
 * height by the same tenth moves the glyph without moving the quote.
 */
export function ReadingTestimonial({ reading }: { reading: ReadingPage }) {
  return (
    /*
      **Tighter than her 75px above the rule and 70px below it, at the client's
      request**: less margin around this panel's last divider.

      Both sides come in together, because the ask is about the air around the
      ornament rather than where it sits between the two blocks — cutting only
      one would slide the rule toward a neighbour instead of tightening it. 48px
      and 44px keep it nearer the middle of the two.

      Her own figures are kept in this note; the rule's 47px box is the artwork's
      448x55 aspect and not margin, so it is not part of this.
    */
    <section className="mt-[clamp(calc(1rem*var(--reading-rhythm)),calc(2.5vw*var(--reading-rhythm)),calc(3rem*var(--reading-rhythm)))] flex flex-col items-center">
      <Divider variant="hero" />

      {/* 616px of the 686px panel. 44px under the rule; see the note above. */}
      <OrnateFrame variant="inset" className="mt-[clamp(calc(1rem*var(--reading-rhythm)),calc(2.29vw*var(--reading-rhythm)),calc(2.75rem*var(--reading-rhythm)))] w-[89.8cqw]">
        <figure className="flex flex-col items-center px-[9.5cqw] pt-[1.95cqw] pb-[5.5cqw] text-center text-nav">
          <p aria-hidden className="h-[0.61em] pt-[0.16em] font-serif text-[5em] leading-none tracking-[0.01em] text-gold">
            “
          </p>

          <blockquote className="mt-[0.35em] leading-[1.07] tracking-[0.01em] font-light text-cream">
            {reading.testimonial.quote.map((line) => (
              <span key={line} className="block text-balance">
                {line}
              </span>
            ))}
          </blockquote>

          <StarRating className="mt-[clamp(calc(0.375rem*var(--reading-rhythm)),calc(0.99vw*var(--reading-rhythm)),calc(1.1875rem*var(--reading-rhythm)))] text-h3" />

          <figcaption className="mt-[clamp(calc(0.25rem*var(--reading-rhythm)),calc(0.68vw*var(--reading-rhythm)),calc(0.8125rem*var(--reading-rhythm)))] text-fine leading-[1.2] tracking-[0.01em] font-light text-mist">
            {reading.testimonial.attribution.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </figcaption>
        </figure>
      </OrnateFrame>
    </section>
  );
}
