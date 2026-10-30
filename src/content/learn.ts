import { learnArtwork, type ImageAsset } from "@/lib/assets";

/**
 * The Learn page's copy (Figma node 395:55), kept out of the components so the
 * wording can move to a CMS later without touching layout.
 *
 * **Transcribed from the client's PSD export rather than from Figma.** The
 * PSD-to-Figma conversion is lossy, so `asset dump/learn/LEARN.png` is the
 * authority for what these lines say and where they break. There is no mobile
 * mockup — see `src/components/learn/README.md`.
 *
 * **Three misspellings in her draft are corrected here**, each noted at the line
 * it belongs to so the client can put any of them back if it was deliberate. Her
 * phrasing is otherwise untouched, including "one card a time" below, which
 * reads as a dropped "at" but scans as an echo of the hero's line.
 */

export const hero = {
  title: "Learn Tarot",
  eyebrow: ["A DEEPER UNDERSTANDING", "OF THE CARDS"],
  /** Her draft reads "one cardt at a time." */
  lead: "Tarot, one card at a time.",
  body: [
    "Short, cinematic video courses designed to make tarot easy to understand, enjoyable to learn, and easier to remember.",
    "Through film, imagery, narration and sound, each course brings a single card to life - its story, symbolism, history and meaning within a reading.",
  ],
  action: { label: "JOIN THE LIST" },
  /* Sits under the button, smaller than anything else in the column. */
  note: "Be the first to know when the courses are released.",
  imageAlt: "A laptop on a candlelit desk, playing a film of a cloaked figure and a dog on a moonlit ridge.",
};

export const stepInside = {
  eyebrow: "STEP INSIDE EACH CARD.",
  heading: "Discover. Explore. Understand.",
  body: [
    "Each course takes you inside the card, revealing its story, symbols, and deeper meaning. Learn how it is evolved through history and how its meaning can change within a reading.",
    /* Her draft reads "understading". "one card a time" is hers and stands. */
    "The lessons are divided into short, easy-to-follow chapters, so you can learn at your own pace and build your understanding naturally, one card a time.",
  ],
};

/**
 * The three postcards, in the order they stack — the Sun behind, the Chariot to
 * its right, the Star in front. `PostcardFan` leans on that order for both its
 * paint order and which two it drops on a phone.
 */
export const postcards: readonly { image: ImageAsset; alt: string }[] = [
  {
    image: learnArtwork.postcardSun,
    alt: "The Sun: a golden sun with a human face, blazing above clouds.",
  },
  {
    image: learnArtwork.postcardChariot,
    alt: "The Chariot: a charioteer driving two white horses across open ground.",
  },
  {
    image: learnArtwork.postcardStar,
    alt: "The Star: a woman pouring water into a pool beneath a bright star.",
  },
];

export const seventyEight = {
  heading: "78 CARDS. ONE STORY AT A TIME.",
  /** Her draft reads "intuitve". */
  intro:
    "Whether you're discovering tarot for the first time or deepening what you already know, these courses are designed to make the cards clearer, more memorable and more intuitive to read.",
  marks: [
    {
      image: learnArtwork.markFilm,
      title: "CINEMATIC VIDEOS",
      body: "Beautifully illustrated lessons that bring each card to life.",
    },
    {
      image: learnArtwork.markBook,
      title: "EASY TO FOLLOW",
      body: "Short, focused chapters you can enjoy at your own pace.",
    },
    {
      image: learnArtwork.markStar,
      title: "RICHER MEANING",
      body: "Explore symbolism, history and interpretation.",
    },
    {
      image: learnArtwork.markCards,
      title: "BUILD REAL SKILLS",
      body: "Gain confidence and intuition in your own readings.",
    },
  ],
};

export const tarotMap = {
  heading: "A MAP OF THE TAROT",
  intro: "As you explore the cards, you'll begin to see how they connect — and how the deck works as a whole.",
  groups: [
    {
      image: learnArtwork.mapMajor,
      title: "MAJOR ARCANA",
      body: "The larger forces, archetypes, and turning points that shape the human journey.",
    },
    {
      image: learnArtwork.mapCourt,
      title: "COURT CARDS",
      body: "Figures that can represent people, roles, personalities, or ways of being.",
    },
    {
      image: learnArtwork.mapMinor,
      title: "MINOR ARCANA",
      body: "The experiences, choices, challenges, and circumstances of everyday life.",
    },
  ],
};

export const meta = {
  title: "Learn Tarot",
  description:
    "Short, cinematic video courses that bring a single tarot card to life — its story, symbolism, history and meaning within a reading.",
};
