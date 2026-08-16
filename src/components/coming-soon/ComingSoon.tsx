import Image from "next/image";

import { ComingSoonBackdrop } from "@/components/coming-soon/ComingSoonBackdrop";
import { InvitationSignup } from "@/components/coming-soon/InvitationSignup";
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
 * DOM order (video, then copy) is the desktop order: at `lg` the two-column
 * template places that first child in the left column. Below `lg` there is no
 * template, so it would fall to the top of a single column — and that is the
 * one place the card should not be. `max-lg:order-last` drops it under the
 * form on phones and tablets alike, so the heading, the copy and the email
 * field are what a visitor lands on and the card is the reward for scrolling.
 * Scoping a reorder utility to the widths that need it beats reversing the
 * DOM, which would cost the desktop composition its natural order.
 *
 * One column holds all the way to `lg` on purpose. A tablet is wide enough to
 * *fit* two columns and not wide enough to be worth it: the copy column would
 * be carrying the whole form — an email row that keeps its label beside the
 * field, a four-line consent line, and a button whose failure message hangs
 * off its right edge (see InvitationForm) — against a container barely 720px
 * wide at `md`. Everything that split buys back in height it spends on
 * cramming, and the card has to shrink below its phone size to pay for it.
 *
 * Sized to fit one viewport with little to no scroll, which is why this
 * deliberately doesn't reach for the homepage's hero-scale type tokens
 * (text-h1/text-body/text-lead) — those assume a long-scroll page with room
 * to breathe. The card in particular is capped well below its grid column's
 * own share of the container: at the Figma's 506:697 ratio, a wide column
 * multiplied by the card's tall 1280:2120 aspect ratio is what was pushing
 * the whole page past one screen.
 *
 * What the tablet band does get is scale. Both the logo and the card are
 * sized by clamps whose *floors* bind from 360px all the way to about
 * 1070px, so a phone and a portrait iPad draw them at the identical pixel
 * size while the container between them nearly doubles — the composition
 * doesn't look wrong there so much as it looks unfinished, a phone layout
 * with margins. `md:max-lg:w-60` and `md:max-w-[clamp(15rem,28.125vw,18rem)]`
 * lift the two off those floors for that band only; the copy is left alone,
 * since its own tokens are still climbing their vw terms there.
 *
 * The two are scoped differently on purpose. The card's `28.125vw` is
 * `288 / 1024` — it reaches `lg:max-w-72` exactly as `lg` takes over, so
 * rotating an iPad to landscape crosses that boundary without the card
 * changing size. The logo cannot do the same: 192px is already its floor at
 * `lg`, and no clamp that grows with width can be larger than that on tablet
 * and equal to it at 1024. So it steps down on rotation, inside a change of
 * composition that is already reordering the page. Widening its scope to
 * `md:w-[clamp(15rem,18vw,20.5rem)]` would remove the step by carrying the
 * larger logo into desktop below 1333px — a deliberate trade, not an
 * oversight, and the one-line version of it if that step ever reads wrong.
 */
export function ComingSoon() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <ComingSoonBackdrop />

      <Container
        width="hero"
        className="relative z-10 flex max-w-240 flex-col items-center gap-[clamp(0.75rem,1.5vw,1.25rem)] py-[clamp(1rem,2.5vw,2rem)]"
      >
        <Image
          src={brand.logo.src}
          alt={siteName}
          width={brand.logo.width}
          height={brand.logo.height}
          priority
          className="w-[clamp(12rem,18vw,20.5rem)] md:max-lg:w-60"
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
            className="aspect-1280/2120 w-full max-w-52 justify-self-center object-cover max-lg:order-last md:max-w-[clamp(15rem,28.125vw,18rem)] lg:max-w-72"
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

            {/*
              The lead-in, the site name and the form, in that order — one
              component because the lead-in is what the form's confirmation
              replaces. It renders a fragment, so those three are still direct
              children of this column and its `gap-2` still applies to them
              exactly as it did when they were written out here.
            */}
            <InvitationSignup />
          </div>
        </div>
      </Container>
    </main>
  );
}
