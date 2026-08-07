import { artwork, icons, type ImageAsset } from "@/lib/assets";

/**
 * Homepage copy, kept out of the components so the wording can move to a CMS
 * later without touching layout. Text matches the Figma homepage (node 102:3).
 */

/** Anchor the reveal scrolls to once a visitor has seen their card. */
export const PRODUCTS_SECTION_ID = "choose-your-journey";

export const hero = {
  titleTop: "Enter",
  titleMain: "The Living Tarot",
  tagline: "cinematic tarot, brought to life",
  body: "Discover a cinematic interpretation of the Major Arcana. Reveal a card and experience The Living Tarot one story at a time.",
  /** Shorter variant shown below `sm`, where the full line wraps too tall. */
  bodyMobile: "Discover a cinematic interpretation of the Major Arcana. Reveal a card and experience its story.",
  secondaryActions: [
    {
      label: ["explore the", "complete collection"],
      /** Shorter variant shown below `sm`, so both buttons fit on one row on phones. */
      labelMobile: ["explore the", "collection"],
      href: "/living-tarot",
      icon: icons.book,
    },
    {
      label: ["ASK A QUESTION", "GET A PERSONAL READING"],
      labelMobile: ["GET A PERSONAL", "READING"],
      href: "/readings",
      icon: icons.talk,
    },
  ],
  /** Shown under the secondary actions once the visit's one card has been revealed. */
  returnPrompt: "Return another day to discover a new card.",
  closing: {
    lead: "ancient wisdom•timeless stories•endless discovery.",
    question: "Where will The World Tarot take you?",
  },
};

export const worldTarot = {
  heading: "Tarot From Around the World",
  subheading: "Join Serafina on a mystical journey around the world",
  /** The badge is the Living Tarot wordmark, set inline where Figma places it. */
  body: {
    before:
      "Step into tarot readings like no other — a journey through hidden places and living symbols. From candlelit cafés to windswept shores, from sacred temples to mountain sanctuaries. As Serafina travels the globe, she is creating ",
    after: " — a cinematic deck bringing each archetype to life in the landscape that inspired it.",
  },
};

export type Product = {
  id: string;
  title: string;
  subtitle: string[];
  price: string;
  action: string;
  href: string;
  image: ImageAsset;
};

export const products: Product[] = [
  {
    id: "one-card",
    title: "1 CARD READING",
    subtitle: ["A Single Message", "from the Tarot"],
    price: "$12",
    action: "BEGIN READING",
    href: "/readings/one-card",
    image: artwork.productOneCard,
  },
  {
    id: "three-card",
    title: "3 CARD READING",
    subtitle: ["One Question,", "Three Cards"],
    price: "$52",
    action: "BEGIN READING",
    href: "/readings/three-card",
    image: artwork.productThreeCard,
  },
  {
    id: "month-ahead",
    title: "MONTH AHEAD",
    subtitle: ["What’s in Store?", "5 Card Forecast"],
    price: "$75",
    action: "BEGIN READING",
    href: "/readings/month-ahead",
    image: artwork.productMonthAhead,
  },
  {
    id: "viewing-room",
    title: "VIEWING ROOM",
    subtitle: ["Complete Cinematic", "Collection"],
    price: "$29",
    action: "ENTER",
    href: "/viewing-room",
    image: artwork.productViewingRoom,
  },
];

export const journey = {
  heading: "Choose Your Journey:",
  subheading: ["Choose a personalized reading, or step inside the complete", "Living Tarot collection in the Viewing Room."],
  /**
   * Below `sm` the four tiles become a swipeable row. None of this is visible —
   * they are the names a screen reader reads out for the position dots. The row
   * itself is never announced as a carousel, because the same markup is a plain
   * grid above `sm`; see `components/home/ProductCarousel.tsx`.
   */
  carousel: {
    dotsLabel: "Choose a reading",
    /** Prefixes each product title on its dot: “Show 1 CARD READING”. */
    dotAction: "Show",
  },
};

export const included = {
  heading: "What’s Included",
  columns: [
    ["A personalized tarot interpretation tailored to your question", "Clear, thoughtful guidance", "Your reading, beautifully presented on original artwork and delivered by email."],
    ["Delivered within 72 hours (option to upgrade to 24-hour turnaround)", "A beautifully formatted reading designed to be saved and revisited"],
  ],
};

export const placeStatement = ["A place where art, mysticism,", "and intention meet. A space between sky and stone."];

export const valueProps = [
  { title: "Led by the Cards", body: "Each reading unfolds through the archetypes themselves" },
  { title: "Composed with Intention", body: "Original artwork paired with thoughtful interpretation" },
  { title: "Clarity in Motion", body: "Insight that illuminates your next chapter" },
];

export const featuredTestimonial = {
  quote: "“It didn’t just speak to me - it shimmered.  I’ve kept it like a piece of art.”",
  attribution: "- Blake M., Big Sur, CA",
};

export const artist = {
  body: [
    "Serafina is an artist whose work weaves together art, symbolism, and intuitive insight, drawing inspiration from sacred places around the world.",
    "Her work is shaped by a lifelong study of tarot, myth, and visual storytelling — creating readings that feel intimate, thoughtful, and deeply personal.",
  ],
  /** Broken after “choice,” so the two lines read evenly rather than wrapping ragged. */
  quote: [
    "“Every reading, to me, is like standing before a living work of art - where fate, choice,",
    "and reflection meet through the language of symbols.”",
  ],
};

export const closingCta = {
  heading: "Ready to Receive Your Message?",
  action: { label: "GET MY READING", href: "/readings" },
  testimonial: {
    /** Figma sets the quote on two lines rather than letting it wrap. */
    quote: [
      "“I felt like the reading was crafted just for me. The words,",
      "the imagery, the clarity — it was beautiful and affirming.”",
    ],
    attribution: "- Sasha N., Charlottesville VA",
  },
};
