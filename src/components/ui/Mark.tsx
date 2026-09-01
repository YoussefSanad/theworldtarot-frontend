import Image from "next/image";
import type { CSSProperties } from "react";

import { type ImageAsset } from "@/lib/assets";

/**
 * One of the client's frame icons, sized against the panel's container query.
 *
 * **Width in `cqw`, height auto.** The marks are drawn at Figma's own pixel
 * sizes and the frames they sit in are `em` off the label, so a mark pinned to
 * pixels would drift out of proportion at every width but one. The scale the
 * checkout frames share is `px ÷ 6.87 = cqw` — redeem is 52 and asks for
 * `7.57cqw`, gift is 53 and asks for `7.71cqw`, card is 49 and asks for
 * `7.13cqw`, the card that replaces gift is 38 and asks for `5.53cqw`. A new
 * mark derives its number the same way rather than guessing.
 *
 * ## The ceiling, and why the width is a value rather than a class
 *
 * The checkout frames became bounded in pixels on 30 August 2026 — they hold
 * Stripe's 40-55 range so a wallet button can stand at their height — and a
 * mark that is a share of the panel outgrows a box that has stopped growing.
 * `.checkout-option` states the ceiling as `--mark-cap`, which is a fact about
 * that frame and not about marks in general.
 *
 * ~~It was applied as `max-block-size` on the image.~~ **It is applied to the
 * width here from 31 August 2026, and the difference is the whole reason this
 * component changed shape.** A replaced element whose width is set and whose
 * height is capped does not keep its ratio — CSS gives it the width it was
 * told and the height it is allowed, and the picture squashes. The gift box
 * did exactly that across the tablet band, where the panel is wide enough to
 * ask for a mark taller than 55px × 0.667 and the frame refuses it.
 *
 * So nothing here ever sets a height. `--mark-width` is what the panel asks
 * for and `--mark-ratio` turns the frame's height ceiling into a width
 * ceiling; `.mark` takes whichever is smaller and lets the browser derive the
 * height, which is the one arrangement that cannot distort.
 *
 * The width arrives as a value rather than a `w-[…]` class because the two
 * have to meet inside one `min()`. A utility would win the cascade against the
 * ceiling instead of being weighed against it — which is precisely the bug.
 *
 * `alt=""`: every caller puts the label beside it, so the mark is decoration
 * and announcing it would read the same thing twice.
 *
 * Lifted out of `GetMyReading` on 29 August 2026, when Buy Now grew a card mark
 * and became the third caller. It could not import the private copy that lived
 * there — `GetMyReading` imports `BuyNow`, so the arrow only points one way.
 */
export function Mark({ art, width }: { art: ImageAsset; width: string }) {
  return (
    <Image
      src={art.src}
      alt=""
      width={art.width}
      height={art.height}
      className="mark"
      style={{ "--mark-width": width, "--mark-ratio": art.width / art.height } as CSSProperties}
    />
  );
}
