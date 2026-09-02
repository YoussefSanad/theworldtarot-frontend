"use client";

import Image from "next/image";
import Link from "next/link";

import { Divider } from "@/components/ui/Divider";
import { Phrase } from "@/components/ui/Phrase";
import { readingAction, type Reading } from "@/content/readings";
import { ornaments } from "@/lib/assets";
import { useReadingPrice } from "@/lib/reading-prices";

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
 * appearing over the picture the way a background colour would. The frost
 * sits behind the photograph (see `.reading-card__frost`) so the picture
 * itself stays sharp.
 *
 * All of it is `.panel-hover`, defined once in globals.css and shared with the
 * signature panel and the gift band, so the five of them cannot drift apart.
 *
 * **A client component, for the reason `ChooseYourJourney` is one**: the price
 * is resolved per visitor and can only be read in the browser. Three of these
 * render together and the signature panel above them prices the same way — all
 * four read one catalogue answer, not four.
 */
export function ReadingCard({ reading }: { reading: Reading }) {
  const price = useReadingPrice(reading.productKey, reading.price);
  const label = `${price} ${readingAction}`;
  const fullTitle = `${reading.title}${reading.titleTail ?? ""}`;

  return (
    <Link href={reading.href} aria-label={`${fullTitle} — ${label}`} className="reading-card panel-hover no-underline">
      <span aria-hidden className="reading-card__frost panel-hover__surface" />
      <span aria-hidden className="reading-card__edge panel-hover__frame" />

      <span className="reading-card__media">
        <Image
          src={reading.image.src}
          alt={reading.imageAlt}
          width={reading.image.width}
          height={reading.image.height}
          className="photo-fade panel-hover__photo h-full w-full object-cover"
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

        Top-aligned at `lg`, not centred. The copy row is the `1fr` that lets
        three cards abreast finish their prices together, so the card whose
        body runs to two lines rather than three has a line of slack to place.
        Centring hands half of it to the top, and In-Depth's title sits lower
        than its neighbours'; starting at the top puts all of it above the
        price, where the row was already carrying it.
      */}
      <div className="reading-card__copy flex flex-col items-center justify-center px-[2cqw] pt-[8.52cqw] pb-[4.59cqw] text-center lg:px-0 lg:justify-start lg:pt-[5.19cqw] lg:pb-0">
        <h3 className="font-display text-[7.87cqw] leading-none tracking-[-0.01em] text-cream lg:text-[9.96cqw]">
          {reading.title}
          {/* Added back at `lg`; the mobile card drops it so the title holds one line. */}
          {reading.titleTail ? <span className="hidden lg:inline">{reading.titleTail}</span> : null}
        </h3>

        <Divider variant="hero" className="w-[52cqw] max-w-none lg:-mt-[1.66cqw] lg:w-[92.95cqw]" />

        {/*
          Figma squeezes `discover what lies ahead` to hold one line and leaves
          the two shorter subtitles alone; the squeeze goes on all three so the
          row reads as one setting. It wraps to two lines in the mobile row,
          which is what the mockup draws, so `nowrap` is a desktop-only rule —
          and safe there because the type is `cqw`: what fits at 482px fits at
          every width, both sides of that comparison scaling together.
        */}
        <p className="mt-[2.95cqw] font-serif text-[5.9cqw] leading-[1.11] tracking-[-0.05em] text-gold lg:mt-[1.66cqw] lg:text-[7.47cqw] lg:leading-none lg:whitespace-nowrap">
          {reading.subtitle}
        </p>

        {/*
          Dropped below `lg`. The client's mobile card gives the copy a 169px
          column in a 135px-tall frame, which this line cannot live in; the
          subtitle above carries the gist there. It stays in the markup rather
          than the mobile branch of a fork, so there is one source of copy.

          Phrases rather than a measure, for the reason in `readings.ts`: the
          width that lands on her three-card break is a seven-pixel window.
        */}
        <p className="mt-[3.32cqw] hidden font-light text-[7.47cqw] leading-[1.056] text-cream lg:block">
          <Phrase parts={reading.body} />
        </p>
      </div>

      {/* Box shared with the signature and closing buttons; see `.readings-cta`. */}
      <span className="reading-card__cta panel-hover__cta btn btn-gold readings-cta lg:py-[0.667em] lg:text-[6.22cqw]">
        {label}
      </span>
    </Link>
  );
}
