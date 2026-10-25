import type { Metadata } from "next";

import { PageAtmosphere } from "@/components/layout/PageAtmosphere";
import { ViewingRoom } from "@/components/viewing-room/ViewingRoom";
import { siteName } from "@/content/site";
import { viewingRoom } from "@/content/viewing-room";

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
 * ## The deck is the backend's, and it is fetched in the browser
 *
 * It was passed down from here through phase one, from a bundled list, and
 * this docblock called that call site the seam phase two would change. It did:
 * `ViewingRoom` now asks `GET /{locale}/cards` itself, through
 * `lib/viewing-room-deck.ts`, so there is nothing for this page to hand it.
 *
 * **Why not here?** This is a static export — `next.config` is `output:
 * "export"` — so a fetch in this component runs at build time and bakes one
 * morning's answer into the HTML. The deck's whole purpose is to say which
 * films are ready *today*, so it has to be asked for after the page loads.
 *
 * The page shell and the card list are public by design. There is no
 * server-side gate and there cannot be one: no middleware, no cookie-reading
 * server component. **The real gate is the video endpoint**, which refuses on
 * every play.
 */
export default function ViewingRoomPage() {
  return (
    <main data-page="viewing-room" className="relative pt-[clamp(32px,5vw,102px)]">
      <PageAtmosphere variant="viewing-room" />
      <ViewingRoom />
    </main>
  );
}
