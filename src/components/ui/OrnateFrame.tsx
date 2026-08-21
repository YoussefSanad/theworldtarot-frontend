import Image from "next/image";
import type { ReactNode } from "react";

import { ornaments } from "@/lib/assets";
import { cn } from "@/lib/cn";

/**
 * The bordered panel the Readings page is built out of: a 2px gold rounded
 * rectangle, optionally with its top edge open for a heading.
 *
 * Figma ships each panel as a bitmap of that rectangle; none of them are used.
 * A hairline stretched across a responsive box goes soft and uneven, and a
 * fixed-aspect image can't follow a card that grows when its copy wraps — so
 * the rectangle is rebuilt from tokens, the way the gold buttons are, and only
 * the diamond ornaments ship as artwork. See the "Framed panels" block in
 * globals.css for the mechanics, which are all in CSS; this file is markup.
 *
 * A panel clips its contents to its own curve, so a photograph inside one is
 * cut by the same corner the border draws, at any width, and can simply fill
 * its box. The `@container` wrapper is what lets the radius be
 * container-relative: an element can't query the container it establishes.
 *
 * `crest` is the one mark meant to escape that clip — it straddles the top
 * edge, so it shares a `.stack` cell with the whole panel rather than sitting
 * inside it.
 */
export type OrnateFrameVariant = "card" | "panel";

export function OrnateFrame({
  variant = "card",
  legend,
  crest = false,
  className,
  bodyClassName,
  children,
}: {
  variant?: OrnateFrameVariant;
  /** Given, the top border parts for this and the two ornaments bracketing it. */
  legend?: ReactNode;
  /** Draws the trio astride the top edge below `lg`. Closed panels only. */
  crest?: boolean;
  /** Sits on the `@container` wrapper. */
  className?: string;
  /** Sits on the bordered box itself. */
  bodyClassName?: string;
  children: ReactNode;
}) {
  /*
    The line width and the corner radius sit on the wrapper, not on the box
    they describe: the border is its own element now, and a sibling cannot
    inherit a custom property declared on the box beside it — left there, the
    ring resolved `var(--ornate-line)` to nothing and drew no border at all.
    Declaring them here is still safe for the `cqw` radius, which resolves
    where it is *used*, and it is only ever used on a descendant.
  */
  const tokens = cn("ornate-frame", variant === "card" ? "ornate-frame--card" : "ornate-frame--panel");

  if (!legend) {
    return (
      <div className={cn("@container stack isolate", tokens, className)}>
        <div className={cn("ornate-frame--closed", "panel-hover__surface", bodyClassName)}>{children}</div>
        {/* The border, so the glow can follow the line rather than the box. */}
        <span aria-hidden className="ornate-frame__ring panel-hover__frame" />
        {crest ? <OrnateCrest /> : null}
      </div>
    );
  }

  return (
    <div className={cn("@container", tokens, className)}>
      <div className="ornate-frame--open">
        {/*
          The size lives here rather than on `.ornate-legend` in the stylesheet
          because a utility outranks the components layer — and it has to be a
          responsive pair: `--text-h2`'s 24px floor is wider than the gap the
          border opens on a phone, and the heading wraps out of the panel.
          20px is what the mobile mockup sets it at.
        */}
        <div className="ornate-legend text-[clamp(0.875rem,4.8vw,1.375rem)] lg:text-h2">
          <span aria-hidden className="ornate-legend__rule lg:hidden" />
          <OrnateMark size="lg" className="hidden lg:block" />
          {legend}
          <OrnateMark size="lg" mirrored className="hidden lg:block" />
          <span aria-hidden className="ornate-legend__rule lg:hidden" />
        </div>

        <div className={cn("ornate-frame__body", bodyClassName)}>{children}</div>

        {/* Decoration last, so the border paints over the edges of what it frames. */}
        <span aria-hidden className="ornate-frame__surface panel-hover__surface" />
        <span aria-hidden className="ornate-frame__edge panel-hover__frame ornate-frame__edge--start" />
        <span aria-hidden className="ornate-frame__edge panel-hover__frame ornate-frame__edge--gap" />
        <span aria-hidden className="ornate-frame__edge panel-hover__frame ornate-frame__edge--end" />
      </div>
    </div>
  );
}

/**
 * The mark that brackets a legend heading, drawn once and flipped for the
 * opposite side; the border line runs through it.
 *
 * Two exports rather than one scaled — the mobile frame draws the same motif
 * at 15x19 against the desktop's 26x56, so the tall one squashed to fit would
 * be the wrong mark, not a smaller one — and two *placements*, which is why
 * this is exported. She brackets the heading's **first line**, and on a phone
 * that heading wraps: as a sibling of the whole block the mark would sit out
 * at the width of the longest line instead of hugging the words above it. So
 * the small one goes inside the first phrase, where it is part of that line
 * and travels with it, and the tall one stays a sibling because at `lg` the
 * heading is one line and the block *is* the first line.
 */
export function OrnateMark({
  size,
  mirrored = false,
  className,
}: {
  size: "sm" | "lg";
  mirrored?: boolean;
  className?: string;
}) {
  const art = size === "sm" ? ornaments.pairSmall : ornaments.pair;

  return (
    <Image
      src={art.src}
      alt=""
      width={art.width}
      height={art.height}
      className={cn(
        "w-auto max-w-none shrink-0",
        size === "sm"
          ? /*
              Inline in the first line, so it centres on that line's *box*
              while the border runs through the capitals — the difference
              between the two is what `--ornate-legend-lift` already measures.
              Same optical-nudge trick as the bullet star in `WhatsIncluded`.
            */
            "relative top-[calc(var(--ornate-legend-lift)-0.55em)] h-[0.95em]"
          : "h-[1.27em] lg:mt-[calc(var(--ornate-legend-lift)-0.635em)]",
        mirrored && "-scale-x-100",
        className,
      )}
    />
  );
}

/**
 * The trio of diamonds astride a closed panel's top edge — below `lg` only.
 *
 * The gift band is the sole closed panel that takes one, and only her mobile
 * frame draws it: the desktop frame's top edge is bare. A reading card carries
 * both of her crops itself, since it needs one at every width.
 */
function OrnateCrest() {
  return (
    <Image
      src={ornaments.trioSmall.src}
      alt=""
      width={ornaments.trioSmall.width}
      height={ornaments.trioSmall.height}
      className="ornate-crest h-auto max-w-none lg:hidden"
    />
  );
}
