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
 */
export function ProductCard({ product }: { product: Product }) {
  const label = `${product.price} ${product.action}`;

  return (
    <article className="group @container mx-auto flex w-[66.7%] max-w-[449px] flex-col items-center gap-[1.7%] lg:w-full lg:max-w-none">
      <Link
        href={product.href}
        className="flex w-full flex-col items-center gap-[1.7%] no-underline"
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
            would otherwise draw above a later sibling's background.
          */}
          <div className="z-10 flex flex-col items-center bg-[url('/figma/product-frame.webp')] bg-[length:100%_100%] bg-no-repeat px-[3%] pt-[12%]">
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

        <span className="btn btn-gold w-[77.8%] px-[4%] py-[0.78em] text-[5.33cqw] leading-none font-bold tracking-[0.01em] text-slate">
          {label}
        </span>
      </Link>
    </article>
  );
}
