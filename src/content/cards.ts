import { cardFaces, videoPosters, videos, type ImageAsset } from "@/lib/assets";

/**
 * The Living Tarot cards available to the reveal.
 *
 * Only The Star is wired up for now, so every reveal shows it. When the full
 * set of 22 cards is delivered they are added to `livingTarot` and the reveal
 * picks from the list instead of taking the first entry.
 *
 * **These become a backend concern.** The card videos are to be served from an
 * endpoint rather than `public/`, so `video` is deliberately a plain URL string
 * — a remote URL drops straight in with no component change. The seam is
 * `RevealProvider` choosing the card (today always `defaultRevealCard`): that
 * is what will fetch `{ id, number, name, video }` instead. Nothing downstream
 * of it needs to know where the URL came from.
 */

export type TarotCard = {
  id: string;
  /** Roman numeral, shown beside the name on reveal. */
  number: string;
  name: string;
  video: string;
  /** The video's closing frame — what a restored visit shows. See `RevealStage`. */
  image: ImageAsset;
};

export const cardBack = {
  video: videos.cardBack,
  poster: videoPosters.cardBack,
};

export const livingTarot: TarotCard[] = [
  { id: "17-the-star", number: "XVII", name: "The Star", video: videos.theStar, image: cardFaces.theStar },
];

export const defaultRevealCard = livingTarot[0];

export function findCard(id: string | null): TarotCard | undefined {
  return livingTarot.find((card) => card.id === id);
}
