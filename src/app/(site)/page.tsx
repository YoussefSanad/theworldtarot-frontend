import { ArtistNote } from "@/components/home/ArtistNote";
import { ChooseYourJourney } from "@/components/home/ChooseYourJourney";
import { ClosingCta } from "@/components/home/ClosingCta";
import { FeaturedTestimonial } from "@/components/home/FeaturedTestimonial";
import { Hero } from "@/components/home/Hero";
import { PlaceStatement } from "@/components/home/PlaceStatement";
import { ValueProps } from "@/components/home/ValueProps";
import { WhatsIncluded } from "@/components/home/WhatsIncluded";
import { WorldTarotIntro } from "@/components/home/WorldTarotIntro";
import { PageAtmosphere } from "@/components/layout/PageAtmosphere";

export default function HomePage() {
  return (
    <>
      <PageAtmosphere variant="hero" />
      <Hero />
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
