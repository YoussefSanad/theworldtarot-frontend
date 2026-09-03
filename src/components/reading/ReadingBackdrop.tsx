import type { ReactNode } from "react";

import { PageAtmosphere } from "@/components/layout/PageAtmosphere";

/**
 * The night sky a single reading stands under, and the box that scopes it.
 *
 * **One component because the offset is tuned to something outside it.** The
 * `-top-20` below is the masthead's height, so it has to move when
 * `SiteHeader`'s padding does — and until 3 September 2026 that was a three-file
 * edit: `ReadingPresentation`, `PlainReading` and `CodeEntry` each held their
 * own copy of the same two lines, which is three chances for one of them to be
 * left behind at the moment the header changes and no way to see it from the
 * file that changed.
 *
 * **The backdrop is scoped to the page's own content** rather than to the
 * layout column, as it is on the readings index and for the index's reason: the
 * client's frames draw no site footer and ours is opaque, so a room anchored to
 * the column would spend its height behind the footer and never be seen.
 * `isolate` keeps `PageAtmosphere`'s `-z-10` inside this box.
 *
 * **The mobile offset is the index's too.** Above `lg` a reading page opens on
 * flat colour — the observatory stands on the floor and nothing reaches the top
 * — but below it `.page-atmosphere-reading::before` hangs the same night sky
 * the index hangs, from this box's top edge. That edge is `main`'s, which is the
 * masthead's bottom, and the masthead is transparent: left flush, the sky starts
 * in a hard line under a strip of flat colour and the header reads as a solid
 * block sitting on the page. 5rem lifts the start of the picture above the
 * header — the same clearance and the same number as `readings/page.tsx`.
 */
export function ReadingBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate">
      <PageAtmosphere variant="reading" className="max-lg:-top-20" />

      {children}
    </div>
  );
}
