/**
 * The four suits' copy, transcribed from the client's frames.
 *
 * The split from `library.ts` is the one `card-content.ts` already keeps:
 * `library.ts` owns a suit's *identity* — slug, label, title, href — and this
 * module owns its *words*. A CMS would one day own this file and not that one.
 *
 * **Her copy is reproduced as drawn**, including her spellings and her mixed
 * `&` and `and`. What is deliberately *not* reproduced is her line-break
 * hyphenation (`fulfill-ment`, `abun-dance`): that is her layout engine fitting
 * her own measure, and this page has a different one. `suit-content.test.ts`
 * pins that.
 *
 * **The singular in each unfolding line is hers and is stored, not derived** —
 * "each Cup", "each Pentacle", "each Sword", "each Wand". The whole sentence is
 * one string, so nothing is assembled from the suit's name.
 *
 * **The sphere boxes carry no U+00A0 joins**, unlike `card-content.ts`. Hers
 * mark the specific boxes the client pointed at — she named "growth" under
 * career and "decisions" under money — and guessing where they belong on a
 * suit would be inventing a copy change. These rely on `SpheresCarousel`'s
 * `text-pretty` alone; if she reports an orphan on a suit page, the fix is to
 * join that phrase with a non-breaking space the way `card-content.ts` does.
 */
export type SuitContent = {
  /** EMOTION · INTUITION · CONNECTION — under the rule, in caps. */
  keywords: string;
  /** The three paragraphs beside the emblem. */
  essay: readonly string[];
  /** The three centred lines under the KEY THEMES rule. */
  keyThemes: readonly string[];
  spheres: { love: string; career: string; money: string };
  /** The saying between the two rules. */
  closing: readonly string[];
  unfolding: { heading: string; body: readonly string[] };
  metaDescription: string;
};

/*
  **One named export per suit**, which is the shape `card-content.ts` uses for
  its twenty-two and the reason `library.ts` can attach them by name: a missing
  export is then a compile error, where a record lookup for a slug that does not
  exist is silently `undefined` and renders the holding page.
*/
export const cups: SuitContent = {
  keywords: "EMOTION · INTUITION · CONNECTION",
  essay: [
    "The suit of Cups represents the realm of the heart—emotion, intuition, relationships, and our inner world. Cups speak to love, longing, compassion, creativity, and the feelings that shape our experience.",
    "This is a suit of receptivity and connection. Cups invite us to trust what we feel, deepen our relationships, and listen to the quiet wisdom within. They often signal love, emotional healing, creative inspiration, and meaningful connection.",
    "At their highest expression, Cups bring empathy, fulfillment, and emotional wisdom—the understanding that what moves the heart can guide us as powerfully as the mind.",
  ],
  keyThemes: [
    "emotion and intuition · love and connection",
    "relationships & compassion · creativity & imagination",
    "emotional healing & fulfillment · dreams & the subconscious",
  ],
  spheres: {
    love: "Deepens emotional connection, intimacy, and understanding. Cups encourage openness, compassion, and following the heart while remaining true to what you feel.",
    career: "Points toward meaningful work, creativity, and emotional fulfillment. Trust your instincts and consider whether the path you're on genuinely inspires you.",
    money: "Encourages an intuitive but balanced relationship with money. Let your values guide financial choices, while keeping emotion from clouding practical judgment.",
  },
  closing: ["The heart is a vessel that remembers", "what the mind has forgotten."],
  unfolding: {
    heading: "THE CUPS ARE STILL UNFOLDING",
    body: [
      "New cards will be added to the Library as they are created.",
      "Return to explore each Cup in depth—its imagery, symbolism,",
      "meaning, and place within the journey of the suit.",
    ],
  },
  metaDescription:
    "The suit of Cups in The World Tarot: emotion, intuition, connection. Cups speak to love, compassion, creativity, and the feelings that shape our experience.",
};

