import { cardFaces, videoPosters, videos } from "@/lib/assets";

/**
 * The Living Tarot cards available to the reveal.
 *
 * **The deck now comes from the backend**, via `drawCard()` in `@/lib/api`. What
 * is left here is the bundled fallback: the card the reveal shows when the API
 * cannot be reached, so the hero of the homepage is never an error state.
 *
 * The note that used to live here said a remote URL would "drop straight in with
 * no component change". That was true of the MP4 this file ships and is **false
 * of what the API returns**, which is HLS. Safari plays an `.m3u8` natively and
 * Chrome and Firefox do not, so `RevealStage` carries a player for it. The seam
 * was in the right place; it was just wider than expected.
 */

export type CardImage = {
  readonly src: string;
  /**
   * Absent for cards from the API, which sends a URL and no dimensions. The
   * stage fixes its own aspect ratio and uses `object-cover`, so nothing shifts
   * when these are unknown. Bundled cards keep theirs.
   */
  readonly width?: number;
  readonly height?: number;
};

export type TarotCard = {
  id: string;
  /** Roman numeral, shown beside the name on reveal. */
  number: string;
  name: string;
  /**
   * An HLS manifest from the API, or a bundled MP4 for the fallback card.
   *
   * Absent on a restored visit, which shows the still and never replays the
   * film. The playback URL is a credential that expires in two hours and must
   * not be stored, so there is nothing to carry across a reload even if we
   * wanted to.
   */
  video?: string;
  /** The frame a restored visit shows in place of replaying the film. */
  image: CardImage;
};

export const cardBack = {
  video: videos.cardBack,
  poster: videoPosters.cardBack,
};

export const livingTarot: TarotCard[] = [
  { id: "17-the-star", number: "XVII", name: "The Star", video: videos.theStar, image: cardFaces.theStar },
];

/**
 * The card shown when the API cannot be reached, or has no film to draw yet.
 *
 * Not a placeholder any more, a fallback with a job: the reveal is the hero of
 * the homepage, and the backend deliberately has no fallback of its own, so a
 * deploy with no films uploaded would otherwise leave the first thing a visitor
 * sees in an error state.
 */
export const defaultRevealCard = livingTarot[0];

export function findCard(id: string | null): TarotCard | undefined {
  return livingTarot.find((card) => card.id === id);
}
