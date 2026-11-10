"use client";

import type { ApiProduct } from "./api.ts";
import { useCatalogue } from "./catalogue.ts";
import { formatPrice, type Money } from "./price.ts";

/** The backend's key for the pass. The same string the homepage tile keys to. */
export const PASS = "viewing-room-pass";

/**
 * The paywall's price line, with the live price in it.
 *
 * ## Why this exists at all
 *
 * The panel used to print `"$29 — One-time payment"` from the bundle while the
 * checkout beside it charged whatever the backend holds for `viewing-room-pass`
 * in the visitor's currency. Those two can disagree — the page says `$29` and
 * the buyer is charged `£24`, or is charged a changed price in the same
 * currency — and the line is directly above the button that takes the money.
 * The reading pages have never had this problem because their cards price off
 * `/products` (`lib/reading-prices.ts`); the pass now does the same.
 *
 * ## Why it is not `useReadingPrice`
 *
 * **The line is not a price; it is a sentence with a price in it.** A reading
 * card prints `$120` and nothing else, so its resolver can return the whole
 * cell. Here `— One-time payment` has to survive the substitution, and the
 * suffix is the client's copy while the number is the backend's. So the content
 * carries the two apart (`panel.price`, `panel.priceNote`) and this joins them.
 *
 * `formatPrice` and the `null`-keeps-the-bundled-string rule are shared with
 * the readings, because the fallback question is the same one: before an answer
 * lands there is nothing better to print, and after a failure the bundled copy
 * is the reason it was kept.
 */

/**
 * The live price for the pass, or `null` when the catalogue cannot name one.
 *
 * Pure, and separate from the hook so the table below can be exercised without
 * mounting anything.
 *
 * `null` covers three cases that all print the bundled string: no answer yet, a
 * failed request, and a successful answer that omits the pass. The third is the
 * homepage's rule, not the readings index's — an omitted product has been
 * withdrawn on purpose — but the *panel* does not need to act on the difference
 * here, because the thing that takes the offer down is `useProduct(PASS)` in
 * `PaymentPanel`, which asks for the key itself and answers `withdrawn`. This
 * only decides what the sentence says.
 *
 * An empty array is a fault rather than an empty shop, as `resolveProducts`
 * explains at length, and falls out of the same `find`.
 */
export function resolvePassPrice(live: ApiProduct[] | null): Money | null {
  return live?.find((product) => product.key === PASS)?.price ?? null;
}

/**
 * The price line, formatted: `"$29 — One-time payment"`.
 *
 * `price` is the bundled price string and stands until the backend names one;
 * `note` is the client's copy and is never substituted.
 */
export function resolvePassPriceLine(
  live: ApiProduct[] | null,
  bundled: string,
  note: string,
): string {
  const money = resolvePassPrice(live);

  return `${money ? formatPrice(money) : bundled}${note}`;
}

/**
 * The paywall's price line, live once the backend has answered.
 *
 * Both screens of the panel call this and they share one `/products` call
 * between them — and with the homepage's tiles, which key to the same product.
 * `lib/catalogue.ts` owns the fetch and asks once per currency however many
 * surfaces read it.
 */
export function usePassPriceLine(bundled: string, note: string): string {
  return resolvePassPriceLine(useCatalogue(), bundled, note);
}

/**
 * The same line built from money already in hand.
 *
 * `PaymentPanel` holds a `ProductOffer` for the pass, and its `live` state
 * carries the `Money` the checkout below it is built from — so on that screen
 * the line is formatted from *that*, rather than from a second lookup that
 * could answer differently. The quoted price and the charged price then come
 * from one value, which is the whole point of the change.
 */
export function passPriceLineFrom(money: Money, note: string): string {
  return `${formatPrice(money)}${note}`;
}
