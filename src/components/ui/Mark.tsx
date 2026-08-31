import Image from "next/image";

import { type ImageAsset } from "@/lib/assets";
import { cn } from "@/lib/cn";

/**
 * One of the client's frame icons, sized against the panel's container query.
 *
 * **Width in `cqw`, height `auto`.** The marks are drawn at Figma's own pixel
 * sizes and the frames they sit in are `em` off the label, so a mark pinned to
 * pixels would drift out of proportion at every width but one. The scale the
 * checkout frames share is `px ÷ 6.87 = cqw` — gift is 53 and asks for
 * `7.71cqw`, the self-reading mark it turns into is 38 and asks for `5.53cqw`,
 * card is 49 and asks for `7.13cqw`. A new mark derives its number the same way
 * rather than guessing. (Redeem was a fourth — 52, `7.57cqw` — until #62 took
 * its frame off the panel on 31 August 2026.)
 *
 * **A ceiling arrived on 30 August 2026, and it is not stated here.** The
 * checkout frames became bounded in pixels that day — they hold Stripe's 40-55
 * range so a wallet button can stand at their height — and a mark that is a
 * share of the panel outgrows a box that has stopped growing. `.checkout-option
 * img` in `globals.css` caps the height at the proportion Figma draws, and it
 * lives there rather than here because it is a fact about that frame and not
 * about marks in general. This component still sets no height at all: the
 * ceiling clips one, and the browser holds the ratio.
 *
 * `alt=""`: every caller puts the label beside it, so the mark is decoration
 * and announcing it would read the same thing twice.
 *
 * Lifted out of `GetMyReading` on 29 August 2026, when the checkout button grew a
 * card mark
 * and became the third caller. It could not import the private copy that lived
 * there — `GetMyReading` imports `HostedCheckoutButton`, so the arrow only
 * points one way.
 */
export function Mark({ art, className }: { art: ImageAsset; className: string }) {
  return (
    <Image
      src={art.src}
      alt=""
      width={art.width}
      height={art.height}
      className={cn("h-auto max-w-none shrink-0", className)}
    />
  );
}
