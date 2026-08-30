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
 * DOM order (video, then copy) is the desktop order: at `xl` the two-column
 * template places that first child in the left column. Below `xl` there is no
 * template, so it would fall to the top of a single column — and that is the
 * one place the card should not be. `max-xl:order-last` drops it under the
 * form, so the heading, the copy and the email field are what a visitor lands
 * on and the card is the reward for scrolling. Scoping a reorder utility to
 * the widths that need it beats reversing the DOM, which would cost the
 * desktop composition its natural order.
 *
 * One column holds to `xl` — 1280px, and not the `lg` the rest of the site
 * turns at. `lg` is 1024px exactly, which is the width of a 12.9" iPad held
 * upright, so it handed a tablet the desktop composition by a single pixel;
 * the 11" and the Air do the same thing in landscape at 1194 and 1180. The
 * deeper reason is that the split doesn't earn its keep until well past
 * `lg` anyway. The copy column carries the entire form — an email row that
 * keeps its label beside the field, a four-line consent line, and a button
 * whose failure message hangs off its right edge (see InvitationForm) — and
 * at the Figma's 506:697 ratio it doesn't clear about 500px until the
 * viewport is near 1120. Below that, whatever the split buys back in height
 * it spends on cramming.
 *
 * Sized to fit one viewport with little to no scroll, which is why this
 * deliberately doesn't reach for the homepage's hero-scale type tokens
 * (text-h1/text-body/text-lead) — those assume a long-scroll page with room
 * to breathe. The card in particular is capped well below its grid column's
 * own share of the container: at that same 506:697 ratio, a wide column
 * multiplied by the card's tall 1280:2120 aspect ratio is what was pushing
 * the whole page past one screen.
 *
 * What the wide end of the one-column band gets is scale. Both the logo and
 * the card are sized by clamps whose *floors* bind across most of it, so a
 * phone and a portrait iPad would otherwise draw them at identical pixel
 * sizes while the container between them nearly doubles — not wrong so much
 * as unfinished, a phone layout with margins. `md:max-xl:w-60` and
 * `md:max-w-[clamp(15rem,28.125vw,18rem)]` lift the two off those floors from
 * `md` up. The copy is left alone; its own tokens are still climbing their vw
 * terms there.
 *
 * Both hand back to the desktop values without a visible step. The card's
 * clamp caps at 18rem, which *is* `xl:max-w-72`, so it has already settled on
 * the desktop width by 1024 and simply holds it to the end of the band. The
 * logo's flat 240px meets a base clamp worth 230px at 1280 — a 4% drop, and
 * the clearest argument for the switch point: at `lg` that same handover was
 * a 25% collapse onto the clamp's floor.
 *
 * Which leaves that floor as the phone's knob and nothing else's. `md:max-xl`
 * owns 768–1279 and the clamp's 18vw term has overtaken the floor by the time
 * `xl` arrives, so the floor is now only ever read below 768px — it is the
 * one number to touch to resize the logo on phones, and it moves nothing else.
 */
export function ComingSoon() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <ComingSoonBackdrop />

      <Container
        width="hero"
        className="relative z-10 flex max-w-240 flex-col items-center gap-[clamp(0.75rem,1.5vw,1.25rem)] py-[clamp(1rem,2.5vw,2rem)]"
      >
        {/*
          `brand.wordmark`, not `brand.logo` — the vector wordmark rather than
          the raster one the headers still use. The widths below are unchanged
          by that swap and deliberately so: the two files carry the lettering at
          the same proportion of their width, so the type lands at exactly the
          size it did, and what goes away is the halo of empty box above and
          below it (0.52w of height becomes 0.18w). The column's `gap` closes
          that back up, which only buys the composition vertical room it was
          already short of.
        */}
        <Image
          src={brand.wordmark.src}
          alt={siteName}
          width={brand.wordmark.width}
          height={brand.wordmark.height}
          priority
          className="w-[clamp(8rem,18vw,20.5rem)] md:max-xl:w-60"
        />

        <Divider variant="little" />

        <div className="grid w-full items-center gap-[clamp(1rem,2.5vw,2rem)] xl:grid-cols-[506fr_697fr]">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={videoPosters.comingSoon.src}
            src={videos.comingSoon}
            className="aspect-1280/2120 w-full max-w-52 justify-self-center object-cover max-xl:order-last md:max-w-[clamp(15rem,28.125vw,18rem)] xl:max-w-72"
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
