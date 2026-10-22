import type { Metadata } from "next";

import { ViewingRoom } from "@/components/viewing-room/ViewingRoom";
import { siteName } from "@/content/site";
import { viewingRoom, viewingRoomDeck } from "@/content/viewing-room";

export const metadata: Metadata = {
  title: `${viewingRoom.title} — ${siteName}`,
  description: viewingRoom.panel.body,
};

/**
 * The Viewing Room (Figma `384:2`), and **the one page both entry points
 * reach**: the masthead's VIEWING ROOM and the homepage tile land here. The
 * separate Living Tarot sales page the client first asked for was dropped —
 * the paywall panel is the sale.
 *
 * ## The deck arrives here and nowhere else
 *
 * `viewingRoomDeck` is passed in rather than imported by the component, and
 * that is the whole seam: **this call site is what phase two changes.** When
 * `GET /{locale}/cards` is wired, the list comes from there and nothing below
 * this line knows the difference.
 *
 * The page shell and the card list are public by design. There is no
 * server-side gate and there cannot be one — `next.config` is `output:
 * "export"`, so there is no middleware and no cookie-reading server component.
 * **The real gate is the video endpoint**, which refuses on every play.
 */
export default function ViewingRoomPage() {
  return (
    <main className="relative pt-[clamp(32px,5vw,102px)]">
      <ViewingRoom cards={viewingRoomDeck} />
    </main>
  );
}
