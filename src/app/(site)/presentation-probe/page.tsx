import type { Metadata } from "next";

import { ReadingPresentation } from "@/components/reading/ReadingPresentation";
import { monthAhead } from "@/content/reading-pages";

export const metadata: Metadata = {
  // Every word on it is a real reading page's copy, so it is exactly the
  // duplicate a crawler should never be offered a second address for.
  robots: { index: false, follow: false },
};

/**
 * The throwaway proof that the presentation half mounts without the commerce
 * half: `ReadingPresentation` with an empty slot, which is what F1's gate asks
 * for and what `ClosingSaying`'s `action={null}` was taught for. What it is a
 * page of is that component's docblock, not repeated here.
 *
 * **Deleted when `/redeem/` lands** (#74), which mounts it for real. The
 * condition is #79 rather than this comment: `docs/plans/checkout-review-fixes.md`
 * §9 settled that for `/checkout-probe/` — a deletion that lives in a comment
 * gets read, and one that lives in a ticket gets closed. Same bargain as that
 * probe otherwise, and a quieter one: this route places no order, writes
 * nothing and takes no input. `DEPLOYMENT.md` carries both.
 *
 * `month-ahead` because it is the frame this page was drawn from. Nothing here
 * is specific to it — the probe takes a `ReadingPage` like every other caller.
 */
export default function PresentationProbePage() {
  return <ReadingPresentation reading={monthAhead} />;
}
