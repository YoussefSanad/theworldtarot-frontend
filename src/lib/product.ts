"use client";

import { useEffect, useState } from "react";

import { fetchProduct, type ApiProductDetail } from "./api.ts";
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
 * The state a response — or the lack of one — puts the page in.
 *
 * Pure, and exported apart from the hook so the table in the plan can be
 * exercised without mounting anything.
 *
 * `undefined` is "no answer yet" and `null` is the backend's 404, which is why
 * they are two values rather than one nullable: collapsing them would make the
 * first paint of every page indistinguishable from a withdrawn product, and
 * those states are opposites.
 */
export function resolveOffer(
  answer: ApiProductDetail | null | undefined,
  failed: boolean,
): ProductOffer {
  if (failed) return { status: "unreachable" };
  if (answer === undefined) return { status: "loading" };
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
 */
export function useProduct(key: string): ProductOffer {
  const [answer, setAnswer] = useState<ApiProductDetail | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    // Asked for explicitly rather than left to the default, for the reason
    // `useProducts` gives: `formatPrice` formats against `currentLocale()`, and
    // a second language added there but not here would price Spanish copy off
    // an English response.
    fetchProduct(key, { locale: currentLocale(), signal: controller.signal })
      .then((product) => {
        if (product === null) {
          // Rare and deliberate, and invisible on the page by design — the
          // reading simply stops being for sale. Worth a line, because from the
          // outside that looks identical to a checkout that broke.
          console.warn(`The API has no product for "${key}", so it is not offered for sale.`);
        }

        setAnswer(product);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        // Loud here and quiet on the page: the visitor still sees a price, so a
        // dead API looks like a working reading page. Without this line it
        // would look like one to us too.
        console.error(`Could not reach the API for product "${key}".`, error);

        setFailed(true);
      });

    return () => controller.abort();
  }, [key]);

  return resolveOffer(answer, failed);
}
