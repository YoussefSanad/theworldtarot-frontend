/**
 * Every image exported from the Figma homepage (node 102:3), addressed once.
 *
 * Figma emits a separate URL per instance, so the fetch script collapses
 * byte-identical exports and this module is the single place a path is written
 * down. Artwork that repeats across the page — the ornate divider, the tile
 * frame, the compass — is referenced from here rather than duplicated.
 *
 * Button, field and checkbox chrome is not listed: it is rebuilt from tokens in
 * globals.css so it stays crisp at any size.
 */

export type ImageAsset = {
  readonly src: string;
  readonly width: number;
  readonly height: number;
};

const asset = (src: string, width: number, height: number): ImageAsset => ({ src, width, height });

export const brand = {
  logo: asset("/figma/logo.webp", 401, 209),
  livingTarotBadge: asset("/figma/living-tarot-badge.webp", 271, 33),
  compass: asset("/figma/compass-icon.webp", 190, 215),
  bulletStar: asset("/figma/bullet-star.webp", 19, 19),
  revealStar: asset("/figma/reveal-icon-star.webp", 53, 52),
} as const;

export const icons = {
  login: asset("/figma/login-icon.webp", 41, 46),
  bag: asset("/figma/bag-icon.webp", 37, 45),
  book: asset("/figma/book-icon.webp", 51, 40),
  talk: asset("/figma/talk-icon.webp", 56, 49),
} as const;

export const social = {
  facebook: asset("/figma/social-facebook.svg", 22, 22),
  instagram: asset("/figma/social-instagram.svg", 22, 22),
  x: asset("/figma/social-x.svg", 22, 22),
  youtube: asset("/figma/social-youtube.svg", 22, 22),
} as const;

export const artwork = {
  heroCardBack: asset("/figma/hero-card.webp", 449, 743),
  goldCircleLeft: asset("/figma/gold-circle-left.webp", 358, 685),
  goldCircleRight: asset("/figma/gold-circle-right.webp", 316, 683),
  book: asset("/figma/book-image.webp", 1180, 543),
  productOneCard: asset("/figma/product-one-card.webp", 369, 572),
  productThreeCard: asset("/figma/product-three-card.webp", 371, 583),
  productMonthAhead: asset("/figma/product-month-ahead.webp", 367, 589),
  productViewingRoom: asset("/figma/product-viewing-room.webp", 373, 563),
} as const;

/** Backgrounds referenced from CSS rather than markup. */
export const surfaces = {
  header: "/figma/header-bg.webp",
  footer: "/figma/footer-bg.webp",
  valueProps: "/figma/section-6-bg.webp",
} as const;

export const videos = {
  cardBack: "/videos/card-back-compressed.mp4",
} as const;

/**
 * First decoded frame of each looping video, captured from that file so the
 * load still matches playback pixel-for-pixel.
 */
export const videoPosters = {
  cardBack: asset("/videos/card-back-poster.webp", 1280, 2120),
} as const;

/** Still frames shown when a Living Tarot card is revealed on the homepage. */
export const cardFaces = {
  theStar: asset("/videos/17-the-star-last.png", 1280, 2120),
} as const;
