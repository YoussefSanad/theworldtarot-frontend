import Image from "next/image";
import type { ReactNode } from "react";

import { OrnateFrame } from "@/components/ui/OrnateFrame";
import { ornaments, readingPageArtwork } from "@/lib/assets";
import { cn } from "@/lib/cn";

/**
 * One of the two tall panels a reading page is built out of.
 *
 * Both carry the same three marks astride the top edge — a stud a fifth of the
 * way in from either end, and something in the middle — and differ in what the
 * middle one is and whether the border makes room for it. The left panel's
 * moon sits in a gap the border opens to exactly its own box; the right
 * panel's trio sits on an unbroken line. That is the whole difference between
 * them, so it is a prop rather than two components.
 *
 * Everything else comes from `OrnateFrame`: the `@container` the panel's
 * horizontal measurements are `cqw` off, the 2px line, the corner, and the
 * clip that holds anything inside to the frame's own curve.
 */
export function ReadingPanel({
  moon = false,
  className,
  bodyClassName,
  children,
}: {
  /** Opens the top border for the crescent, as the client draws the left panel. */
  moon?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const studs = (
    <>
      <Stud />
      {moon ? null : (
        <Image
          src={ornaments.trioSmall.src}
          alt=""
          width={ornaments.trioSmall.width}
          height={ornaments.trioSmall.height}
          /* 26px on the 686px panel. The same crop the readings cards wear. */
          className="w-[3.79cqw] max-w-none shrink-0"
        />
      )}
      <Stud mirrored />
    </>
  );

  if (!moon) {
    return (
      <OrnateFrame variant="column" marks={studs} className={className} bodyClassName={bodyClassName}>
        {children}
      </OrnateFrame>
    );
  }

  return (
    <OrnateFrame
      variant="column"
      marks={studs}
      legendMark
      legend={
        <Image
          src={readingPageArtwork.moon.src}
          alt=""
          width={readingPageArtwork.moon.width}
          height={readingPageArtwork.moon.height}
          /*
            99px on the 687px panel — and it is this width that opens the
            border, since the gap is the legend's own grid column. Figma sets
            the crescent 6.5px above the line rather than on it, which is
            0.95% of the panel; the lift says so in the panel's own terms so it
            survives the panel getting narrower.
          */
          className="w-[14.41cqw] max-w-none shrink-0 mt-[-0.95cqw]"
        />
      }
      className={className}
      /*
        The body's top padding is the caller's, and has to be: `.ornate-frame--open`
        sizes it off the legend's *type*, which a mark does not have. Whatever
        it is set to must clear the half of the crescent that hangs below the
        line — 7.79cqw — and must be `cqw` to keep clearing it, since the moon
        scales with the panel and a `vw` padding does not.
      */
      bodyClassName={bodyClassName}
    >
      {children}
    </OrnateFrame>
  );
}

/** The cluster on the top edge, drawn once and flipped for the far end. */
function Stud({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <Image
      src={ornaments.stud.src}
      alt=""
      width={ornaments.stud.width}
      height={ornaments.stud.height}
      className={cn("w-[2.77cqw] max-w-none shrink-0", mirrored && "-scale-x-100")}
    />
  );
}
