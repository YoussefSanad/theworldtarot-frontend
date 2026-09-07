import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { ReadingOrder } from "@/components/reading/ReadingOrder";
import { ReadingPresentation } from "@/components/reading/ReadingPresentation";
import { threeCard } from "@/content/reading-pages";
import { readingJsonLd } from "@/lib/structured-data";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  path: "/readings/three-card/",
  title: "3 Card Reading",
  description:
    "One question, three cards, your path illuminated. A written tarot reading, thoughtfully interpreted and delivered by email within 24 hours.",
});

export default function ThreeCardReadingPage() {
  return (
    <>
      <JsonLd
        data={readingJsonLd({
          path: "/readings/three-card/",
          name: threeCard.title,
          description: threeCard.tagline.join(" "),
          price: threeCard.price,
        })}
      />
      <ReadingPresentation reading={threeCard} commerce={<ReadingOrder reading={threeCard} />} />
    </>
  );
}
