import type { Metadata } from "next";

import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { ClosingSaying } from "@/components/readings/ClosingSaying";
import { ArtistPanel } from "@/components/world-tarot/ArtistPanel";
import { MissionStatement } from "@/components/world-tarot/MissionStatement";
import { WorldTarotIntro } from "@/components/world-tarot/WorldTarotIntro";
import { siteName } from "@/content/site";
import { closing } from "@/content/world-tarot";

export const metadata: Metadata = {
  title: `The World Tarot — ${siteName}`,
  description:
    "A studio devoted to the living language of archetypal symbols — art, writing, and cinematic interpretation that extends tarot beyond the page.",
};

/**
 * The garden path is the point of this page, and the frame says so with its
 * proportions: the last thing on it is the button at y=2394 of a 3298px
 * frame, so **904px — 27% of the page — is artwork and nothing else**. That
 * is the client's "show as much of the background as possible", measured
 * rather than guessed, and it is what the padding below reproduces (904/1920
 * = 47.08vw). `ClosingSaying`'s own `lg:h-[…]` room-space sits inside that.
 *
 * The atmosphere is `inset-0` on *this* wrapper, so this box is the artwork's
 * box, and both of its edges are tuned in globals.css rather than here — the
 * path reaches up behind the masthead and down under the footer.
 *
 * **`min-h-full` is what makes the bottom edge reachable at all**, and it is
 * the whole reason the artwork meets the footer. `main` is `flex-1` in the
 * layout column's `min-h-screen` flex, so on a short page it stretches past
 * its own content — but a plain block child does not stretch with it, being
 * only as tall as what it holds. That left a gap between this wrapper's
 * bottom and the footer which grew with the viewport, so no fixed overhang in
 * the atmosphere could ever have covered it: the distance was never fixed.
 *
 * Filling `main` puts this box's bottom edge on the footer's top edge, which
 * is the arrangement `.page-atmosphere-world-tarot`'s `--path-drop` assumes.
 * It resolves because `main`'s own height is definite — `flex-1` on a flex
 * item is a resolved length, not `auto`.
 *
 * **The fix belongs here rather than in the layout.** Making `main` a flex
 * column would stretch this wrapper for free, and would also turn the
 * homepage's nine sibling sections into flex items and stop their margins
 * collapsing. A page that needs to fill `main` says so itself.
 */
export default function WorldTarotPage() {
  return (
    <div className="relative isolate min-h-full pb-[clamp(6rem,47.08vw,56.5rem)]">
      {/*
        `max-lg:-top-20` is the readings index's arrangement, and it is only
        about the mobile sky. That layer hangs from this element's top edge,
        which starts under a masthead that is transparent so artwork can run
        behind it — so left flush the sky would open on a hard horizontal edge
        at the header's bottom. 5rem clears the header at every width below
        `lg` (about 66px down here: the menu button's 2.75em of `text-note`,
        which floors at 14px, plus the masthead's own `pt-5 pb-2`).

        It is the element that moves, not the artwork inside it — the sky is
        `cover` on a width-driven box, so a taller box shows more of the top of
        the picture rather than zooming it, and nothing is lost off the bottom
        because the layer fades out there anyway.

        Above `lg` this is inert and the path keeps `--path-rise`, which does
        the same job for the artwork itself. Below `lg` that rise is spent to
        zero in globals.css, so the two never both push at once.
      */}
      <PageAtmosphere variant="world-tarot" className="max-lg:-top-20" />
      <WorldTarotIntro />
      <MissionStatement />
      <ArtistPanel />
      {/*
        Champagne, not the index's gold: the quote in her render measures
        exactly `#fff3d7`, which is `--color-champagne` to the byte. Same
        tone a reading's own page takes.

        `hugRule` because this page owns the air under its closing line, on the
        wrapper above. Without it the block also spends
        `lg:h-[clamp(6rem,14vw,16rem)]` on a room-space box and centres the
        button inside it — up to 256px of it — which set the button adrift
        below the quote. Collapsing that box puts it just under the rule the
        way the frame draws it, 17px below.

        The readings pages keep the centred box, which is theirs and correct:
        there the artwork runs on under the button and that air is the room on
        show. Here the same air is already on the wrapper, and having it twice
        is what pushed the button down.
      */}
      <ClosingSaying
        saying={closing.saying}
        action={closing.action}
        width="worldTarot"
        rule="heroWide"
        tone="champagne"
        hugRule
      />
    </div>
  );
}
