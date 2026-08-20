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
  */
  return (
    <div className="relative isolate">
      <PageAtmosphere variant="readings" />
      <ReadingsIntro />
      <SignatureExperience />
      <TraditionalReadings />
      <GiftAReading />
      <ClosingSaying />
    </div>
  );
}
