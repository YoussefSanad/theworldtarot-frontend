import { canonicalFor, SITE_NAME } from "./seo.ts";

/**
 * Schema.org objects, as plain data.
 *
 * **Built here rather than inline in a page** so the shapes are testable — a
 * malformed `Product` is invisible on the page and silently ignored by every
 * crawler, which is the worst combination a thing can have.
 */

export type ReadingSeo = {
  /** The reading's own route, slashed. */
  path: string;
  name: string;
  description: string;
  /** The bundled display string, `"$75"`. See the note on currency below. */
  price: string;
};

/**
 * The bare number from a display price.
 *
 * **Refuses anything that is not one.** A `Product` whose `price` reads "Free"
 * or "" is worse than no structured data: it is a rich result quoting a figure
 * nobody is charging, which is the failure the **Money** discipline exists to
 * prevent, in the one place nobody would think to look at it.
 */
function priceAmount(display: string): string {
  const digits = display.replace(/[^0-9.]/g, "");

  if (!/^\d+(\.\d+)?$/.test(digits)) {
    throw new Error(`"${display}" is not a price, so no Offer can be built from it.`);
  }

  return digits;
}

/**
 * One written reading.
 *
 * **`priceCurrency` is USD and does not follow the currency selector.** This is
 * baked into the export at build time, while a visitor may be reading prices in
 * EUR from `lib/currency.ts`. The two cannot agree — there is one document and
 * many visitors — so this states the canonical figure from
 * `content/reading-pages.ts`, which is the one the backend seeds in USD.
 */
export function readingJsonLd({ path, name, description, price }: ReadingSeo) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url: canonicalFor(path),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      price: priceAmount(price),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: canonicalFor(path),
    },
  } as const;
}

/** The house itself, on the home page only. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: canonicalFor("/"),
    logo: `${canonicalFor("/")}og-image.jpg`,
  } as const;
}
