import { artwork, cardFaces, videos, type ImageAsset } from "@/lib/assets";

/**
 * The Living Tarot cards available to the reveal.
 *
 * Only The Star is wired up for now, so every reveal shows it. When the full
 * set of 22 card faces is delivered they are added to `livingTarot` and the
 * reveal picks from the list instead of taking the first entry.
 */

export type TarotCard = {
  id: string;
  name: string;
  image: ImageAsset;
};

export const cardBack = {
  video: videos.cardBack,
  poster: artwork.heroCardBack,
};

export const livingTarot: TarotCard[] = [{ id: "17-the-star", name: "The Star", image: cardFaces.theStar }];

export const defaultRevealCard = livingTarot[0];

export function findCard(id: string | null): TarotCard | undefined {
  return livingTarot.find((card) => card.id === id);
}
