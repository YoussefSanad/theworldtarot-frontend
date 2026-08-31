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
  /**
   * The one mark in here that is not a Figma export: the client's own vector
   * wordmark, cropped to the letters.
   *
   * `logo.webp` drew the same words inside a pale starfield swirl, and 401x209
   * was mostly that swirl — the cream measured 400x74 of it, flush to both
   * side edges. So the box changes shape (1.92:1 to 5.52:1) while the words do
   * not: every caller sizes this by width, and at the width each already sets
   * the wordmark lands the size it always was. What goes is the halo, and with
   * it the height the halo needed — see `SiteHeader`, whose masthead is no
   * longer the tallest thing on a phone.
   *
   * SVG, and the only one on the site. `images.unoptimized` is on for the
   * static export, so `next/image` writes a plain `<img>` and none of the
   * optimizer's SVG handling — `dangerouslyAllowSVG` and the CSP that should
   * come with it — is in play.
   */
  logo: asset("/wt-logo.svg", 426, 77),
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
  /**
   * The cluster a reading page sets astride each of its two panels' top edges,
   * 20% in from either end. Cropped with its own 2px of the border line, so the
   * crop lands on the rule it is laid over instead of leaving a slit where the
   * small diamond parts from the pair; drawn once and mirrored for the far end.
   */
  stud: asset("/figma/frame-ornament-stud.webp", 19, 26),
} as const;

/**
 * The checkout controls on a reading page (node 329:496). The buttons
 * themselves are rebuilt from tokens like every other control on the site;
 * only the marks inside them ship as artwork.
 */
export const checkout = {
  applePay: asset("/figma/apple-pay-logo.webp", 106, 44),
  googlePay: asset("/figma/google-pay-logo.webp", 128, 51),
  card: asset("/figma/card-icon.webp", 49, 35),
  lock: asset("/figma/lock-icon.webp", 19, 27),
  gift: asset("/figma/gift-icon.webp", 53, 54),
  /**
   * What `gift` becomes while the order *is* a gift, beside the label that
   * leaves gift mode. The client's set has no mark for it, so this one is
   * drawn — an SVG rather than a `.webp`, which the export serves as-is
   * because `images.unoptimized` is on and Next hands a local SVG straight to
   * an `<img>`.
   *
   * **54 tall, like `gift`.** `Mark` sizes on width and the browser holds the
   * ratio, so matching the height is what keeps the frame from resizing as the
   * label changes; the width differs because a card is portrait and a box is
   * square.
   */
  selfReading: asset("/figma/self-reading-icon.svg", 38, 54),
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
  /** World behind the sun — opacity capped in SunriseAtmosphere, tuned by eye against the PSD. */
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

/**
 * A reading page's own artwork (node 329:496). The first four are the page
 * furniture every reading shares; the hero still is the product's.
 */
export const readingPageArtwork = {
  /** Astride the left panel's top edge, in the gap the border opens for it. */
  moon: asset("/figma/moon-crest.webp", 99, 107),
  /** The medallion that opens each line of Your Reading. */
  bullet: asset("/figma/bullet-medallion.webp", 43, 43),
  /**
   * Over the Beyond the Gate heading. The client's own silver drawing of the
   * beetle (`asset dump/readings page/BUG.png`), not the gold one the Figma
   * conversion exports — same 74x83 mark, redrawn in the site's silver.
   */
  bug: asset("/figma/gate-bug.webp", 74, 83),
  gate: asset("/figma/reading-gate.webp", 609, 453),
} as const;

/** Backgrounds referenced from CSS rather than markup. */
export const surfaces = {
  header: "/figma/header-bg.webp",
  footer: "/figma/footer-bg.webp",
  valueProps: "/figma/section-6-bg.webp",
  /** `.page-atmosphere-readings`; the flat layer under it is `--color-ink`. */
  readingsParlor: "/figma/readings-parlor.webp",
  /** The same layer's phone-only sky, from the revised mobile mockup. Below `lg` only. */
  readingsSkyMobile: "/figma/readings-sky-mobile.webp",
  /**
   * `.reading-panel-sky` — the weather inside a reading page's left panel.
   * Figma draws it in the background group, which is not where it belongs; see
   * that block in globals.css.
   */
  readingPanelSky: "/figma/reading-panel-sky.webp",
  /**
   * `.page-atmosphere-reading`; the flat layer under it is `--color-night`.
   * The one opaque layer of the nine Figma stacks behind node 329:496 — the
   * other eight are flat fills of a colour we already have a token for, or sit
   * underneath this one and are never seen. See that block in globals.css.
   */
  readingObservatory: "/figma/reading-observatory.webp",
} as const;

export const videos = {
  cardBack: "/videos/card-back-compressed.mp4",
  theStar: "/videos/17-the-star-compressed.mp4",
  /**
   * The loop under a reading's title. Figma draws this box as
   * `hero-video-placeholder` and the client supplied the film for it
   * (`asset dump/readings page/CARDS.mov`, 1920x1080, 27.8s), cropped to the
   * 606x406 the frame draws and encoded at twice that. Shared by all three
   * written readings — it is the deck, not the spread.
   */
  readingCards: "/videos/reading-cards-compressed.mp4",
} as const;

/**
 * First decoded frame of each looping video, captured from that file so the
 * load still matches playback pixel-for-pixel.
 */
export const videoPosters = {
  cardBack: asset("/videos/card-back-poster.webp", 1280, 2120),
  readingCards: asset("/videos/reading-cards-poster.webp", 1212, 812),
} as const;

/** Still frames shown when a Living Tarot card is revealed on the homepage. */
export const cardFaces = {
  theStar: asset("/videos/17-the-star-last.png", 1280, 2120),
} as const;
