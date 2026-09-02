"use client";

import type { ApiProduct } from "./api.ts";
import { useCatalogue } from "./catalogue.ts";
import { formatPrice } from "./price.ts";

/**
 * What a readings-index card prints where its price goes.
 *
 * Separate from `resolveProducts`, which answers a different question. That one
 * decides **which** homepage tiles exist and drops a product the catalogue
 * answered without; this one decides what **one** card says and keeps the card
 * either way.
 *
 * **The difference is deliberate.** A withdrawn reading keeps its card here and
 * its bundled price with it, because the page that card links to asks for the
 * key itself and already refuses to sell it — `resolveOffer` answers
 * `withdrawn` and the panel takes the payment down. Hiding the card as well
 * would be a second, weaker copy of that rule, and the index is a page of
 * artwork rather than a shop window.
 *
 * The bundled string is USD for everyone, including a visitor being priced in
 * pounds, because USD is the only currency the bundle can carry. It is fallback
 * copy and it never funds a payment: only `ProductOffer`'s `live` state carries
 * **Money**, and that state comes from the backend.
 */
export function resolveReadingPrice(
  live: ApiProduct[] | null,
  productKey: string,
  bundled: string,
): string {
  const match = live?.find((product) => product.key === productKey);

  return match ? formatPrice(match.price) : bundled;
}

/**
 * The price for one card, live once the backend has answered.
 *
 * Every card on the page calls this and they share one `/products` call between
 * them — the fetch is `lib/catalogue.ts`'s and is asked for once per currency,
 * however many surfaces read it.
 */
export function useReadingPrice(productKey: string, bundled: string): string {
  return resolveReadingPrice(useCatalogue(), productKey, bundled);
}
