import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { ReadingForSale } from "@/components/reading/ReadingForSale";
import { inDepth } from "@/content/reading-pages";
import { readingJsonLd } from "@/lib/structured-data";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  path: "/readings/in-depth/",
  title: "In-Depth Reading",
  description:
    "One question, twelve cards, a deeper story revealed. A written reading of the patterns shaping your story, delivered by email within 48 hours.",
});

export default function InDepthReadingPage() {
  return (
    <>
      <JsonLd
        data={readingJsonLd({
          path: "/readings/in-depth/",
          name: inDepth.title,
          description: inDepth.tagline.join(" "),
          price: inDepth.price,
        })}
      />
      <ReadingForSale productKey={inDepth.productKey} />
    </>
  );
}
