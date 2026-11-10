import Image from "next/image";

import { Container, Section } from "@/components/layout/Section";
import { tarotMap } from "@/content/learn";

/**
 * The closing cream band: the three families of cards.
 *
 * Structurally the simpler twin of `SeventyEight` — same centred heading, same
 * row of icon-title-body columns — and deliberately not sharing code with it.
 * The two differ in nearly everything that would be a parameter: the polarity
 * (navy on cream against gold on night), the count, the rules, the divider, and
 * whether there is a rule under the heading at all. A shared component would be
 * mostly branches, and these are the kind of marketing sections a client edits
 * one at a time.
 *
 * **Three columns stack straight to one below `sm`** with no two-up middle step.
 * Four marks pair off naturally; three leave an orphan, so the row goes from
 * three to one and skips the arrangement that would strand a single card.
 *
 * The icons are her navy line art, which is why nothing here tints them — they
 * arrive in the band's own ink and share it with the type.
 */
export function TarotMap() {
  return (
    <Section padding="none" className="bg-cream text-ink">
      <Container className="flex flex-col items-center py-[clamp(2.5rem,6.25vw,7.5rem)] text-center">
        <h2 className="font-serif text-h2 leading-[1.15] tracking-[0.04em]">{tarotMap.heading}</h2>

        {/* Same local clamp as `SeventyEight`'s intro — see the note there. */}
        <p className="mt-[clamp(0.8rem,1.5vw,1.8rem)] max-w-4xl font-light text-[clamp(1.1875rem,1.5625vw,1.875rem)] leading-[1.35]">
          {tarotMap.intro}
        </p>

        <div className="mt-[clamp(1.8rem,4.2vw,5rem)] grid w-full grid-cols-1 gap-y-[2.75em] sm:grid-cols-3 sm:gap-y-0">
          {tarotMap.groups.map((group) => (
            <article
              key={group.title}
              className="flex flex-col items-center gap-[0.75em] px-[clamp(0.5rem,1.5vw,1.8rem)] text-center"
            >
              <Image
                src={group.image.src}
                alt=""
                width={group.image.width}
                height={group.image.height}
                sizes="(width >= 64rem) 9vw, 24vw"
                className="h-auto w-[clamp(4.5rem,6.8vw,8.1rem)]"
              />

              {/* Same local clamp as `SeventyEight`'s titles — see the note there. */}
              <h3 className="font-serif text-[clamp(1.1875rem,1.5625vw,1.875rem)] font-bold tracking-[0.04em]">
                {group.title}
              </h3>

              {/* Same local clamp as `SeventyEight`'s captions — see the note there. */}
              <p className="max-w-[20rem] font-light text-[clamp(1.0625rem,1.25vw,1.5rem)] leading-[1.35] sm:max-w-none">
                {group.body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
