import Image from "next/image";
import Link from "next/link";

import { Divider } from "@/components/ui/Divider";
import { Phrase } from "@/components/ui/Phrase";
import { readingAction, type Reading } from "@/content/readings";
import { ornaments } from "@/lib/assets";

/**
 * One of the three traditional readings, in either of the two forms the client
 * drew for it.
 *
 * At `lg` and up it is the desktop frame: a column of photograph, copy and
 * price, all inside the border, three abreast. Below that it is the mobile
 * mockup's row — photograph left, copy right — with the price outside the
 * frame and full width beneath it, and the descriptive line dropped, which is
 * what makes that 135px-tall card possible.
 *
 * The construction that lets one DOM be both is in globals.css: the border is
 * a grid item rather than a box around the content, so it can span the price
 * at one width and stop short of it at another. Everything is sized in `cqw`
 * off the card's own box, as `ProductCard` is on the homepage, so each form
 * holds the proportions Figma drew it at — 305px wide on the phone, 482px on
 * the desktop — however many columns the row is showing.
 *
 * The photograph dissolves into the card along whichever edge meets the copy:
 * rightwards in the row, downwards in the column. See `.photo-fade`.
 *
 * Hover frosts the parlour behind the card rather than filling it. The panel
 * carries no background of its own, so a few pixels of blur settle that room
 * behind the copy and let the gold come forward, without a tinted plate
 * appearing over the picture the way a background colour would. It is set at
 * `blur(0px)` at rest rather than left as `none`, because `none` is not a
 * blur radius and the pair would snap instead of easing. The frost sits
 * behind the photograph (see `.reading-card__frost`) so the picture itself
 * stays sharp.
 */
export function ReadingCard({ reading }: { reading: Reading }) {
  const label = `${reading.price} ${readingAction}`;
  const fullTitle = `${reading.title}${reading.titleTail ?? ""}`;

  return (
    <Link href={reading.href} aria-label={`${fullTitle} — ${label}`} className="reading-card group no-underline">
      <span
        aria-hidden
        className="reading-card__frost backdrop-blur-[0px] transition-[backdrop-filter] duration-300 group-hover:backdrop-blur-[2px]"
      />
      <span aria-hidden className="reading-card__edge transition-[box-shadow] duration-300 group-hover:shadow-(--glow-gold)" />

      <span className="reading-card__media">
        <Image
          src={reading.image.src}
          alt={reading.imageAlt}
          width={reading.image.width}
          height={reading.image.height}
          className="photo-fade h-full w-full object-cover transition-[filter] duration-300 group-hover:brightness-110"
        />
      </span>

      <Image
        src={ornaments.trioSmall.src}
        alt=""
        width={ornaments.trioSmall.width}
        height={ornaments.trioSmall.height}
        className="reading-card__crest h-auto max-w-none lg:hidden"
      />
      <Image
        src={ornaments.trio.src}
        alt=""
        width={ornaments.trio.width}
        height={ornaments.trio.height}
        className="reading-card__crest hidden h-auto max-w-none lg:block"
      />

      {/*
        Her mobile card sets the copy 26px down from the frame's top and leaves
        14px under it — 8.52% and 4.59% of the 305px she draws it at.
      */}
      <span className="reading-card__copy flex flex-col items-center justify-center px-[2cqw] pt-[8.52cqw] pb-[4.59cqw] text-center lg:px-0 lg:pt-[5.19cqw] lg:pb-0">
        <span className="font-display text-[7.87cqw] leading-none tracking-[-0.01em] text-cream lg:text-[9.96cqw]">
          {reading.title}
          {/* Added back at `lg`; the mobile card drops it so the title holds one line. */}
          {reading.titleTail ? <span className="hidden lg:inline">{reading.titleTail}</span> : null}
        </span>

        <Divider variant="hero" className="w-[52cqw] max-w-none lg:-mt-[1.66cqw] lg:w-[92.95cqw]" />

        {/*
          Figma squeezes `discover what lies ahead` to hold one line and leaves
          the two shorter subtitles alone; the squeeze goes on all three so the
          row reads as one setting. It wraps to two lines in the mobile row,
          which is what the mockup draws, so `nowrap` is a desktop-only rule —
          and safe there because the type is `cqw`: what fits at 482px fits at
          every width, both sides of that comparison scaling together.
        */}
        <span className="mt-[2.95cqw] font-serif text-[5.9cqw] leading-[1.11] tracking-[-0.05em] text-gold lg:mt-[1.66cqw] lg:text-[7.47cqw] lg:leading-none lg:whitespace-nowrap">
          {reading.subtitle}
        </span>

        {/*
          Dropped below `lg`. The client's mobile card gives the copy a 169px
          column in a 135px-tall frame, which this line cannot live in; the
          subtitle above carries the gist there. It stays in the markup rather
          than the mobile branch of a fork, so there is one source of copy.

          Phrases rather than a measure, for the reason in `readings.ts`: the
          width that lands on her three-card break is a seven-pixel window.
        */}
        <span className="mt-[3.32cqw] hidden font-light text-[7.47cqw] leading-[1.056] text-cream lg:block">
          <Phrase parts={reading.body} />
        </span>
      </span>

      {/*
        The glow duplicates `.btn-gold:hover`'s own values so the whole card
        lights the button rather than only pointing at the button — the same
        duplicate, and the same warning about keeping the two in step, as
        `ProductCard` carries.
      */}
      <span className="reading-card__cta btn btn-gold w-full px-[0.9em] py-[0.72em] text-[5.9cqw] leading-none [--btn-hover-scale:1] group-hover:shadow-(--glow-gold-strong) group-hover:brightness-105 lg:w-fit lg:max-w-full lg:py-[0.667em] lg:text-[6.22cqw]">
        {label}
      </span>
    </Link>
  );
}
