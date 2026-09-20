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
  /**
   * The same wordmark in this site's one dark ink, for its one light page.
   *
   * **A second file rather than a CSS recolour, because neither route exists
   * here.** The letters are `<path fill>` inside a `<style>` block, so a page
   * cannot reach them: `images.unoptimized` makes `next/image` emit a plain
   * `<img>`, and an `<img>` is a replaced element whose document is closed to
   * the parent's CSS — `currentColor` and `fill` from outside both stop at its
   * border. Inlining the SVG as a component would open it, at the cost of
   * shipping the wordmark in every page's HTML rather than in one cached file.
   *
   * So it is the one file duplicated, and the duplication is one declaration
   * wide: `fill` in the `<style>` block, `#fcf4da` there and `#1b2415` here.
   * **Edit the shapes in both** — they are the same drawing and nothing checks
   * that they match. Used by `SiteHeader` on `.library-card-page`; see
   * `headerTheme` in `content/site.ts`.
   */
  logoInk: asset("/wt-logo-ink.svg", 426, 77),
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

/**
 * The World Tarot page's own artwork (node 344:30). The mission and artist
 * panels are `OrnateFrame`s rebuilt from tokens, like every other panel on the
 * site — only the photograph, its frame ornament, the signature and the moth
 * ship as bitmaps.
 */
export const worldTarotArtwork = {
  /** Serafina at Angkor Wat, already cropped to the octagon Figma draws. */
  artistPhoto: asset("/figma/world-tarot-artist-photo.webp", 294, 459),
  /** The gold octagonal frame astride the photo, transparent inside. */
  photoFrame: asset("/figma/world-tarot-photo-frame.webp", 359, 522),
  /**
   * The two halves of the artist panel's heading, both the client's own
   * artwork from `asset dump/readings page/` rather than the Figma
   * conversion's flattened exports — the same substitution the reading
   * page makes for its beetle, and for the same reason: her originals carry
   * clean alpha where the conversion bakes them onto the backdrop.
   *
   * They are pictures rather than type because neither can be set. "Between"
   * is Malliya Signature, letterspaced and hand-adjusted past what the live
   * face gives; "SKY & STONE" is a gradient fill with an outline that no font
   * supplies at all.
   *
   * **The site therefore does not ship that font.** It was registered in
   * `app/layout.tsx` while the heading was being set as live type, and was
   * removed once both halves became artwork — nothing rendered from it, so it
   * was a webfont downloaded for no glyphs. If a future heading wants it set
   * rather than drawn, it comes back there and not as a straggling token.
   */
  between: asset("/figma/world-tarot-between.webp", 138, 57),
  /**
   * **Recoloured to the then-current `--color-gold` (#e4c46a), and the pixels
   * are no longer
   * the client's own.** She asked for this heading to match the gold the
   * rest of the site's headings use, and being artwork it could not simply
   * be re-tokened.
   *
   * Two things were wrong with the original, and only fixing both matched it:
   * its hue was already 44.3° — exactly the token's — but its saturation ran
   * 41.6% against the token's 53.5%, *and* her export is capped at alpha 140,
   * so the letter body painted at 55% over a near-black panel and composited
   * to about #6A5C34. Lifting the saturation alone still left it dark; the
   * flat 140 plateau (the glyph bodies, 2410px) is rescaled to 255 with it.
   *
   * The gradient and the outline survive because the shift is multiplicative
   * in HSV about the existing values rather than a flat fill — the body now
   * spans luminance 188..200 around the token's 195. The antialiased rim
   * keeps its own lower alpha and stays a rim.
   *
   * `asset dump/readings page/SKY & STONE.png` is the untouched original and
   * measures the same pale #EACF83 at alpha 140, so the wash is hers rather
   * than something the webp conversion introduced — re-exporting from the
   * dump will undo this. Dimensions are unchanged, so nothing below moves.
   *
   * **The token has since moved to the antique gold #dfc894 (19 Sep 2026) and
   * these baked pixels did not follow.** Being artwork, this heading still
   * carries the old, more saturated gold and now runs warmer than the live
   * type around it. Matching it means re-running the recolour above against
   * the new token, not a CSS change.
   */
  skyStone: asset("/figma/world-tarot-sky-stone.webp", 218, 37),
  /** Her silver signature, not the conversion's black one. */
  signature: asset("/figma/world-tarot-signature.webp", 153, 94),
  /** The gold moth astride the mission panel's top edge, in place of a trio. */
  moth: asset("/figma/world-tarot-moth.webp", 71, 67),
} as const;

/** Backgrounds referenced from CSS rather than markup, continued from `surfaces` above. */
export const worldTarotSurfaces = {
  /** `.page-atmosphere-world-tarot` — the garden path the page stands on. */
  path: "/figma/world-tarot-path.webp",
} as const;

/**
 * The Library's Major Arcana art (node 344:98).
 *
 * Unlike everything above, these are not Figma exports: they are the client's
 * own delivery, re-encoded by `scripts/optimize-library-cards.mjs` from
 * 1280x2120 JPEGs of 1-2.4MB each (35MB across the deck) to the 640x1060 webp
 * the grid actually needs. `images.unoptimized` is on for the static export, so
 * that conversion is the only thing standing between the page and the originals.
 *
 * **Each file carries the card's whole chrome** — gold border, the roundel
 * holding the Roman numeral, and the plaque along the bottom — with the plaque
 * left *empty*. The name is HTML text laid into it by `TarotCardTile`, which
 * positions itself by percentages measured off these exact files. A re-cut at a
 * different size would move the plaque out from under the name, which is why the
 * script asserts on the source dimensions rather than trusting them.
 *
 * Addressed by slug so `content/library.ts` can look one up from the card it is
 * already holding; the client's own filenames (`04-the-emporer`,
 * `12-the-hangman`) are mapped to these slugs in the script and appear nowhere
 * else.
 */
