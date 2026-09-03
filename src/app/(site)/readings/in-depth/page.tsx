import type { Metadata } from "next";

import { ReadingOrder } from "@/components/reading/ReadingOrder";
import { ReadingPresentation } from "@/components/reading/ReadingPresentation";
import { inDepth } from "@/content/reading-pages";
import { siteName } from "@/content/site";

export const metadata: Metadata = {
  title: `In-Depth Reading — ${siteName}`,
  description:
    "One question, twelve cards, a deeper story revealed. A written reading of the patterns shaping your story, delivered by email within 48 hours.",
};

export default function InDepthReadingPage() {
  return <ReadingPresentation reading={inDepth} commerce={<ReadingOrder reading={inDepth} />} />;
}
