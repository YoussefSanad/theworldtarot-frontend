import type { Metadata } from "next";

import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { ClosingSaying } from "@/components/readings/ClosingSaying";
import { GiftAReading } from "@/components/readings/GiftAReading";
import { ReadingsIntro } from "@/components/readings/ReadingsIntro";
import { SignatureExperience } from "@/components/readings/SignatureExperience";
import { TraditionalReadings } from "@/components/readings/TraditionalReadings";
import { siteName } from "@/content/site";

export const metadata: Metadata = {
  title: `Readings — ${siteName}`,
  description:
    "Begin with our signature interactive experience, where the cards come to life and answer your question in real time, or choose a traditional written reading for a deeper exploration of your path.",
};

export default function ReadingsPage() {
  /*
    The backdrop is scoped to the page's own content rather than the whole
    layout column, which is what this wrapper is for. The client stands the
    parlour on the floor of the page, and the site footer — which her mockups
    don't draw — is opaque: anchored to the column it would spend its whole
    height behind the footer on a phone and never be seen. Ending it where the
    content ends puts the room under the closing call to action, where she
    draws it. `isolate` keeps its `-z-10` inside this box.

    `PageAtmosphere` is `inset-0` on this wrapper, so its bottom edge already
    lands exactly on the wrapper's own bottom — the footer's top edge — with
    no gap and no overhang to tune.

    The top edge does need one, on a phone. The mobile sky (globals.css) hangs
    from this box's top edge, but the box starts under a masthead that is
    transparent so artwork can run behind it — so left flush the sky would open
    with a hard horizontal edge at the header's bottom. 6rem clears that header
    at every width below `lg`; the logo's own height sets it, ~83px at 375 and
    ~90px at 1023. It is the element that moves rather than the sky inside it,
    because the atmosphere clips its own overflow. No artwork is lost either
    way — what ends 6rem higher is the layer's reach, not the top of the
    picture. The site column clips the block axis, so this does not lengthen
    the document.
  */
  return (
    <div className="relative isolate">
      <PageAtmosphere variant="readings" className="max-lg:-top-24" />
      <ReadingsIntro />
      <SignatureExperience />
      <TraditionalReadings />
      <GiftAReading />
      <ClosingSaying />
    </div>
  );
}