const libraryCard = (slug: string): ImageAsset => asset(`/figma/library-cards/${slug}.webp`, 640, 1060);

export const libraryCards = {
  "the-fool": libraryCard("the-fool"),
  "the-magician": libraryCard("the-magician"),
  "the-high-priestess": libraryCard("the-high-priestess"),
  "the-empress": libraryCard("the-empress"),
  "the-emperor": libraryCard("the-emperor"),
  "the-high-priest": libraryCard("the-high-priest"),
  "the-lovers": libraryCard("the-lovers"),
  "the-chariot": libraryCard("the-chariot"),
  strength: libraryCard("strength"),
  "the-hermit": libraryCard("the-hermit"),
  "the-wheel": libraryCard("the-wheel"),
  justice: libraryCard("justice"),
  "the-hanged-man": libraryCard("the-hanged-man"),
  death: libraryCard("death"),
  temperance: libraryCard("temperance"),
  "the-devil": libraryCard("the-devil"),
  "the-tower": libraryCard("the-tower"),
  "the-star": libraryCard("the-star"),
  "the-moon": libraryCard("the-moon"),
  "the-sun": libraryCard("the-sun"),
  judgement: libraryCard("judgement"),
  "the-world": libraryCard("the-world"),
} as const;

/** Backgrounds referenced from CSS rather than markup, for the Library. */
export const librarySurfaces = {
  /** `.page-atmosphere-library` — the rotunda the cards hang in. */
  rotunda: "/figma/library-rotunda.webp",
  /**
   * `.page-atmosphere-card-reference` — the three layers behind a card's page.
   *
   * Her PSD stacks them: an opaque ground, a forest wash over it that overhangs
   * the frame slightly, and the torn sheet of paper the content sits on.
   */
  cardBase: "/figma/card-reference/page-base.webp",
  cardWash: "/figma/card-reference/page-wash.webp",
  /**
   * Her paper, in three pieces.
   *
   * The sheet is a fixed 1337x2995 with a torn deckle at top and bottom, and
   * the page it backs has no fixed height. So the two edges are their own
   * strips and the flat middle tiles between them — see
   * `scripts/optimize-card-assets.mjs`.
   */
  cardPaperTop: "/figma/card-reference/page-paper-top.webp",
  cardPaperMid: "/figma/card-reference/page-paper-mid.webp",
  cardPaperBottom: "/figma/card-reference/page-paper-bottom.webp",
} as const;

const cardRef = (name: string, width: number, height: number): ImageAsset =>
  asset(`/figma/card-reference/${name}.webp`, width, height);

/**
 * The card reference page's artwork (Figma `357:261`).
 *
 * **These are the client's own PSD layers**, not Figma exports, and the
 * distinction is load-bearing — see `scripts/optimize-card-assets.mjs` for what
 * Figma returned instead and why it was unusable. The dimensions below are that
 * script's output; read them off a run of it rather than off the Figma frame,
 * which reports several of these at the size it *draws* them rather than the
 * size the layer actually is.
 *
 * The three background layers live in `librarySurfaces` instead: CSS paints
 * them, and nothing in the markup references them.
 */
export const cardReference = {
  dividerGreen: cardRef("divider-green", 582, 14),
  dividerGold: cardRef("divider-gold", 241, 5),
  /** Her `DIVIDER 1` again in champagne, which is the rule the shadow panel draws. */
  dividerChampagne: cardRef("divider-champagne", 582, 14),
  dividerLookFor: cardRef("divider-look-for", 1203, 8),
  /**
   * Her `FRAME`: the gold ornament at the top of the sheet — flourished
   * corners, three diamonds on its top edge, sides running down open-ended.
   * **Not the reading panel's border**, which is a plain inset stroke; the
   * first build put this around that panel.
   */
  frameOrnament: cardRef("frame-ornament", 1229, 604),
  appearsIcon1: cardRef("appears-icon-1", 49, 50),
  appearsIcon2: cardRef("appears-icon-2", 64, 73),
  appearsIcon3: cardRef("appears-icon-3", 57, 57),
  appearsIcon4: cardRef("appears-icon-4", 51, 51),
  /**
   * The three diamonds astride a sphere card's top edge, cropped from her
   * `LOVE DIAMOND FRAME TOP`. **Only the trio**: the card's rounded outline is
   * rebuilt from tokens by `OrnateFrame`, as every framed panel on this site
   * is — see the "Framed panels" block in globals.css.
   */
  sphereCrest: cardRef("sphere-crest", 47, 22),
  sphereLove: cardRef("sphere-love", 369, 455),
  sphereCareer: cardRef("sphere-career", 369, 455),
  sphereMoney: cardRef("sphere-money", 370, 455),
  shadowGround: cardRef("shadow-ground", 1216, 229),
  /** The figure on her cliff, standing over the shadow panel's left end. */
  shadowSilhouette: cardRef("shadow-silhouette", 269, 239),
  metaStripBg: cardRef("meta-strip-bg", 1205, 241),
  symbolAir: cardRef("symbol-air", 58, 51),
  symbolUranus: cardRef("symbol-uranus", 34, 54),
  symbolAquarius: cardRef("symbol-aquarius", 51, 36),
  symbolKey: cardRef("symbol-key", 80, 27),
  symbolCompass: cardRef("symbol-compass", 87, 87),
} as const;
