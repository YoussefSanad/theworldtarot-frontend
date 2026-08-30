"use client";

import { useEffect, useMemo, useState } from "react";

import { products as bundledProducts, type Product } from "@/content/home";

import { fetchProducts, type ApiProduct } from "./api";
import { currentLocale } from "./locale";
import { formatPrice } from "./price";

/**
 * The Choose Your Journey tiles, with live copy and live prices merged over the
 * bundled ones.
 *
 * See `docs/plans/products-api-wiring.md`. The short version: the API owns what
 * a tile says, the bundle owns which tiles exist, and they are joined on the
 * product key.
 */

/**
 * Whether a product the API answered without should disappear from the section.
 *
 * **This is the one deliberate judgement in this file**, so it is a named
 * constant rather than an `if` buried below.
 *
 * The agreed fallback is bundled copy, so the homepage never looks broken when
 * the backend is unreachable. That covers one state. A *successful* response
 * that omits a product is a different one: the backend works availability out
 * from the data, so an absent product has been unpublished, or had its copy or
 * price emptied — someone did that on purpose. Falling back to bundled copy
 * there would advertise a withdrawn product at a price nobody is charging and
 * link to a page the backend answers 404 for.
 *
 * The same split `drawCard` already makes between `console.error` for an
 * unreachable API and `console.info` for an honest 404.
 *
 * Set this to `false` to always show all four tiles regardless.
 */
const HIDE_WITHDRAWN = true;

/**
 * Merges an API response over the bundled tiles.
 *
 * Pure, and exported separately from the hook so the rule it implements can be
 * read — and exercised — without mounting anything.
 *
 * `null` means the request has not answered yet, or failed. Both show the
 * bundled tiles untouched: before the answer there is nothing better to show,
 * and after a failure the bundled copy is the whole point of keeping it.
 *
 * An empty array is treated the same way, and deliberately, even though it is
 * a successful response. The backend seeds every product complete and priced,
 * so `API_CONTRACT.md` is explicit that an empty list is a fault rather than a
 * state to design for — every product withdrawn at once is not something
 * anybody does on purpose. Honouring it literally would empty the shop and
 * leave the section as a heading over blank space, which is exactly the
 * "homepage looks broken" outcome the bundled copy exists to prevent.
 */
export function resolveProducts(live: ApiProduct[] | null): Product[] {
  if (!live || live.length === 0) return bundledProducts;

  const byKey = new Map(live.map((product) => [product.key, product]));

  // Driven by the bundled list, not the response, because artwork and links
  // only exist here. An API product with no tile — `in-depth` today — is
  // ignored rather than rendered without a picture.
  return bundledProducts.flatMap((bundled) => {
    const match = byKey.get(bundled.key);

    if (!match) {
      // A tile vanishing from a live homepage is worth a line in the console,
      // whichever way HIDE_WITHDRAWN is set. Withdrawing a product is rare and
      // deliberate, so the likelier causes are a backend that predates the key
      // (`viewing-room-pass` only joined this endpoint on 20 August 2026) or a
      // price emptied for one currency in the admin panel, which drops the
      // product for every country at once. Both look identical on the page:
      // three tiles where there were four, and nothing else.
      console.warn(`No API product matched the bundled tile "${bundled.key}".`);

      return HIDE_WITHDRAWN ? [] : [bundled];
    }

    return [
      {
        ...bundled,
        title: match.name,
        // Empty copy should be impossible — the backend's completeness gate
        // keeps a product with no description out of the response entirely —
        // so this is a belt-and-braces guard, not an expected path.
        subtitle: match.short_description.trim() || bundled.subtitle,
        price: formatPrice(match.price),
      },
    ];
  });
}

/**
 * The tiles to render, live once the backend has answered.
 *
 * **Never fetched at build time**, which is not optional: prices are resolved
 * per visitor from their country, so a baked response ships one country's
 * currency to everybody. See the rule at the top of `lib/api.ts`.
 *
 * Returns the bundled tiles on the first render, which is also what the
 * exported HTML contains, so there is no hydration mismatch and the section is
 * never empty.
 */
export function useProducts(): Product[] {
  const [live, setLive] = useState<ApiProduct[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    // Asked for explicitly rather than left to `fetchProducts`'s default, so
    // the copy and the prices are read in the same language: `formatPrice`
    // already formats against `currentLocale()`, and a second language added
    // there but not here would write Spanish prices under English copy.
    fetchProducts({ locale: currentLocale(), signal: controller.signal })
      .then(setLive)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        // Loud here and invisible to the visitor: the bundled tiles stay on
        // screen, so a broken API looks like a working homepage. Without this
        // line it would look like one to us too.
        console.error("Could not reach the API for products, showing the bundled tiles.", error);
      });

    return () => controller.abort();
  }, []);

  return useMemo(() => resolveProducts(live), [live]);
}
