import type { Metadata } from "next";

import { ReadingOrder } from "@/components/reading/ReadingOrder";
import { ReadingPresentation } from "@/components/reading/ReadingPresentation";
import { threeCard } from "@/content/reading-pages";
import { siteName } from "@/content/site";

export const metadata: Metadata = {
  title: `3 Card Reading — ${siteName}`,
  description:
    "One question, three cards, your path illuminated. A written tarot reading, thoughtfully interpreted and delivered by email within 24 hours.",
};

export default function ThreeCardReadingPage() {
  return <ReadingPresentation reading={threeCard} commerce={<ReadingOrder reading={threeCard} />} />;
}
