import Image from "next/image";

import { type ImageAsset } from "@/lib/assets";
import { cn } from "@/lib/cn";

/**
 * One of the client's frame icons, sized against the panel's container query.
 *
 * **Width in `cqw`, height `auto`.** The marks are drawn at Figma's own pixel
 * sizes and the frames they sit in are `em` off the label, so a mark pinned to
 * pixels would drift out of proportion at every width but one. The scale the
 * three checkout frames share is `px ÷ 6.87 = cqw` — redeem is 52 and asks for
 * `7.57cqw`, gift is 53 and asks for `7.71cqw`, card is 49 and asks for
 * `7.13cqw`. A new mark derives its number the same way rather than guessing.
 *
 * `alt=""`: every caller puts the label beside it, so the mark is decoration
 * and announcing it would read the same thing twice.
 *
 * Lifted out of `GetMyReading` on 29 August 2026, when Buy Now grew a card mark
 * and became the third caller. It could not import the private copy that lived
 * there — `GetMyReading` imports `BuyNow`, so the arrow only points one way.
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
