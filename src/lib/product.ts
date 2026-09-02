"use client";

import { useEffect, useState } from "react";

import { fetchProduct, type ApiProductDetail } from "./api.ts";
import { currencySelection, rememberResolvedCurrency, useCurrency } from "./currency.ts";
import { currentLocale } from "./locale.ts";
import type { Money } from "./price.ts";

/**
 * One product, read by key, and the four states a page that sells it can be in.
 *
 * See `docs/plans/reading-page-live-price.md`. Separate from `products.ts`,
 * which merges the whole catalogue over the homepage's bundled tiles — these
 * share `lib/api.ts` and nothing else, and the questions they answer are not
 * the same one. That file decides which tiles exist; this one decides whether a
 * payment may be offered at all.
 */

/**
 * What the page knows about the thing it is selling.
 *
 * **A discriminated union, and that is the point of it.** `money` exists on
 * `live` and on no other state, so there is no reading a price out of a state
 * that has none: a payment built from a state without money will not compile.
 * The alternative — a nullable `money` beside a `loading` boolean — makes the
 * illegal combination expressible and leaves the check to whoever remembers.
 */
export type ProductOffer =
  /** The fetch is in flight. Reserve the space; offer nothing yet. */
  | { status: "loading" }
  /**
   * The backend priced it. `money` is the currency and the integer minor units
   * it answered with, together, and is the only thing a payment may be built
   * from — see `#37`, which mounts a wallet sheet with exactly this value.
   */
  | { status: "live"; money: Money; product: ApiProductDetail }
  /**
   * The request threw: network, CORS, 5xx. The page keeps its bundled price as
   * copy so it does not look broken, and offers no way to pay it — the bundled
   * string carries no currency and nobody has verified the number today.
   */
  | { status: "unreachable" }
  /**
   * A 404. Unpublished, outside the fixed set of keys, or untranslated — all of
   * them mean somebody withdrew it on purpose. The page stops offering it, the
   * way the homepage drops a tile the catalogue answered without.
   */
  | { status: "withdrawn" };

/**
 * The last thing the backend said, and which product it said it about.
 *
 * **The key travels with the answer** so a stale one cannot outlive the product
 * it was about. `useProduct` keeps what it holds through a failure — that is the
 * rule below — and without the key the thing it kept could be a different
 * reading's price, on a hook whose argument is free to change.
 */
type Answered = { key: string; product: ApiProductDetail | null };

/**
 * The state a response — or the lack of one — puts the page in.
 *
 * Pure, and exported apart from the hook so the table in the plan can be
 * exercised without mounting anything.
 *
 * `undefined` is "no answer yet" and `null` is the backend's 404, which is why
 * they are two values rather than one nullable: collapsing them would make the
 * first paint of every page indistinguishable from a withdrawn product, and
 * those states are opposites.
 *
 * **A failure only decides anything when there is nothing to keep.** An answer
 * already in hand outranks it, so a currency switch the API cannot answer goes
 * on quoting the price that was on screen instead of withdrawing the offer
 * under the visitor's thumb — `lib/catalogue.ts` states the same rule for the
 * catalogue, and this is the page that takes money. The caller passes only what
 * is about the key it is asking for; see `Answered`.
 */
export function resolveOffer(
  answer: ApiProductDetail | null | undefined,
  failed: boolean,
): ProductOffer {
  if (answer === undefined) return { status: failed ? "unreachable" : "loading" };
  if (answer === null) return { status: "withdrawn" };

  return { status: "live", money: answer.price, product: answer };
}

/**
 * The offer for one product key, live once the backend has answered.
 *
 * **Never fetched at build time**, which is not optional here: prices resolve
 * per visitor from their country, so a baked response ships one country's
 * currency to everybody. See the rule at the top of `lib/api.ts`.
 *
 * The first render is always `loading`, which is also what the exported HTML
 * contains — so there is no hydration mismatch, and the state the static file
 * ships is the one that reserves the panel's height rather than one that
 * advertises a price.
 *
 * **A currency switch does not return the page to `loading`, and does not take
 * the offer down when the refetch fails either.** The previous answer is left in
 * place while the new one is in flight and left there if it never lands, so the
 * panel keeps quoting the old price rather than collapsing under a customer's
 * thumb. It is the same rule `lib/catalogue.ts` follows, and the same reason:
 * the price that is about to change is better company than a gap.
 *
 * **Both pieces of state are held against the key they are about**, which is
 * what keeps that rule from leaking one reading's price onto another. `key` is
 * an argument and arguments change; a kept answer that did not remember which
 * product it priced would be kept under the next one too. The precedence used
 * to carry this — a failure outranked every answer — and paid for it on the
 * case above.
 */
export function useProduct(key: string): ProductOffer {
  const { chosen } = useCurrency();
  const [answered, setAnswered] = useState<Answered | undefined>(undefined);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    // Asked for explicitly rather than left to the default, for the reason
    // `useProducts` gives: `formatPrice` formats against `currentLocale()`, and
    // a second language added there but not here would price Spanish copy off
    // an English response.
    //
    // The currency is sent only when the visitor has chosen one. A cold request
    // carries none and is answered by the backend's detection — see
    // `withCurrency` in `lib/api.ts`.
    //
    // **Read from the store, not from the render that scheduled this**, for the
    // reason `useCatalogue` sets out at length: the hydration render is required
    // to report "nothing chosen", so closing over its `chosen` asks cold for
    // everybody and then asks again. It costs more here than it does there. The
    // cold answer's currency is written to `resolved` on the way past, so a
    // returning visitor's stored resolution was being replaced by a detected one
    // — on the page that holds the checkout button, with the offer beside it
    // quoting the wrong currency until the second answer landed.
    fetchProduct(key, {
      locale: currentLocale(),
      currency: currencySelection().chosen ?? undefined,
      signal: controller.signal,
    })
      .then((product) => {
        if (product === null) {
          // Rare and deliberate, and invisible on the page by design — the
          // reading simply stops being for sale. Worth a line, because from the
          // outside that looks identical to a checkout that broke.
          console.warn(`The API has no product for "${key}", so it is not offered for sale.`);
        } else {
          rememberResolvedCurrency(product.price.currency);
        }

        setAnswered({ key, product });
        setFailedKey(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        // Loud here and quiet on the page: the visitor still sees a price, so a
        // dead API looks like a working reading page. Without this line it
        // would look like one to us too.
        console.error(`Could not reach the API for product "${key}".`, error);

        setFailedKey(key);
      });

    return () => controller.abort();
  }, [key, chosen]);

  return resolveOffer(answered?.key === key ? answered.product : undefined, failedKey === key);
}
