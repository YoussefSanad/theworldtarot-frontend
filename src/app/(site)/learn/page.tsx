import type { Metadata } from "next";

import { LearnHero } from "@/components/learn/LearnHero";
import { SeventyEight } from "@/components/learn/SeventyEight";
import { StepInside } from "@/components/learn/StepInside";
import { TarotMap } from "@/components/learn/TarotMap";
import { meta } from "@/content/learn";
import { siteName } from "@/content/site";

export const metadata: Metadata = {
  title: `${meta.title} — ${siteName}`,
  description: meta.description,
};

/**
 * The Learn page: four bands, alternating night and cream.
 *
 * **It takes no `PageAtmosphere`, and that is the whole shape of the page.**
 * Every other marketing page here hangs its artwork on one backdrop spanning the
 * layout column; this one is built from bands that each carry their own ground,
 * two of them inverted to cream. There is nothing for an atmosphere layer to
 * paint behind them, and one would only show through the gaps between sections
 * that have no gaps.
 *
 * That also means the masthead needs no special handling: the first band is the
 * night hero, so the header sits on dark here exactly as it does everywhere
 * else, and none of the `:has()` machinery the light card pages need applies.
 *
 * No closing block either. Her frame ends on the cream band — the page's one
 * ask is the hero's button, and repeating it at the bottom is not in the design.
 */
export default function LearnPage() {
  return (
    <div className="relative isolate">
      <LearnHero />
      <StepInside />
      <SeventyEight />
      <TarotMap />
    </div>
  );
}
