import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { ReadingCard } from "@/components/readings/ReadingCard";
import { readings, traditional } from "@/content/readings";
import { ornaments } from "@/lib/assets";
import { cn } from "@/lib/cn";

/**
 * The three written readings, under a heading bracketed by gold rules.
 *
 * Figma draws the rules as two 359px bitmaps either side of a heading that
 * never wraps. Here they are `flex: 1` borders instead, so they take up
 * whatever the heading leaves.
 *
 * **The mobile mockup has no such section.** She runs the five panels as one
 * uninterrupted list on a phone — no heading, no standfirst, nothing between
 * the signature panel and the first reading. So below `lg` the ornament, the
 * rules and the standfirst go, and the heading itself stays only for screen
 * readers: dropping it outright would leave three `h3` cards hanging off the
 * page's `h1` with nothing to group them, which is a document-outline problem
 * her mockup has no way to show.
 */
export function TraditionalReadings() {
  return (
    <Section padding="none" className="pb-[clamp(1.5rem,3.02vw,3.625rem)]">
      <Container width="readings" className="flex flex-col items-center">
        <div className="flanked w-full text-h2 max-lg:contents">
          <span aria-hidden className="flanked__rule max-lg:hidden" />
          <RuleEnd />
          {/* Size comes from the row, so the marks bracketing it stay in proportion. */}
          <h2 className="mx-[0.32em] min-w-0 text-center font-serif text-gold max-lg:sr-only">{traditional.heading}</h2>
          <RuleEnd mirrored />
          <span aria-hidden className="flanked__rule max-lg:hidden" />
        </div>

        <p className="mt-[clamp(0.375rem,0.47vw,0.5625rem)] text-center font-light text-body leading-[1.056] text-champagne max-lg:hidden">
          {traditional.body}
        </p>

        {/* 28px between cards at 1920, held to the row's own share of the frame below it. */}
        <div className="mt-[clamp(0rem,3.33vw,4rem)] grid w-full gap-y-10 lg:grid-cols-3 lg:gap-x-[min(1.458vw,1.75rem)] lg:gap-y-0">
          {readings.map((reading) => (
            <ReadingCard key={reading.id} reading={reading} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

/** The diamond mark that closes each rule; drawn once and flipped for the other side. */
function RuleEnd({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <Image
      src={ornaments.ruleEnd.src}
      alt=""
      width={ornaments.ruleEnd.width}
      height={ornaments.ruleEnd.height}
      className={cn("h-[0.41em] w-auto max-w-none shrink-0 max-lg:hidden", mirrored && "-scale-x-100")}
    />
  );
}
