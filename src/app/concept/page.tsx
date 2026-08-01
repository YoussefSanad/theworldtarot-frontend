import { ConceptHero } from "@/components/concept/ConceptHero";
import { ArtistNote } from "@/components/home/ArtistNote";
import { ChooseYourJourney } from "@/components/home/ChooseYourJourney";
import { ClosingCta } from "@/components/home/ClosingCta";
import { FeaturedTestimonial } from "@/components/home/FeaturedTestimonial";
import { PlaceStatement } from "@/components/home/PlaceStatement";
import { ValueProps } from "@/components/home/ValueProps";
import { WhatsIncluded } from "@/components/home/WhatsIncluded";
import { WorldTarotIntro } from "@/components/home/WorldTarotIntro";

export default function ConceptHomePage() {
  return (
    <>
      <ConceptHero />
      <WorldTarotIntro />
      <ChooseYourJourney />
      <WhatsIncluded />
      <PlaceStatement />
      <ValueProps />
      <FeaturedTestimonial />
      <ArtistNote />
      <ClosingCta />
    </>
  );
}