export const pentacles: SuitContent = {
  keywords: "ABUNDANCE · STABILITY · GROWTH",
  essay: [
    "The suit of Pentacles represents the material world—money, work, home, health, and the resources that support our lives. Pentacles ground us in what is tangible, asking us to consider what we are building, protecting, and creating for the future.",
    "This is a suit of steady growth and practical action. Pentacles speak to opportunity, prosperity, security, and the rewards that come through patience, skill, and consistent effort. They remind us that lasting abundance is cultivated over time.",
    "At their highest expression, Pentacles bring stability, self-reliance, and fulfillment—the ability to turn intention into something real, valuable, and enduring.",
  ],
  keyThemes: [
    "money and resources · work and achievement",
    "security & stability · health & well-being",
    "growth & prosperity · patience & perseverance",
  ],
  spheres: {
    love: "Favors loyalty, commitment, and relationships built on a solid foundation. Pentacles bring stability, trust, and the desire to create something lasting together.",
    career: "Signals steady progress, skill, and meaningful achievement. Consistent effort and practical choices can build lasting success and open new opportunities.",
    money: "Strongly connected to prosperity, security, and material growth. Pentacles encourage wise use of resources and building wealth with patience and purpose.",
  },
  closing: [
    "The physical world is where our intentions take form—",
    "through what we build, nurture, value, and sustain",
  ],
  unfolding: {
    heading: "THE PENTACLES ARE STILL UNFOLDING",
    body: [
      "New cards will be added to the Library as they are created.",
      "Return to explore each Pentacle in depth—its imagery, symbolism,",
      "meaning, and place within the journey of the suit.",
    ],
  },
  metaDescription:
    "The suit of Pentacles in The World Tarot: abundance, stability, growth. Pentacles ground us in money, work, home, health, and the resources that support our lives.",
};

export const swords: SuitContent = {
  keywords: "MIND · TRUTH · CLARITY",
  essay: [
    "The suit of Swords represents the realm of the mind—thought, communication, truth, and higher awareness. Swords cut through illusion, revealing what is real and demanding clarity, discernment, and conscious choice.",
    "This is a suit of focused power: the unseen force of intellect, intention, and conviction that can change the course of our lives. Swords often signal decisive moments, necessary change, and the courage to act on what we know.",
    "At their highest expression, they bring insight, purpose, and the mental strength to move forward with clarity and resolve.",
  ],
  keyThemes: [
    "intellect and reasoning · clear communication · truth & honesty",
    "decisions & discernment · boundaries & protection",
    "mental challenges & overthinking · breaking free from old patterns",
  ],
  spheres: {
    love: "Calls for honest communication, clear boundaries, and seeing a relationship as it truly is. Truth may bring understanding—or reveal what needs to change.",
    career: "Favors clear thinking, decisive action, and strategic choices. Focus and sound judgment can cut through obstacles and create a strong path forward.",
    money: "Encourages careful analysis, informed decisions, and a clear-eyed approach to finances. Look beyond emotion and act on facts, not assumptions.",
  },
  closing: ["The mind, when clear, becomes a blade of light", "that cuts through every shadow"],
  unfolding: {
    heading: "THE SWORDS ARE STILL UNFOLDING",
    body: [
      "New cards will be added to the Library as they are created.",
      "Return to explore each Sword in depth—its imagery, symbolism,",
      "meaning, and place within the journey of the suit.",
    ],
  },
  metaDescription:
    "The suit of Swords in The World Tarot: mind, truth, clarity. Swords cut through illusion, demanding discernment and the courage to act on what we know.",
};

export const wands: SuitContent = {
  keywords: "PASSION · ACTION · CREATION",
  essay: [
    "The suit of Wands represents the realm of fire—passion, energy, creativity, ambition, and the spark that moves us to act. Wands speak to inspiration and possibility, urging us to pursue what excites us and bring our ideas to life.",
    "This is a suit of movement and personal power. Wands often signal new beginnings, bold choices, growth, and the determination to move forward. Their energy can be spontaneous and intense, reminding us that inspiration becomes meaningful when we have the courage to act upon it.",
    "At their highest expression, Wands bring confidence, purpose, and creative force—the inner fire that drives us to explore, take risks, overcome challenges, and shape our own direction.",
  ],
  keyThemes: [
    "passion and inspiration · creativity and ambition",
    "action & initiative · courage & confidence",
    "growth & adventure · drive & determination",
  ],
  spheres: {
    love: "Brings passion, attraction, and renewed energy to relationships. Wands encourage openness, spontaneity, and the courage to pursue what—and whom—sets the heart alight.",
    career: "Signals ambition, opportunity, and forward momentum. Take initiative, trust your ideas, and use your creativity and confidence to pursue new possibilities.",
    money: "Encourages bold but purposeful action with finances. New opportunities may emerge through initiative, enterprise, or creative thinking—just temper enthusiasm with good judgment.",
  },
  closing: ["The fire within becomes a force in", "the world when we choose to act"],
  unfolding: {
    heading: "THE WANDS ARE STILL UNFOLDING",
    body: [
      "New cards will be added to the Library as they are created.",
      "Return to explore each Wand in depth—its imagery, symbolism,",
      "meaning, and place within the journey of the suit.",
    ],
  },
  metaDescription:
    "The suit of Wands in The World Tarot: passion, action, creation. Wands speak to inspiration, ambition, and the courage to bring our ideas to life.",
};

/** The four collected, for the tests to iterate. */
export const suitContent: Record<string, SuitContent> = { cups, pentacles, swords, wands };
