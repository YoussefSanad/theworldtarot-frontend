import Image from "next/image";
import Link from "next/link";

import { Divider } from "@/components/ui/Divider";
import type { Product } from "@/content/home";

/**
 * A Choose Your Journey tile.
 *
 * The tile is a container, and its type and insets are sized in `cqw`, so the
 * whole composition keeps the proportions Figma drew at 392px wide however many
 * columns the grid is showing.
 *
 * The framed art and the price label share one link so the whole card navigates
 * like the CTA without nesting interactive elements.
 *
 * Nothing here moves on hover — the tile answers with light only. The grid runs
 * the tiles edge to edge, so anything that grows has to overlap its neighbours
 * to do it.
 *
 * Width is owned by whatever places the tile, not the tile itself: below `sm`
 * that's a carousel slide (see `ChooseYourJourney`/`ProductCarousel`), from
 * `sm` it's two thirds of a two-column cell, and from `lg` it's a whole quarter
 * column — the `cqw` sizing means all three read as the same composition.
 */
export function ProductCard({ product }: { product: Product }) {
  const label = `${product.price} ${product.action}`;

  return (
    <article className="group @container flex w-full max-w-[449px] flex-col items-center gap-[3.4cqw] sm:mx-auto sm:w-[66.7%] lg:w-full lg:max-w-none">
      <Link
        href={product.href}
        className="flex w-full flex-col items-center gap-[4.2cqw] no-underline"
        aria-label={label}
      >
        <div className="stack aspect-[392/779] w-full transition-[filter] duration-300 group-hover:drop-shadow-[0_0_18px_rgba(228,196,106,0.35)]">
          <div className="flex items-end justify-center pb-[4.85%]">
            <Image
              src={product.image.src}
              alt=""
              width={product.image.width}
              height={product.image.height}
              className="w-[94.1%] transition-[filter] duration-300 group-hover:brightness-110"
            />
          </div>

          {/*
            The border art has to paint over the photo, which as replaced content
            would otherwise draw above a later sibling's background. It is its own
            layer rather than the type container's background so the hover tint
            lands on the frame and leaves the type it frames alone.
          */}
          <span
            aria-hidden
            className="tile-frame z-10 bg-[#dfc089] transition-[background-color,filter] duration-300 group-hover:bg-[#fae7b7] group-hover:drop-shadow-[0_0_6px_rgba(228,196,106,0.6)]"
          />

          <div className="z-10 flex flex-col items-center px-[3%] pt-[12%]">
            <h3 className="text-center text-[9.77cqw] leading-none text-gold-soft">{product.title}</h3>

            {/*
              `text-balance` rather than the two hard-wrapped lines this used to
              render. The copy arrives from the API as one sentence, and where it
              breaks is a layout decision this tile has to make four times over —
              it is laid out at a carousel slide's width, two thirds of a
              two-column cell, a full quarter column, and its own 449px cap. A
              break baked into the copy would be right at one of those and ragged
              at the rest, and would have to be re-typed by every translator in a
              language where it balances differently.

              `max-w-[19ch]` is what makes it two lines rather than one.
              **`balance` only redistributes text that already wraps — it never
              forces a wrap**, so without a measure the shortest subtitle ("One
              Question, Three Cards") sat on a single line while the longer three
              broke, and the row lost its alignment. The measure guarantees the
              break; balance puts it in the right place.

              In `ch` rather than `cqw` so it is tied to the type: the font size
              is itself `cqw`, so this tracks the tile's width automatically and
              survives the type being retuned.

              **19ch is not arbitrary — it is the middle of a measured window.**
              Advance widths taken from gill-sans-regular.otf, where 1ch is
              exactly 0.5em:

                >= 16.55ch  or "Complete Cinematic" will not fit on one line and
                            the Viewing Room tile breaks into three
                <  22.61ch  or "One Question, Three Cards" fits on one line and
                            never wraps at all

              Both failures have already happened once each. If you retune this,
              stay inside that window, and re-measure it if the copy changes —
              the bounds come from the longest desired first line and the
              shortest full subtitle respectively.

              `whitespace-pre-line` keeps a newline working as a deliberate
              override for when a specific break really is wanted. Browsers
              without `text-wrap: balance` just wrap normally.

              `line-clamp-2` is the floor under all of that. The measure above
              guarantees two lines for the four subtitles in the bundle, but the
              copy is the client's from the first edit onward and a translation
              is longer again — a third line pushes this block and the divider
              23.5px down over the artwork, and one three-line tile beside three
              two-line ones breaks the row's shared baseline, which is the whole
              thing the measure exists to hold. Clamping makes that structural
              rather than a comment asking the next person to re-measure.
            */}
            <p className="mt-[1.3%] line-clamp-2 max-w-[19ch] text-center text-[7.99cqw] leading-none text-balance whitespace-pre-line text-cream">
              {product.subtitle}
            </p>

            <Divider variant="tile" className="-mt-[3.8%]" />
          </div>
        </div>

        {/*
          `group-hover:shadow-(--glow-gold-strong) group-hover:brightness-105`
          repeat `.btn-gold:hover`'s own values (globals.css) so the whole tile
          triggers the button's glow, not just hovering the button itself.
          Keep the two in sync — tuning one won't update the other.
        */}
        <span className="btn btn-gold w-[77.8%] px-[4%] py-[0.78em] text-[5.33cqw] leading-none font-bold tracking-[0.01em] text-slate [--btn-hover-scale:1] group-hover:shadow-(--glow-gold-strong) group-hover:brightness-105">
          {label}
        </span>
      </Link>
    </article>
  );
}
