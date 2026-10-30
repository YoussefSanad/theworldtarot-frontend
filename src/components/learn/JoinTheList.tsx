import Image from "next/image";
import Link from "next/link";

import { NEWSLETTER_ANCHOR } from "@/content/site";
import { brand } from "@/lib/assets";
import { cn } from "@/lib/cn";

/**
 * The hero's one action: a gold button that hands the visitor to the footer's
 * signup, since the courses have nothing to sell yet and this page has no form
 * of its own.
 *
 * **It is a link wearing `.btn`, not a `Button`.** `Button` renders a
 * `<button>`, and this navigates — so it would need a handler to do what an
 * anchor does for free, and would lose the middle-click, the context menu and
 * the focus behaviour a link already has. The classes are the same ones
 * `Button`'s `gold`/`lg` pair compiles to, with `size="lg"`'s own metrics
 * (`min-h-[2.66em]`, `px`/`py`) spelled out here rather than imported.
 *
 * **The star-in-a-disc is deliberately the homepage's.** `RevealTrigger` draws
 * the same mark the same way, and the two buttons are meant to read as one
 * component across the site. What is *not* shared is the code: that trigger is a
 * client component wired to `useReveal`, and importing it would drag the reveal
 * context onto a page with no card in it. So the markup is repeated and the
 * coupling is not — if the treatment ever changes, both move, and the pages stay
 * independent.
 */
export function JoinTheList({ label, className }: { label: string; className?: string }) {
  return (
    <Link
      /*
        A bare fragment, because the footer is rendered by the site layout and
        is therefore already on this page — `/#…` would send the visitor to the
        homepage to reach a form that is a few hundred pixels below them.
      */
      href={`#${NEWSLETTER_ANCHOR}`}
      className={cn(
        "btn btn-gold min-h-[2.66em] w-fit max-w-full justify-start gap-[0.72em] pr-[1.2em] pl-[0.4em] text-nav font-bold tracking-[-0.01em] whitespace-nowrap",
        className,
      )}
    >
      <span aria-hidden className="stack size-[2em] shrink-0 place-items-center rounded-full bg-black">
        <Image
          src={brand.revealStar.src}
          alt=""
          width={brand.revealStar.width}
          height={brand.revealStar.height}
          className="w-[1.77em]"
        />
      </span>
      {label}
    </Link>
  );
}
