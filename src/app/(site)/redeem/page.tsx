import type { Metadata } from "next";
import { Suspense } from "react";

import { RedeemGift } from "@/components/redeem/RedeemGift";
import { redeemCopy } from "@/content/redeem";
import { siteName } from "@/content/site";

/**
 * `/redeem/` — one page for every reading, and the only place a **gift code**
 * is entered.
 *
 * `trailingSlash` in next.config.mjs makes the export `/redeem/`, so that is
 * the address the backend builds the recipient's link from. The code rides in a
 * query parameter because this is a static export and a path segment per code
 * is not a thing that can be pre-rendered; see
 * `docs/adr/0003-redemption-is-a-page-of-its-own.md`.
 *
 * **Indexable, unlike the confirmation and the account pages.** What the export
 * contains is the code-entry screen and nothing else — the reading's name, copy
 * and artwork arrive from a lookup that happens in the browser — so no reading
 * page is duplicated at a second address here. That duplication is what put
 * `noindex` on `/presentation-probe/`, which served `month-ahead`'s copy from
 * the export itself and went at #79 the day this route landed. A search result
 * landing on "enter your gift code" is a page that works.
 */
export const metadata: Metadata = {
  title: `${redeemCopy.pageTitle} — ${siteName}`,
  description:
    "Enter the code from your email to open the reading you have been given, and ask your question.",
};

export default function RedeemPage() {
  /*
    The code is read with `useSearchParams`, which is client-side only under a
    static export, so it sits inside a Suspense boundary rather than making the
    route dynamic — the same shape the confirmation and the password pages use.

    The fallback is blank: the first thing there is anything true to say with is
    the component's own screen, and it renders as soon as the params resolve.
  */
  return (
    <Suspense fallback={null}>
      <RedeemGift />
    </Suspense>
  );
}
