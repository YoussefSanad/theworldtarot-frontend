import type { Metadata } from "next";

import { ReadingOrder } from "@/components/reading/ReadingOrder";
import { ReadingPresentation } from "@/components/reading/ReadingPresentation";
import { monthAhead } from "@/content/reading-pages";
import { siteName } from "@/content/site";

export const metadata: Metadata = {
  title: `Month Ahead Reading — ${siteName}`,
  description:
    "One month, five cards, a clear path ahead. A written reading of the weeks to come, thoughtfully interpreted and delivered by email within 24 hours.",
};

export default function MonthAheadReadingPage() {
  return <ReadingPresentation reading={monthAhead} commerce={<ReadingOrder reading={monthAhead} />} />;
}
