import { Container, Section } from "@/components/layout/Section";
import { stepInside } from "@/content/learn";

import { PostcardFan } from "./PostcardFan";

/**
 * The first cream band: the pitch on the left, the fanned stills on the right.
 *
 * **This is the first section on the site to carry a background colour**, and it
 * is the split `Section`/`Container` already describe — `Section` is full width
 * and owns the background, `Container` holds the measure — so the band runs edge
 * to edge without a `w-screen` trick or a negative margin.
 *
 * `bg-cream` with `text-ink` inverts the site's polarity for two bands only. The
 * ink is the brand blue the masthead and footer already use, not the card
 * pages' pure black: those belong to that page's own inversion, and her line
 * icons here are drawn in this blue.
 *
 * The band needs no atmosphere and no scrim. It opens and closes on flat colour
 * against the night sections either side, which is how her frame draws it — the
 * hard edge is the design, not an unfinished join.
 */
export function StepInside() {
  return (
    <Section padding="none" className="bg-cream text-ink">
      <Container className="py-[clamp(2.5rem,6.25vw,7.5rem)]">
        {/*
          **`720fr 788fr` is the heading's width, not the paragraphs'.** Her copy
          block runs x235..795 (560px) but the heading overhangs it, reaching
          x955 — 720px — and it is drawn on one line. At 1568 that needs 720px
          of column, so the split is sized to the longest line rather than to
          the body measure. A `578fr 845fr` split, taken from the paragraphs,
          gave the text 613px and wrapped "Understand." onto a second line.

          The fan gives up the difference and lands at 788px against her 845
          (93%). That is the better trade: in her frame the heading overlaps the
          Sun's transparent top-left corner, which a grid cannot do without
          taking the fan out of the flow for one line's sake.
        */}
        <div className="grid items-center gap-gutter lg:grid-cols-[720fr_788fr]">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            {/* Her own warm gold-brown, not the band's blue ink — see `--color-bronze`. */}
            <p className="font-serif text-nav tracking-[0.06em] text-bronze">{stepInside.eyebrow}</p>

            {/*
              Gill Sans, like the hero's lead and for the same measured reason:
              her 'D' has a 42px cap, which at Gill's ~0.70 cap ratio is 60px
              type — `text-h1`. It was set in `font-display` at `text-h2-lg`,
              which was the wrong family and 10px short.
            */}
            {/*
              `lg:whitespace-nowrap` is a guard, not the fix — the column above
              is sized to hold this line. It keeps the three sentences together
              if the measure is ever squeezed, where a wrap puts "Understand."
              alone on a second line. Only above `lg`: below it the column is
              the full width and the line is meant to wrap.
            */}
            <h2 className="mt-[0.3em] font-sans text-h1 leading-[1.1] tracking-[0.01em] lg:whitespace-nowrap">
              {stepInside.heading}
            </h2>

            {/*
              `font-light` is the weight she sets these paragraphs in, and the
              size is 30px (`text-nav`) off a 21px cap — the same pair the hero's
              body takes. `text-body` was 36px and regular.
            */}
            <div className="mt-[0.7em] flex flex-col gap-[0.75em] font-light text-nav leading-[1.23] lg:max-w-[78%]">
              {stepInside.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* The fan keeps its own height, so this cell needs no minimum. */}
          <PostcardFan />
        </div>
      </Container>
    </Section>
  );
}
