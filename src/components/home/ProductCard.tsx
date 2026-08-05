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

            <p className="mt-[1.3%] text-center text-[7.99cqw] leading-none text-cream">
              {product.subtitle.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>

            <Divider variant="tile" className="-mt-[3.8%]" />
          </div>
        </div>

        <span className="btn btn-gold w-[77.8%] px-[4%] py-[0.78em] text-[5.33cqw] leading-none font-bold tracking-[0.01em] text-slate [--btn-hover-scale:1]">
          {label}
        </span>
      </Link>
    </article>
  );
}
