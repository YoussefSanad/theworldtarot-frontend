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
  butterfly: asset("/figma/butterfly.webp", 87, 49),
} as const;

/**
 * The line ornaments that break a Readings panel's border, cropped out of the
 * frame exports Figma gave us — the frames themselves are rebuilt from tokens
 * (see the "Framed panels" block in globals.css). `pair` and `ruleEnd` are each
 * drawn once and mirrored in CSS for the opposite side.
 */
export const ornaments = {
  /** Trio astride a reading card's top edge; 14 of its 33px sit above the line. */
  trio: asset("/figma/frame-ornament-trio.webp", 36, 33),
  /** The same trio as the mobile frames draw it — 7 of its 16px above the line. */
  trioSmall: asset("/figma/frame-ornament-trio-sm.webp", 26, 16),
  /** Brackets the signature panel's heading where the top border opens for it. */
  pair: asset("/figma/frame-ornament-pair.webp", 26, 56),
  /** The same mark as the mobile frame draws it — squatter, not the tall one scaled. */
  pairSmall: asset("/figma/frame-ornament-pair-sm.webp", 15, 19),
  /** Caps the gold rule either side of the Traditional Tarot Readings heading. */
  ruleEnd: asset("/figma/rule-ornament.webp", 21, 18),
} as const;

export const icons = {
  login: asset("/figma/login-icon.webp", 41, 46),
  bag: asset("/figma/bag-icon.webp", 37, 45),
  book: asset("/figma/book-icon.webp", 51, 40),
  talk: asset("/figma/talk-icon.webp", 56, 49),
} as const;

export const artwork = {
  heroCardBack: asset("/figma/hero-card.webp", 449, 743),
  goldCircleLeft: asset("/figma/gold-circle-left.webp", 358, 685),
  goldCircleRight: asset("/figma/gold-circle-right.webp", 316, 683),
  book: asset("/figma/book-image.webp", 1554, 557),
  productOneCard: asset("/figma/product-one-card.webp", 369, 572),
  productThreeCard: asset("/figma/product-three-card.webp", 371, 583),
  productMonthAhead: asset("/figma/product-month-ahead.webp", 367, 589),
  productViewingRoom: asset("/figma/product-viewing-room.webp", 373, 563),
  /** Hero sunrise layer — opacity/brightness driven by SunriseAtmosphere. */
  worldShine: asset("/figma/world-shine.webp", 1600, 655),
  /** World behind the sun — Motion opacity capped to match baked ~18%. */
  worldGlobe: asset("/figma/world-globe.webp", 1600, 1215),
} as const;

/**
 * Readings photography (node 300:68). Each carries its panel's rounded corner
 * and a soft feather into the frame's interior in its own alpha channel, as
 * Figma exported it — nothing here should be re-cropped or given a CSS radius.
 */
export const readingArtwork = {
  signature: asset("/figma/readings-signature.webp", 682, 430),
  threeCard: asset("/figma/readings-three-card.webp", 478, 301),
  monthAhead: asset("/figma/readings-month-ahead.webp", 478, 301),
  inDepth: asset("/figma/readings-in-depth.webp", 478, 301),
  gift: asset("/figma/readings-gift.webp", 462, 257),
} as const;

/** Backgrounds referenced from CSS rather than markup. */
export const surfaces = {
  header: "/figma/header-bg.webp",
  footer: "/figma/footer-bg.webp",
  valueProps: "/figma/section-6-bg.webp",
  /** `.page-atmosphere-readings`; the flat layer under it is `--color-ink`. */
  readingsParlor: "/figma/readings-parlor.webp",
} as const;

export const videos = {
  cardBack: "/videos/card-back-compressed.mp4",
  theStar: "/videos/17-the-star-compressed.mp4",
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
