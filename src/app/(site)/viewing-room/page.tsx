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
/**
 * **The wrapper is a `div`, not a second `<main>`, and that is what puts the
 * room behind the masthead.**
 *
 * This page used to return `<main data-page="viewing-room" className="relative
 * …">`, which nested a `<main>` inside the layout's own one — invalid HTML on
 * its own account, a document gets one — but the visible cost was the header.
 *
 * `PageAtmosphere` is `absolute inset-0`, so it fills the nearest *positioned*
 * ancestor. On every other page that is the layout column in
 * `src/app/(site)/layout.tsx`, which is `relative isolate` and spans header,
 * main and footer — so the artwork paints behind all three, which is the whole
 * reason `SiteHeader` is transparent. Here the inner `<main>` carried its own
 * `relative`, so the atmosphere resolved against *that* and began at `main`'s
 * top edge, below the header. Nothing was painted behind the masthead at all
 * and it fell through to `body`'s `--color-night` (#081525), while this page's
 * own ground is `#000` — so the header read as a navy band sitting on a black
 * page, with a seam along its bottom edge. It was reported as "the header is a
 * different colour in the viewing room", and it was.
 *
 * `relative isolate` on a plain `div` is the arrangement `readings/page.tsx`,
 * `library/page.tsx` and `world-tarot/page.tsx` all use. `isolate` matters for
 * the same reason the layout's does: the atmosphere is `-z-10`, so without a
 * stacking context here it would resolve against the layout's instead — which
 * happens to work, but only by accident of there being nothing between them.
 *
 * **It is `relative` and not positioned-static** so `ViewingRoom`'s own
 * absolutely positioned children keep the containing block they had.
 */
export default function ViewingRoomPage() {
  return (
    <div data-page="viewing-room" className="relative isolate pt-[clamp(32px,5vw,102px)]">
      <PageAtmosphere variant="viewing-room" />
      <ViewingRoom />
    </div>
  );
}
