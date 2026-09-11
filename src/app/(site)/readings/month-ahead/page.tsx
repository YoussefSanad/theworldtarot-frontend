import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { ReadingForSale } from "@/components/reading/ReadingForSale";
import { monthAhead } from "@/content/reading-pages";
import { readingJsonLd } from "@/lib/structured-data";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  path: "/readings/month-ahead/",
  title: "Month Ahead Reading",
  description:
    "One month, five cards, a clear path ahead. A written reading of the weeks to come, thoughtfully interpreted and delivered by email within 24 hours.",
});

export default function MonthAheadReadingPage() {
  return (
    <>
      <JsonLd
        data={readingJsonLd({
          path: "/readings/month-ahead/",
          name: monthAhead.title,
          description: monthAhead.tagline.join(" "),
          price: monthAhead.price,
        })}
      />
      <ReadingForSale productKey={monthAhead.productKey} />
    </>
  );
}
