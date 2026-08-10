import Image from "next/image";

import { ComingSoonBackdrop } from "@/components/coming-soon/ComingSoonBackdrop";
import { InvitationForm } from "@/components/coming-soon/InvitationForm";
import { Container } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { comingSoon } from "@/content/coming-soon";
import { siteName } from "@/content/site";
import { brand, videoPosters, videos } from "@/lib/assets";

/**
 * No header, no footer — a single self-contained composition, unlike the
 * homepage's `Section`-per-block layout. Own `<main>` since `(site)/layout.tsx`
 * no longer provides one on this branch.
 *
 * DOM order (video, then copy) is deliberate: below `lg` there's no explicit
 * grid-template, so it's a natural single column and the video renders first;
 * at `lg` the explicit two-column template places that same first child in
 * the left column. One order satisfies "card first" on mobile and "card left"
 * on desktop without a reorder utility.
 *
 * Sized to fit one viewport with little to no scroll, which is why this
 * deliberately doesn't reach for the homepage's hero-scale type tokens
 * (text-h1/text-body/text-lead) — those assume a long-scroll page with room
 * to breathe. The card in particular is capped well below its grid column's
 * own share of the container: at the Figma's 506:697 ratio, a wide column
 * multiplied by the card's tall 1280:2120 aspect ratio is what was pushing
 * the whole page past one screen.
 */
export function ComingSoon() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <ComingSoonBackdrop />

      <Container
        width="hero"
        className="relative z-10 flex max-w-200 flex-col items-center gap-[clamp(0.75rem,1.5vw,1.25rem)] py-[clamp(1rem,2.5vw,2rem)]"
      >
        <Image
          src={brand.logo.src}
          alt={siteName}
          width={brand.logo.width}
          height={brand.logo.height}
          priority
          className="w-[clamp(7rem,9vw,10rem)]"
        />

        <Divider variant="little" />

        <div className="grid w-full items-center gap-[clamp(1rem,2.5vw,2rem)] lg:grid-cols-[506fr_697fr]">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={videoPosters.comingSoon.src}
            src={videos.comingSoon}
            className="aspect-[1280/2120] w-full max-w-52 justify-self-center object-cover lg:max-w-72"
          />

          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="font-serif text-h3 text-champagne">{comingSoon.heading}</h1>

            <p className="font-serif text-note text-champagne">
              {comingSoon.body.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>

            <p className="text-caption text-champagne">{comingSoon.leadIn}</p>
            <p className="font-serif text-nav text-gold lowercase">{siteName}</p>

            <InvitationForm />
          </div>
        </div>
      </Container>
    </main>
  );
}
