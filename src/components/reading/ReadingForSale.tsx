"use client";

import { ReadingOrder } from "@/components/reading/ReadingOrder";
import { ReadingPresentation } from "@/components/reading/ReadingPresentation";
import { readingPageFor } from "@/content/reading-pages";

/**
 * A reading's page with `ReadingOrder` in the slot, which is what the three
 * routes under `app/(site)/readings/` render.
 *
 * **It takes a product key rather than a `ReadingPage`, and that is why it
 * exists.** A route is a server component, so a `ReadingPage` handed down from
 * one was resolved once, at build time, in English, and reached the browser as
 * data. Every client module resolves its own copy in the visitor's language, so
 * a Spanish visit drew Spanish chrome around an English page: "Tu Lectura" over
 * English items, and the tagline, delivery line, testimonial and closing line
 * with them. A key is the same in every language, and the page looked up here
 * comes from this bundle's copy. See `LanguageBoundary`.
 *
 * An unknown key is a route pointing at a page that does not exist, which is a
 * fault in this repository rather than an answer from the backend, so it
 * throws, and the export fails to build rather than shipping an empty page.
 */
export function ReadingForSale({ productKey }: { productKey: string }) {
  const reading = readingPageFor(productKey);
  if (!reading) throw new Error(`No reading page sells "${productKey}".`);

  return <ReadingPresentation reading={reading} commerce={<ReadingOrder reading={reading} />} />;
}
