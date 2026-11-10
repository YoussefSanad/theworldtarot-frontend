import { cardReference, cardSymbols } from "@/lib/assets";
import type { ImageAsset } from "@/lib/assets";

/**
 * A Major Arcana card's reference page content — the Figma frame `357:261`
 * ("THE FOOL 2 FLAT") turned into data.
 *
 * **All twenty-two cards have a record here now.** The Fool's was transcribed
 * from her frame; the other twenty-one were imported from her
 * `LIBRARY CARDS CONTENT 1.xls` by `scripts/import-card-content.mjs`, which is
 * committed so the import can be re-run but is not part of the build.
 *
 * `MajorArcanaCard.content` stays optional, which is still the mechanism — the
 * four suit pages have no record and keep their `ComingSoonPage` placeholder —
 * but no Major Arcana card reaches it any more.
 *
 * **The imported copy is verbatim, and that is a deliberate departure.** The
 * rule `library.ts` keeps for card names — outright misspellings fixed — was
 * NOT applied to the twenty-one, at the client's instruction of 2026-09-28. So
 * her `SOVREIGNTY` (The Emperor's keyword), her `fufillment` (The Empress's
 * summary), her Magician shadow text (a verbatim copy of The Fool's) and her
 * Wheel/Hermit shared quote all ship as she wrote them, and are raised with her
 * instead. **The Fool is the exception**: his `the unkown` correction predates
 * that instruction and stays, which makes his the only non-verbatim page.
 *
 * Her stray duplicate `MONEY` layer (357:292, a second heading sitting behind
 * the real one at a different size) is still not drawn, the same judgement the
 * grid makes about The Tower appearing twice.
 *
 * **Two separator characters were normalized on import, which is not a copy
 * correction.** Her sheet breaks eighteen of the twenty-one essays with U+2028
 * rather than a newline, and mixes U+00B7 with U+2022 as the bullet in
 * fifty-seven places. Both are invisible in an editor; the first would collapse
 * an essay into one paragraph and the second would draw two different dots on
 * one line. `card-content.test.ts` pins that neither survives.
 *
 * **This file is the source, not a placeholder for an API call.** These pages
 * are statically exported to be indexed, so their copy belongs at build time.
 * What a backend version would cost, and the one refactor that would make it
 * cheap, is in `docs/plans/card-content-backend-readiness.md`.
 */

/** One of the four columns in the "When … Appears in a Reading" panel. */
export type AppearsColumn = {
  readonly icon: ImageAsset;
  /** Cinzel, gold, 22px — "new beginnings". */
  readonly label: string;
  readonly body: string;
};

/** One labelled symbol in the meta strip along the bottom. */
export type MetaEntry = {
  readonly symbol: ImageAsset;
  /** Cinzel, 22px, drawn under the symbol — "air", "URANUS". */
  readonly value: string;
};

export type CardMeta = {
  readonly element: MetaEntry;
  readonly planet: MetaEntry;
  readonly sign: MetaEntry;
  readonly keyword: MetaEntry;
  /**
   * The fifth of a uniform row. Her PSD draws a compass over it like the other
   * four; the Figma frame's omission of that glyph was a reading error.
   */
  readonly yesNo: MetaEntry;
};

export type MajorArcanaContent = {
  /** Cinzel, 36px — "Wonder • Trust • Beginning". */
  readonly keywords: string;
  /** Magically, 30px — "Step into the unknown". */
  readonly subtitle: string;
  /** The three paragraphs beside the artwork. */
  readonly essay: readonly string[];
  /**
   * **Exactly four.** The panel draws four columns with three rules between
   * them; a fifth or a third would break that grid silently, so the count is a
   * property of the design and belongs in the type rather than in a comment.
   */
  readonly appears: readonly [AppearsColumn, AppearsColumn, AppearsColumn, AppearsColumn];
  /** Two lines of "•"-separated phrases, centred under "LOOK FOR:". */
  readonly lookFor: readonly string[];
  /**
   * Three distinct labelled panels rather than a list — her frame draws love,
   * career and money by name, and they are not interchangeable.
   */
  readonly spheres: {
    readonly love: string;
    readonly career: string;
    readonly money: string;
  };
  /** The three lines inside the shadow panel. */
  readonly shadow: readonly string[];
  readonly meta: CardMeta;
  /**
   * The line the page closes on, between two green rules.
   *
   * **Her own two lines, not one string left to wrap.** She breaks it after
   * "know -", and `Phrase` breaks between parts rather than inside them, so
   * these are the parts — see `components/ui/Phrase.tsx`.
   */
  readonly closing: readonly string[];
  /** This page's own meta description; see `cardMeta()` in `library.ts`. */
  readonly metaDescription: string;
};

export const theFool: MajorArcanaContent = {
  keywords: "Wonder • Trust • Beginning",
  subtitle: "Step into the unknown",
  essay: [
    "The Fool is the archetype of sacred beginning—the moment when possibility remains open and the future has not yet narrowed into form. Often misunderstood as naïve or careless, The Fool understands that transformation rarely begins with complete knowledge. Every meaningful journey reaches a point where logic ends and trust begins.",
    "The Fool appears at thresholds: a new relationship, a departure, a creative leap, a relocation, an act of faith. Traditionally depicted at the edge of a precipice, it represents the tension between caution and possibility. It does not deny risk; it accepts uncertainty as part of moving toward what comes next.",
    "At its deepest level, The Fool asks what might become possible if fear were no longer making the decisions. Certainty can become a prison, and many of life's defining experiences begin before confidence arrives. The path reveals itself through movement. The invitation is not to know—it is to begin.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "new beginnings",
      body: "A new path is opening. A beginning of a journey, opportunity, relationship, or direction.",
    },
    {
      icon: cardReference.appearsIcon2,
      /* Her frame reads "the unkown" — an outright misspelling, so it is fixed. */
      label: "the unknown",
      body: "The way forward is not yet fully visible. Some answers can only be discovered by moving ahead.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "risk and trust",
      body: "Every new path carries uncertainty. Trust is the willingness to move forward without a guaranteed outcome.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "the threshold",
      body: "You are between what has been and what comes next. Crossing forward means leaving the familiar behind.",
    },
  ],
  lookFor: [
    "new opportunities • unexpected beginnings • travel or relocation",
    "creative leaps • new relationships • a change in direction",
  ],
  spheres: {
    /*
      **Each of these three strings contains literal U+00A0 characters, and
      they are load-bearing.** The client asked that no box end on a lone word
      — she named "growth" under career and "decisions" under money — so the
      last two or three words of each paragraph are joined by non-breaking
      spaces and travel to the next line together as a phrase.

      **They are invisible in an editor: they look exactly like ordinary
      spaces.** Retyping one of these lines, or letting a tool "clean up"
      whitespace, silently undoes the fix and the orphan comes back. Check with
      `grep -P '\xc2\xa0'` before assuming a wrap bug is a CSS problem.

      `SpheresCarousel` also sets `text-pretty`, which handles the general case
      — these three pin the ones she actually pointed at.
    */
    love: "A fresh emotional start. You or someone new may be stepping into your life. Stay open to connection without expecting it to look a certain way.",
    career: "A new path, project, or opportunity is emerging. It may feel risky, but it aligns with your growth.",
    money: "Financial beginnings or a shift in direction. Take inspired action, but avoid impulsive or careless decisions.",
  },
  shadow: [
    "recklessness • impulsivity • ignoring important details",
    "avoiding responsibility • unrealistic expectations • acting before thinking",
    "ground enthusiasm with awareness and preparation",
  ],
  /*
    **His glyphs come from the shared set, like every other card's.** They used
    to be his own one-off exports (`symbol-air`, `symbol-uranus`,
    `symbol-aquarius`, `symbol-compass`) from the days when his was the only
    page. Checked against the client's packet set: air, uranus and aquarius are
    the same artwork at 2x, so keeping his would have been two files drawing one
    glyph — and his would drift the moment hers were re-cut.

    **The verdict glyph is a real change, not a dedupe.** His `symbol-compass`
    is a generic pointed star used for YES; her set draws three distinct marks
    for yes, no and maybe, so the row now says which verdict it is rather than
    just marking that there is one. The other twenty-one already read that way.
  */
  meta: {
    element: { symbol: cardSymbols.air, value: "air" },
    planet: { symbol: cardSymbols.uranus, value: "URANUS" },
    sign: { symbol: cardSymbols.aquarius, value: "AQUARIUS" },
    keyword: { symbol: cardReference.symbolKey, value: "MANIFESTATION" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["The invitation is not to know -", "it is to begin"],
  metaDescription:
    "The Fool tarot card meaning in The World Tarot: wonder, trust and beginning. The archetype of sacred beginning — the moment when possibility remains open and the future has not yet narrowed into form.",
};

export const theMagician: MajorArcanaContent = {
  keywords: "WILL • FOCUS • CREATION",
  subtitle: "As above, so below",
  essay: [
    "Creation begins when possibility is given direction. The Magician represents the moment an idea moves beyond imagination and starts becoming real. Inspiration is present, but it is intention—attention, choice, and action—that gives it form.",
    "There are times when waiting serves a purpose, and times when it becomes a way of standing still. The Magician appears when something is ready to be used: an ability, an idea, an opportunity, a conversation, or a resource already within reach.",
    "Transformation comes through participation, not observation.",
    "At its deepest level, this card asks what you might create if you stopped waiting for permission. What you need may already be closer than you think. The invitation is not to wish—it is to act.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "Conscious Creation",
      body: "An idea is ready to take form. Intention gives possibility direction.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "The Will",
      body: "Focus strengthens what you choose to create. Your attention is part of your power.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "Use What You Have",
      body: "The tools are already within reach. Skill becomes powerful when it is put into practice.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "Make It Real",
      body: "Move from intention into action. What you begin shaping now can become tangible.",
    },
  ],
  lookFor: [
    "focused intention • creative power • communication • initiative • useful resources • new relationships • ideas becoming real",
  ],
  spheres: {
    love: "Intentions become clear. A connection can deepen through direct communication and genuine effort. Attraction is present, but what happens next depends on what you choose to create together.",
    career: "Your abilities are ready to be put to use. Take initiative, communicate clearly, and turn an idea or opportunity into something tangible.",
    money: "Resources can be used more deliberately. An idea, skill, or opportunity may have real financial potential. Work with what you have and turn it into something of value.",
  },
  shadow: [
    "recklessness • impulsivity • ignoring important details • avoiding responsibility • unrealistic expectations • acting before thinking",
    "ground enthusiasm with awareness and preparation",
  ],
  meta: {
    element: { symbol: cardSymbols.air, value: "air" },
    planet: { symbol: cardSymbols.mercury, value: "MERCURY" },
    sign: { symbol: cardSymbols.gemini, value: "GEMINI" },
    keyword: { symbol: cardReference.symbolKey, value: "FOCUS" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["Intention gives possibility form"],
  metaDescription: "The Magician tarot card meaning in The World Tarot: will • focus • creation. Creation begins when possibility is given direction.",
};

export const theHighPriestess: MajorArcanaContent = {
  keywords: "MYSTERY • INTUITION • STILLNESS",
  subtitle: "What is hidden seeks to be revealed",
  essay: [
    "The High Priestess appears when something important is not yet fully visible. She represents intuition, inner knowing, and the quiet intelligence that recognizes what lies beneath the surface. Not everything announces itself. Some knowledge arrives as a feeling, a pattern, a dream, or a certainty you cannot yet explain.",
    "Her presence asks you to pay attention before you act. There may be more happening than you can presently see, and forcing an answer may only obscure it. Watch what repeats. Notice what feels significant. Listen to what remains when the noise around you falls away.",
    "At her deepest level, the High Priestess asks: what do you already know, even without proof? The answer may not require pursuit or action yet. Sometimes clarity comes from becoming still enough to recognize what has been there all along.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "Inner Knowing",
      body: "The answer may already be within you. Trust what you sense before you can explain it.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "Beneath the Surface",
      body: "Pay attention to dreams, patterns, feelings, and the quiet signals you might otherwise dismiss.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "Do Not Force It",
      body: "Not everything is ready to be revealed. Pushing for certainty may make the truth harder to see.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "Wait and Watch",
      body: "Become still. Observe what unfolds. The next step will become clearer when the time is right.",
    },
  ],
  lookFor: [
    "intuition • hidden information • meaningful patterns • dreams and symbols • unspoken feelings • inner guidance • mystery • emerging truth",
  ],
  spheres: {
    love: "Something may be felt before it is spoken. Pay attention to what your intuition is telling you about this connection.",
    career: "Trust what you sense about your work. Pay attention to what is happening beneath the surface before making your next move.",
    money: "Look beyond the numbers. Pay attention to patterns, hidden factors, and what your instincts are telling you before making a financial decision.",
  },
  shadow: [
    "secrecy • withdrawal • self-doubt • hidden motives • ignoring intuition • withholding truth • emotional distance • fear of what may be revealed",
    "Intuition loses its power when fear, secrecy, or avoidance takes its place.",
  ],
  meta: {
    element: { symbol: cardSymbols.water, value: "water" },
    planet: { symbol: cardSymbols.moon, value: "MOON" },
    sign: { symbol: cardSymbols.cancer, value: "CANCER" },
    keyword: { symbol: cardReference.symbolKey, value: "REVELATION" },
    yesNo: { symbol: cardSymbols.maybe, value: "MAYBE/NOT YET" },
  },
  closing: ["What is quiet is not empty"],
  metaDescription: "The High Priestess tarot card meaning in The World Tarot: mystery • intuition • stillness. The High Priestess appears when something important is not yet fully visible.",
};

export const theEmpress: MajorArcanaContent = {
  keywords: "abundance • ease • fufillment",
  subtitle: "All things move toward fullness",
  essay: [
    "Growth begins with what we choose to nurture. The Empress represents creation, abundance, and the power of giving sustained attention to what matters. An idea, relationship, opportunity, or part of yourself may be ready to develop into something fuller.",
    "Not everything can be hurried into being. What flourishes does so through care, patience, and participation. Notice what you are feeding with your time and energy. What you consistently tend will gradually take root and become something more.",
    "At her deepest level, the Empress asks: what in your life is ready to be nurtured? Abundance is not only something you receive—it is something you help create. Give your attention to what feels alive, and allow it the space and care it needs to become full.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "CREATIVE ABUNDANCE",
      body: "Something is ready to grow. Give it your attention, care, and energy, and allow it to become more.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "WHAT IS NURTURED",
      body: "Your attention gives life to what matters. What you care for has the potential to grow and flourish.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "LET IT GROW",
      body: "Growth has its own rhythm. Create the right conditions, then give what is developing room to unfold.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "BRING IT TO LIFE",
      body: "Turn your care into action. Give time, energy, and resources to what you want to see flourish.",
    },
  ],
  lookFor: [
    "growth • creativity • abundance • comfort • beauty • generosity",
    "new possibilities • fertile ideas • supportive relationships • pleasure",
  ],
  spheres: {
    love: "Love grows through warmth, affection, and genuine care. Let yourself give and receive without losing sight of your own needs.",
    career: "Creative work and promising ideas have room to flourish. Invest your energy where you see genuine potential for growth.",
    money: "Resources can expand when they are handled with care. Favor choices that build lasting security, value, and abundance over time.",
  },
  shadow: [
    "overindulgence • dependency • possessiveness • stagnation",
    "overgiving • smothering care • creative blocks • neglecting your own needs",
    "Abundance loses its balance when care becomes excess or giving becomes depletion.",
  ],
  meta: {
    element: { symbol: cardSymbols.earth, value: "earth" },
    planet: { symbol: cardSymbols.venus, value: "VENUS" },
    sign: { symbol: cardSymbols.taurus, value: "TAURUS" },
    keyword: { symbol: cardReference.symbolKey, value: "CREATION" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["What is intended comes to life"],
  metaDescription: "The Empress tarot card meaning in The World Tarot: abundance • ease • fufillment. Growth begins with what we choose to nurture.",
};

export const theEmperor: MajorArcanaContent = {
  keywords: "authority •structure • leadership",
  subtitle: "What is ordered gains strength",
  essay: [
    "What is built with purpose has the strength to endure. The Emperor represents order, responsibility, boundaries, and the ability to sustain what has been built. His authority does not come from control or dominance, but from steadiness, clarity, and the willingness to carry responsibility over time.",
    "The Emperor appears when circumstances require decision, leadership, and definition. A foundation may need to be established, boundaries strengthened, or long-term stability chosen over immediate comfort. Growth alone is not enough. What is created must also be protected and supported if it is to endure.",
    "At his deepest level, The Emperor asks: what deserves to become lasting? Power is not measured by what can be controlled, but by what can be sustained. Order is not the opposite of freedom—it is the structure that allows freedom to endure.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "ESTABLISHING ORDER",
      body: "Clear boundaries give form to intention, allowing plans and decisions to take lasting shape.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "WHAT HOLDS FIRM",
      body: "Inner stability comes from knowing what is essential. Clear values, firm boundaries, and a sense of purpose create steadiness when circumstances are uncertain.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "do not force it",
      body: "Not everything is ready to be revealed. Pushing for certainty can make the truth harder to see.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "ESTABLISH & SUSTAIN",
      body: "Create order, define what matters, and give lasting form to what has already begun.",
    },
  ],
  lookFor: [
    "order • authority • leadership • boundaries • responsibility • stability • discipline  protection • long-term planning • established systems • lasting foundations",
  ],
  spheres: {
    love: "A relationship may be moving toward greater commitment or definition. Feelings may be expressed through loyalty, protection, and dependable action rather than open emotion.",
    career: "Greater authority or responsibility may be emerging. Leadership, decisive action, and a clear plan can lead to advancement or a stronger professional position.",
    money: "Finances benefit from careful management and long-term planning. Protecting existing resources and making deliberate choices can strengthen the financial position over time.",
  },
  shadow: [
    "control • rigidity • dominance • stubbornness • excessive rules",
    "misuse of authority • resistance to change • emotional restraint",
    "Structure becomes confinement when authority leaves no room for flexibility or change.",
  ],
  meta: {
    element: { symbol: cardSymbols.fire, value: "fire" },
    planet: { symbol: cardSymbols.mars, value: "MARS" },
    sign: { symbol: cardSymbols.aries, value: "ARIES" },
    keyword: { symbol: cardReference.symbolKey, value: "SOVREIGNTY" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["Order creates power"],
  metaDescription: "The Emperor tarot card meaning in The World Tarot: authority •structure • leadership. What is built with purpose has the strength to endure.",
};

export const theHighPriest: MajorArcanaContent = {
  keywords: "RITUAL • AUTHORITY • BELIEF",
  subtitle: "No truth arrives untouched",
  essay: [
    "The High Priest represents the traditions, teachings, and rituals through which knowledge is preserved and passed forward. Meaning is rarely encountered in isolation; it is shaped through symbols, stories, language, and systems of belief that connect one generation to the next.",
    "The High Priest appears in moments of guidance, learning, and inherited understanding. A teacher, institution, tradition, or established path may offer direction, but every teaching arrives shaped by interpretation. What is received can be respected without being accepted without question.",
    "At his deepest level, The High Priest asks: where does belief begin? Wisdom is often received before it is fully understood, carried through rituals and traditions whose origins may reach far beyond the present. The invitation is to recognize what has been inherited, understand the authority it holds, and determine what remains meaningful.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "WHAT TO BELIEVE",
      body: "A teaching, belief, or source of authority may be shaping the situation. Consider what is being accepted as truth—and whether it still holds meaning.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "WHO TO TRUST",
      body: "Not every source of guidance carries equal weight. Discernment reveals which voices hold meaning and which no longer deserve influence.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "QUESTION AUTHORITY",
      body: "Guidance can offer direction without becoming absolute truth. Wisdom includes knowing when to follow and when to question.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "FOLLOW WISELY",
      body: "Move toward what offers meaning, while remaining conscious of the authority given to any person, teaching, or path.",
    },
  ],
  lookFor: [
    "ritual • teachers • institutions • inherited knowledge • sacred symbols",
    "mentors • initiation • ceremony • doctrine • ancient wisdom",
  ],
  spheres: {
    love: "Shared values or expectations may shape the relationship. Commitment can deepen when both people want the same things from love.",
    career: "A mentor or established system may influence the path forward. Progress can come through learning, experience, or respected guidance.",
    money: "Financial choices may be influenced by established advice or conventional thinking. Trusted expertise can help bring greater clarity to important decisions.",
  },
  shadow: [
    "dogma • blind obedience • conformity • rigid beliefs • unquestioned authority",
    "judgment • intolerance • dependence on approval",
    "Belief becomes limiting when authority replaces independent thought.",
  ],
  meta: {
    element: { symbol: cardSymbols.earth, value: "earth" },
    planet: { symbol: cardSymbols.venus, value: "VENUS" },
    sign: { symbol: cardSymbols.taurus, value: "TAURUS" },
    keyword: { symbol: cardReference.symbolKey, value: "BELIEF" },
    yesNo: { symbol: cardSymbols.maybe, value: "MAYBE/NOT YET" },
  },
  closing: ["Truth is remembered, not taught"],
  metaDescription: "The High Priest tarot card meaning in The World Tarot: ritual • authority • belief. The High Priest represents the traditions, teachings, and rituals through which knowledge is preserved and passed forward.",
};

export const theLovers: MajorArcanaContent = {
  keywords: "Connection • Choice • Union",
  subtitle: "To join is to transform",
  essay: [
    "The Lovers does not begin with romance. It begins with recognition—the unsettling sense of encountering a person, path, or possibility that feels familiar before it can be explained. The card appears at moments of convergence, when attraction and choice seem to occupy the same space.",
    "Traditionally shown as a union, The Lovers represents more than partnership. It reflects the meeting of forces: instinct and reason, freedom and devotion, the known self and the self that has not yet emerged. True connection rarely leaves either side unchanged, and what draws us forward may also ask something of us in return.",
    "At its deepest level, The Lovers asks: what are we willing to choose? Meaningful encounters may arrive unexpectedly, but participation remains a choice. Transformation does not always come through struggle; sometimes it enters as longing, recognition, or desire. The question is not simply what calls to us, but whether we answer.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "THE CHOICE",
      body: "A powerful connection or possibility has appeared. What follows depends on the willingness to engage with it.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "WHAT DRAWS US",
      body: "Attraction can reveal something before reason understands it. Longing, recognition, and desire often point toward what carries deeper meaning.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "BEYOND ATTRACTION",
      body: "A powerful connection can feel inevitable. What matters is whether it can withstand clarity, choice, and the reality of what it asks in return.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "THE ANSWER",
      body: "Recognition becomes meaningful when it is met with choice. What begins as attraction can become a bond that changes what comes next.",
    },
  ],
  lookFor: [
    "attraction • chemistry • partnership • meaningful choices • recognition • desire • compatibility • commitment • shared values • temptation • union • crossroads",
  ],
  spheres: {
    love: "Powerful attraction may be developing. The connection has potential, but a choice about commitment or the future may arise.",
    career: "The right partnership can open new opportunities. Collaboration may accomplish what would be difficult to achieve alone.",
    money: "Shared finances or agreements come into focus. Cooperation and mutual trust can strengthen resources.",
  },
  shadow: [
    "indecision • temptation • divided loyalties • unhealthy attachment • projection",
    "dependency • betrayal • misalignment • avoidance of commitment",
    "Connection loses its meaning when desire overrides truth, choice, or mutual respect.",
  ],
  meta: {
    element: { symbol: cardSymbols.air, value: "air" },
    planet: { symbol: cardSymbols.venus, value: "VENUS" },
    sign: { symbol: cardSymbols.gemini, value: "GEMINI" },
    keyword: { symbol: cardReference.symbolKey, value: "UNION" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["Choice reveals the heart"],
  metaDescription: "The Lovers tarot card meaning in The World Tarot: connection • choice • union. The Lovers does not begin with romance.",
};

export const theChariot: MajorArcanaContent = {
  keywords: "Will • Direction • Triumph",
  subtitle: "What is guided arrives",
  essay: [
    "The Chariot represents the moment movement becomes intentional. It appears when something within has become stronger than hesitation, creating the determination to move forward even before every question has been answered.",
    "This card often arrives during periods of acceleration—departures, commitments, ambition, relocation, recovery, or any time life demands action before certainty. Progress does not require the absence of contradiction. Fear and desire, instinct and restraint, freedom and responsibility can all travel together when held toward the same purpose.",
    "At its deepest level, The Chariot asks: what is strong enough to carry forward? Clarity does not always come before action. Sometimes the road reveals itself only through movement, and confidence develops by continuing long enough to discover where the path leads.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "DIRECTED WILL",
      body: "Purpose and determination bring opposing forces into alignment, creating the momentum needed to move steadily toward a chosen destination.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "DRIVEN FORWARD",
      body: "Desire has become stronger than doubt. Conflicting emotions may remain, but the determination to continue now carries greater force.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "HOLD THE COURSE",
      body: "Speed and determination can become reckless when direction is lost. Progress depends on keeping competing forces aligned without allowing momentum to take control.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "ACCELERATION",
      body: "Events begin moving quickly once commitment is made. Momentum builds through continued action, carrying the situation beyond its previous limits.",
    },
  ],
  lookFor: [
    "momentum • determination • ambition • travel • relocation • victory • self-control decisive action • perseverance • competing forces • forward progress",
  ],
  spheres: {
    love: "Momentum is building in love. Obstacles can be overcome, but both people need to be heading in the same direction.",
    career: "Ambition and focused effort drive progress. Advancement or a decisive career move may be gathering momentum.",
    money: "Financial progress comes through discipline and clear goals. Focused effort can move resources steadily forward.",
  },
  shadow: [
    "recklessness • aggression • impatience • loss of control • scattered energy",
    "forcing outcomes • burnout • obsession with winning • poor direction",
    "Momentum becomes destructive when the need to advance overrides judgment or restraint.",
  ],
  meta: {
    element: { symbol: cardSymbols.water, value: "water" },
    planet: { symbol: cardSymbols.moon, value: "MOON" },
    sign: { symbol: cardSymbols.cancer, value: "CANCER" },
    keyword: { symbol: cardReference.symbolKey, value: "VICTORY" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["Will moves the world"],
  metaDescription: "The Chariot tarot card meaning in The World Tarot: will • direction • triumph. The Chariot represents the moment movement becomes intentional.",
};

export const strength: MajorArcanaContent = {
  keywords: "Courage • Restraint • Devotion",
  subtitle: "What is gentle endures.",
  essay: [
    "Strength represents an inner force that does not rely on domination or control. It appears in moments that demand steadiness—enduring uncertainty, caring for something difficult, holding a boundary, or meeting fear without becoming governed by it. Its power is often revealed through consistency rather than force.",
    "Traditionally shown beside a great beast, Strength represents the relationship between instinct and awareness, desire and discipline, wildness and restraint. The beast is not conquered. What is powerful is met with presence, suggesting that what appears gentle may possess greater endurance than what appears unbreakable.",
    "At its deepest level, Strength asks: what can be met without fear? Transformation does not always happen through dramatic action. Sometimes it happens through staying, returning, and discovering that gentleness and power were never opposites at all.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "INNER POWER",
      body: "True strength does not require force. Courage and self-command allow powerful emotions to be met without taking control.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "STEADY WITHIN",
      body: "Powerful emotions can be acknowledged without taking control. Strength grows through remaining grounded in their presence.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "WITHOUT FORCE",
      body: "Control can create greater resistance. Patience and restraint offer another kind of power.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "ENDURING",
      body: "Patience and persistence create lasting change. Difficult circumstances can soften without being forced.",
    },
  ],
  lookFor: [
    "courage • resilience • patience • self-control • endurance",
    "compassion • restraint • confidence • persistence",
  ],
  spheres: {
    love: "Patience and emotional maturity strengthen the connection. Difficulties can be worked through with compassion rather than control.",
    career: "Steady effort and quiet confidence overcome challenges. Persistence and self-command bring continued progress.",
    money: "Financial stability grows through patience and discipline. Consistent choices strengthen resources over time.",
  },
  shadow: [
    "courage • resilience • patience • self-control • endurance",
    "compassion • restraint • confidence • persistence",
    "Power becomes destructive when it turns to control.",
  ],
  meta: {
    element: { symbol: cardSymbols.fire, value: "fire" },
    planet: { symbol: cardSymbols.sun, value: "SUN" },
    sign: { symbol: cardSymbols.leo, value: "LEO" },
    keyword: { symbol: cardReference.symbolKey, value: "COURAGE" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["Strength needs no force"],
  metaDescription: "Strength tarot card meaning in The World Tarot: courage • restraint • devotion. Strength represents an inner force that does not rely on domination or control.",
};

export const theHermit: MajorArcanaContent = {
  keywords: "Solitude • Reflection • Wisdom",
  subtitle: "What is sought waits within",
  essay: [
    "The Hermit represents chosen distance—the movement away from noise and expectation in order to encounter something quieter and more enduring. It appears during periods of retreat, reflection, or reorientation, when familiar answers no longer seem sufficient and understanding requires a different kind of attention.",
    "Traditionally shown carrying a lantern into darkness, The Hermit represents the search for wisdom that cannot simply be inherited from others. The lantern illuminates only what is necessary for the next step, suggesting that clarity rarely arrives all at once. It gathers slowly through observation, patience, and experience.",
    "At his deepest level, The Hermit asks: what becomes visible in stillness? Not every question requires an immediate answer. Sometimes stepping away allows what matters to come into focus—and makes it possible to return with clearer eyes.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "CHOSEN DISTANCE",
      body: "A powerful connection or possibility has appeared. What follows depends on the willingness to engage with it.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "QUIET REFLECTION",
      body: "Answers may feel distant or incomplete. Time alone allows deeper thoughts and understanding to emerge without outside influence.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "RESISTING ISOLATION",
      body: "Solitude can become avoidance. Reflection loses its purpose when distance becomes a way of hiding from life.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "FOLLOW THE LIGHT",
      body: "Clarity comes gradually. Move forward with what is known, allowing the next step to reveal itself in time.",
    },
  ],
  lookFor: [
    "solitude • reflection • retreat • wisdom • introspection • patience",
    "contemplation • guidance • self-discovery",
  ],
  spheres: {
    love: "Distance or time alone may be needed to understand what the heart truly wants. Clarity comes through reflection rather than pursuit.",
    career: "A period of reflection may clarify the professional path ahead. Independent work, study, or stepping back can reveal the next direction.",
    money: "A quieter, more cautious approach to finances may be wise. Careful reflection can reveal where resources are best preserved or directed.",
  },
  shadow: [
    "isolation • withdrawal • loneliness • avoidance • detachment",
    "secrecy • overthinking • disconnection",
    "Solitude becomes limiting when reflection turns into retreat.",
  ],
  meta: {
    element: { symbol: cardSymbols.earth, value: "earth" },
    planet: { symbol: cardSymbols.mercury, value: "MERCURY" },
    sign: { symbol: cardSymbols.virgo, value: "VIRGO" },
    keyword: { symbol: cardReference.symbolKey, value: "INSIGHT" },
    yesNo: { symbol: cardSymbols.maybe, value: "MAYBE/NOT YET" },
  },
  closing: ["Go within to see clearly"],
  metaDescription: "The Hermit tarot card meaning in The World Tarot: solitude • reflection • wisdom. The Hermit represents chosen distance—the movement away from noise and expectation in order to encounter something quieter and more enduring.",
};

export const theWheel: MajorArcanaContent = {
  keywords: "Change • Cycles • Fate",
  subtitle: "The Wheel is turning",
  essay: [
    "The Wheel represents movement beyond individual control —the turning force through which beginnings, endings, encounters, and transformations take shape. It appears when events seem to be rearranging themselves, bringing unexpected opportunities, endings, or encounters that alter the direction of what comes next.",
    "Traditionally depicted as a great turning mechanism, The Wheel represents the relationship between order and uncertainty. Things rise and fall, paths intersect and separate, and what disappears may return in another form. The same forces that close one chapter can create the conditions for another to begin.",
    "At its deepest level, The Wheel asks: what is already in motion? Not everything can be controlled or understood as it happens. Some patterns reveal themselves only with distance. Change is not an interruption—it is the movement through which life continues to unfold.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "FATE IN MOTION",
      body: "Something beyond personal control is already unfolding. Fate, timing, and circumstance are guiding what comes next.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "LETTING GO",
      body: "The need to control the outcome begins to loosen. Uncertainty feels less threatening when not everything has to be decided in advance.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "RESISTANCE",
      body: "The need for certainty can make unexpected turns difficult to accept. Trying to control every outcome creates tension when circumstances begin to shift.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "TURNING POINT",
      body: "Circumstances begin to shift. What has been set in motion carries the situation toward a new phase.",
    },
  ],
  lookFor: [
    "fate • timing • synchronicity • cycles • chance • destiny • turning points",
    "• unexpected opportunities • reversals • recurring pattern",
  ],
  spheres: {
    love: "A chance meeting may bring someone significant into the picture, while an existing relationship may enter a new phase. Timing plays an important role.",
    career: "A change in circumstances may redirect work in a way that could not have been planned. The right opportunity may arrive at the right time.",
    money: "Fortunes can change. A financial opening, reversal, or shift in circumstances may alter what is possible.",
  },
  shadow: [
    "fatalism • passivity • resistance • repeating patterns • bad timing •",
    "missed opportunities • feeling powerless • leaving too much to chance",
    "Fate becomes limiting when surrender turns into resignation.",
  ],
  meta: {
    element: { symbol: cardSymbols.fire, value: "fire" },
    planet: { symbol: cardSymbols.jupiter, value: "JUPITER" },
    sign: { symbol: cardSymbols.sagittarius, value: "SAGITTARIUS" },
    keyword: { symbol: cardReference.symbolKey, value: "DESTINY" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["Go within to see clearly"],
  metaDescription: "The Wheel tarot card meaning in The World Tarot: change • cycles • fate. The Wheel represents movement beyond individual control —the turning force through which beginnings, endings, encounters, and transformations take shape.",
};

export const justice: MajorArcanaContent = {
  keywords: "Truth • Balance • Consequence",
  subtitle: "Truth becomes apparent",
  essay: [
    "Some forces announce themselves immediately. Justice works more slowly. It reveals itself through accumulation—the recognition that actions, intentions, and consequences continue shaping what follows. It appears when something must be weighed clearly and what has become apparent can no longer be ignored.",
    "Traditionally depicted holding scales and a blade, Justice represents discernment and action. One reveals what is present; the other responds to it. Not every imbalance corrects itself immediately, and not every truth arrives when expected. Patterns continue. Actions accumulate. Eventually, their meaning becomes clear.",
    "At its deepest level, Justice asks: what remains when everything is weighed? Consequence is not always imposed from outside. Often it is simply the natural shape of things becoming visible. In time, what is hidden separates from what is true—and truth becomes apparent.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "TRUTH REVEALED",
      body: "Actions and choices carry consequences. What has accumulated begins to surface, bringing the reality of a situation into clearer view.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "CLEAR RECOGNITION",
      body: "A truth becomes difficult to ignore. Feelings and assumptions begin to separate from what is actually known.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "FACING CONSEQUENCES",
      body: "What has been avoided may now require acknowledgment. Past choices can become difficult to separate from their results.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "RESTORING BALANCE",
      body: "Clarity changes what happens next. Decisions made from what is now known can bring the situation back into balance.",
    },
  ],
  lookFor: [
    "truth • consequences • accountability • decisions • fairness • clarity",
    "cause and effect • legal matters • agreements • responsibility • resolution",
  ],
  spheres: {
    love: "A relationship may require honesty about what is working and what is not. Choices made now can bring greater balance or reveal where it is missing.",
    career: "Decisions at work may have lasting consequences. Fairness, accountability, and clear judgment can determine how the situation develops.",
    money: "Financial choices come into focus. Past decisions may show their consequences, making it easier to see what needs to change.",
  },
  shadow: [
    "judgment • blame • self-righteousness • harshness • denial • dishonesty • unfairness",
    "avoidance of responsibility • unresolved consequences",
    "Truth becomes distorted when judgment replaces discernment.",
  ],
  meta: {
    element: { symbol: cardSymbols.air, value: "air" },
    planet: { symbol: cardSymbols.venus, value: "VENUS" },
    sign: { symbol: cardSymbols.libra, value: "LIBRA" },
    keyword: { symbol: cardReference.symbolKey, value: "TRUTH" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["Truth becomes distorted when judgment replaces discernment"],
  metaDescription: "Justice tarot card meaning in The World Tarot: truth • balance • consequence. Some forces announce themselves immediately.",
};

export const theHangman: MajorArcanaContent = {
  keywords: "SURRENDER • STILLNESS • PERSPECTIVE",
  subtitle: "A different way of seeing",
  essay: [
    "The Hanged Man represents the moment when movement gives way to stillness. It appears when pushing forward no longer brings clarity, and something needs time or space before the next step becomes apparent. What feels like a delay may allow a different understanding to emerge.",
    "Traditionally depicted suspended upside down by one foot, The Hanged Man holds an unusual position with an expression of calm. The world has not changed, but the way it is seen has. The card represents a willingness to loosen familiar assumptions and remain with what cannot yet be resolved.",
    "At its deepest level, The Hanged Man asks: what becomes visible when you stop trying to move things forward? Some understanding arrives only when the effort to force an answer subsides. In stillness, what once seemed fixed can reveal another possibility.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "SUSPENSION",
      body: "Something is on hold. A pause in outward movement creates space to observe what has been difficult to see.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "LETTING GO",
      body: "An expectation or attachment begins to loosen. Allowing the situation to remain unresolved may reveal an option that pressure has obscured.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "RESISTANCE",
      body: "The need for progress can make stillness uncomfortable. Trying to force a decision may keep attention fixed on an approach that is no longer working.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "NEW PERSPECTIVE",
      body: "A familiar situation takes on a different meaning. Changing how it is understood can reveal where movement is possible.",
    },
  ],
  lookFor: [
    "surrender • stillness • suspension • perspective • patience • release • reflection • uncertainty • acceptance • reconsideration",
  ],
  spheres: {
    love: "A relationship may need space for reflection. Stepping back from expectations can make another person’s perspective easier to understand.",
    career: "Progress at work may slow or require a different approach. Time spent reconsidering a goal or method can clarify what is worth pursuing.",
    money: "A financial decision may benefit from a pause. Reconsidering priorities can reveal which commitments still serve a purpose and which need to change.",
  },
  shadow: [
    "stagnation • avoidance • martyrdom • helplessness • indecision • unnecessary sacrifice • prolonged waiting • refusing to let go",
    "Surrender becomes limiting when acceptance turns into self-abandonment.",
  ],
  meta: {
    element: { symbol: cardSymbols.water, value: "water" },
    planet: { symbol: cardSymbols.neptune, value: "NEPTUNE" },
    sign: { symbol: cardSymbols.pisces, value: "PISCES" },
    keyword: { symbol: cardReference.symbolKey, value: "SURRENDER" },
    yesNo: { symbol: cardSymbols.maybe, value: "MAYBE" },
  },
  closing: ["Let go to see differently"],
  metaDescription: "The Hangman tarot card meaning in The World Tarot: surrender • stillness • perspective. The Hanged Man represents the moment when movement gives way to stillness.",
};

export const death: MajorArcanaContent = {
  keywords: "Endings • Release • Transformation",
  subtitle: "An ending makes way",
  essay: [
    "Death represents the ending of a familiar form—a relationship, role, belief, or way of living that can no longer continue as it has. It appears when something has run its course, and the task is to recognize what is passing rather than keep it alive through habit or attachment.",
    "Traditionally depicted as a skeletal figure riding a white horse, Death represents a passage that no status or position can prevent. The image brings attention to what falls away and what continues beyond it. The ending matters, even when it is necessary. Making room for what comes next may also mean grieving what cannot be carried forward.",
    "At its deepest level, Death asks: what are you ready to let end? Transformation is not always something added. Sometimes it begins with releasing a form that life has already outgrown. What follows may not yet be visible, but it needs room to take shape.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "A NATURAL ENDING",
      body: "Something has reached its conclusion. Recognizing that an experience has run its course allows the transition to begin.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "RELEASING ATTACHMENT",
      body: "A familiar bond, identity, or expectation is ready to be released. Its meaning does not have to disappear for its place in your life to change.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "RESISTANCE",
      body: "Holding on can prolong an ending without restoring what once existed. Fear of the unfamiliar may make it difficult to release what is already passing.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "TRANSFORMATION",
      body: "As an old form falls away, a different way of living becomes possible. What emerges may require space before it can be understood.",
    },
  ],
  lookFor: [
    "endings • release • transformation • transition • closure • letting go • impermanence • renewal • shedding the old • moving on",
  ],
  spheres: {
    love: "A relationship may be ending, or an established pattern within it may need to end. Letting go of how things have been creates room to recognize what remains possible.",
    career: "A role, project, or professional direction may have run its course. Closing that chapter can make space for work that reflects who you are becoming.",
    money: "A financial arrangement or spending pattern may no longer be sustainable. Ending an outdated commitment can create room to establish different priorities.",
  },
  shadow: [
    "resistance • clinging • fear of change • prolonged endings • refusal to release • attachment to the past • stagnation",
    "Holding on can keep an ending unfinished.",
  ],
  meta: {
    element: { symbol: cardSymbols.water, value: "water" },
    planet: { symbol: cardSymbols.pluto, value: "PLUTO" },
    sign: { symbol: cardSymbols.scorpio, value: "SCORPIO" },
    keyword: { symbol: cardReference.symbolKey, value: "TRANSFORMATION" },
    yesNo: { symbol: cardSymbols.no, value: "NO" },
  },
  closing: ["Let an ending make room for change"],
  metaDescription: "Death tarot card meaning in The World Tarot: endings • release • transformation. Death represents the ending of a familiar form—a relationship, role, belief, or way of living that can no longer continue as it has.",
};

export const temperance: MajorArcanaContent = {
  keywords: "Balance • Integration • Moderation",
  subtitle: "The right balance takes shape",
  essay: [
    "Temperance represents the process of bringing different elements into a workable relationship. It appears when a situation needs patience, adjustment, and attention to proportion. Rather than moving toward an extreme, it invites a response that makes room for more than one need or perspective.",
    "Traditionally depicted pouring water between two vessels, with one foot on land and the other in water, Temperance represents an ongoing exchange. Balance is maintained through responsiveness—adding, easing, and adjusting as circumstances require. What seems incompatible may find a useful relationship when neither part is allowed to overwhelm the other.",
    "At its deepest level, Temperance asks: what needs to be brought into balance? Integration does not require everything to become the same. Different qualities can retain their character while contributing to something shared. With time and care, the right proportions begin to emerge.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "FINDING PROPORTION",
      body: "Different needs are asking for attention. Adjusting how much time, energy, or emphasis each receives can restore a workable balance.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "INTEGRATION",
      body: "Experiences or perspectives begin to come together. What once felt separate can contribute to a more complete understanding.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "EXCESS",
      body: "One part of a situation may be taking too much space. Overcorrection or an all-or-nothing response can deepen the imbalance.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "PATIENT ADJUSTMENT",
      body: "Small changes allow a situation to settle into a healthier rhythm. Progress comes through noticing what works and refining what does not.",
    },
  ],
  lookFor: [
    "balance • integration • moderation • patience • proportion • harmony • cooperation • adjustment • healing • synthesis",
  ],
  spheres: {
    love: "A relationship may benefit from a more balanced exchange. Making room for different needs can build understanding without requiring either person to disappear into the other.",
    career: "Different skills or approaches can work well together. Cooperation and a sustainable pace may achieve more than pushing one method to its limit.",
    money: "Financial balance may come through steady adjustments to spending, saving, and commitments. A sustainable approach leaves room for present needs and future plans.",
  },
  shadow: [
    "excess • imbalance • impatience • overcorrection • conflicting priorities • forced harmony • overcompromise • unsustainable rhythms",
    "Harmony becomes limiting when differences are suppressed.",
  ],
  meta: {
    element: { symbol: cardSymbols.fire, value: "fire" },
    planet: { symbol: cardSymbols.jupiter, value: "JUPITER" },
    sign: { symbol: cardSymbols.sagittarius, value: "SAGITTARIUS" },
    keyword: { symbol: cardReference.symbolKey, value: "BALANCE" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["Allow balance to take shape"],
  metaDescription: "Temperance tarot card meaning in The World Tarot: balance • integration • moderation. Temperance represents the process of bringing different elements into a workable relationship.",
};

export const theDevil: MajorArcanaContent = {
  keywords: "Desire • Attachment • Bondage",
  subtitle: "What holds you becomes visible",
  essay: [
    "The Devil represents the attachments that gain power over choice. It appears when a desire, habit, relationship, or belief begins to determine what feels possible. Something may offer pleasure, security, or belonging while making it increasingly difficult to act freely.",
    "Traditionally depicted above two loosely chained figures, The Devil represents both constraint and the difficulty of recognizing how it is maintained. The chains are real, but they may allow more movement than the figures realize. Familiarity, fear, and immediate satisfaction can keep a person attached even when the cost has become clear.",
    "At its deepest level, The Devil asks: what has power over your choices? Desire itself is not the problem. The question is whether you can respond to it freely. Seeing an attachment clearly begins to reveal where its hold can loosen—and where a different choice becomes possible.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "STRONG ATTACHMENT",
      body: "Something has a powerful pull. Pleasure, security, or approval may be shaping choices more than you realize.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "REPEATING PATTERNS",
      body: "An immediate reward keeps a familiar cycle in motion. Recognizing what the pattern provides can help explain why it is difficult to leave.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "RESTRICTED CHOICE",
      body: "Fear, dependency, or control may be narrowing your options. What feels necessary deserves a closer look, especially when its cost keeps growing.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "RECLAIMING CHOICE",
      body: "An attachment becomes easier to question once its hold is understood. A boundary, a different response, or outside support can begin to loosen it.",
    },
  ],
  lookFor: [
    "attachment • desire • temptation • dependency • control • compulsion • materialism • power • restriction • awareness • liberation",
  ],
  spheres: {
    love: "A relationship may involve strong attraction alongside dependency or control. Recognizing where desire becomes obligation can clarify the boundaries needed.",
    career: "Status, income, or approval may be keeping you tied to an unhealthy work situation. Examine what the arrangement provides and what it asks you to give up.",
    money: "Spending, debt, or the pursuit of financial security may be restricting your choices. Recognizing the need behind a financial habit can help you change it.",
  },
  shadow: [
    "denial • obsession • possessiveness • manipulation • shame • compulsive habits • unhealthy attachments • surrendering control",
    "Desire becomes limiting when it begins to govern your choices.",
  ],
  meta: {
    element: { symbol: cardSymbols.earth, value: "earth" },
    planet: { symbol: cardSymbols.saturn, value: "SATURN" },
    sign: { symbol: cardSymbols.capricorn, value: "CAPRICORN" },
    keyword: { symbol: cardReference.symbolKey, value: "ATTACHMENT" },
    yesNo: { symbol: cardSymbols.no, value: "NO" },
  },
  closing: ["Recognize what has power over you"],
  metaDescription: "The Devil tarot card meaning in The World Tarot: desire • attachment • bondage. The Devil represents the attachments that gain power over choice.",
};

export const theTower: MajorArcanaContent = {
  keywords: "Disruption • Revelation • Release",
  subtitle: "What cannot hold begins to fall",
  essay: [
    "The Tower strikes at what seemed beyond question. A revelation, rupture, or sudden change breaks through the familiar order, unsettling the beliefs that gave it coherence. What felt secure may no longer be trustworthy, and what once explained everything can no longer account for what is happening.",
    "Traditionally shown struck by lightning, with its crown thrown loose and figures falling from its heights, The Tower captures the violence of certainty breaking open. The walls cannot contain what has entered. Structures that offered protection reveal their fragility, and the distance between appearance and reality becomes impossible to ignore.",
    "At its deepest level, The Tower asks: what happens when the ground of belief gives way? We build our lives around understandings that gradually come to feel like facts. When one of these breaks, the disturbance can reach far beyond the original revelation. An entire order is called into question, and the familiar no longer offers a place beyond the reach of doubt.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "SUDDEN DISRUPTION",
      body: "An unexpected change interrupts familiar arrangements. Addressing immediate needs can help you find your footing before deciding what comes next.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "REVELATION",
      body: "New information changes how you understand a situation. What becomes clear may be unsettling, but it allows you to respond to what is actually there.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "UNSTABLE FOUNDATIONS",
      body: "An arrangement may depend on assumptions or conditions that no longer hold. Recognizing the strain can clarify what needs repair and what cannot continue.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "REBUILDING",
      body: "After a disruption, priorities become clearer. Taking stock of what remains sound can help you build with greater care and understanding.",
    },
  ],
  lookFor: [
    "disruption • revelation • upheaval • awakening • collapse • truth • release • instability • change • rebuilding",
  ],
  spheres: {
    love: "A revelation or conflict may expose strain in a relationship. Honest communication can clarify what needs to change and whether there is a shared basis for repair.",
    career: "A sudden change at work may unsettle your role, plans, or sense of security. Focus on practical next steps while reassessing which expectations remain realistic.",
    money: "An unexpected expense or change in income may reveal weaknesses in a financial arrangement. Reviewing essential needs and available resources can help establish a steadier footing.",
  },
  shadow: [
    "resistance to change • ignored warning signs • delayed upheaval • fear of loss • clinging to unstable structures • unresolved shock",
    "Stability becomes limiting when preserving it requires denying what is happening.",
  ],
  meta: {
    element: { symbol: cardSymbols.fire, value: "fire" },
    planet: { symbol: cardSymbols.mars, value: "MARS" },
    sign: { symbol: cardSymbols.aries, value: "ARIES" },
    keyword: { symbol: cardReference.symbolKey, value: "REVELATION" },
    yesNo: { symbol: cardSymbols.no, value: "NO" },
  },
  closing: ["The foundations of certainty give way"],
  metaDescription: "The Tower tarot card meaning in The World Tarot: disruption • revelation • release. The Tower strikes at what seemed beyond question.",
};

export const theStar: MajorArcanaContent = {
  keywords: "Hope • Renewal • Openness",
  subtitle: "A sense of possibility returns",
  essay: [
    "Hope can return before there is any evidence that circumstances have changed. The Star appears in this quiet opening, when life begins to feel possible again. Something draws the attention outward—a moment of beauty, an unexpected kindness, a desire to create—and the future becomes more than an extension of what has already happened.",
    "Traditionally shown as a naked figure pouring water onto the earth and into a pool beneath a sky of stars, the card brings vulnerability into relationship with a wider sense of belonging. Nothing shields the figure from the world. Water flows freely, nourishing both the visible ground and the depths beneath it. There is a generosity in this image, a willingness to participate in life without knowing what will be returned.",
    "At its deepest level, The Star asks: what allows us to remain open? Disappointment can narrow the world to what feels safe or certain. Renewal begins as that enclosure softens and something beyond it becomes worth reaching toward. Hope takes shape in this willingness to care, to imagine, and to offer something of ourselves while the outcome remains unknown.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "RETURNING HOPE",
      body: "A possibility begins to feel meaningful again. Small signs of interest, connection, or anticipation may signal a renewed willingness to engage with life.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "RENEWAL",
      body: "Energy gradually returns after a demanding period. Rest, creative expression, and supportive surroundings can give that renewal room to develop.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "OPENNESS",
      body: "There may be space to speak honestly or allow something personal to be seen. Connection deepens where appearances no longer require so much protection.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "INSPIRATION",
      body: "An idea or aspiration draws attention beyond immediate concerns. Following that interest can restore a sense of direction before a complete plan takes shape.",
    },
  ],
  lookFor: [
    "hope • renewal • inspiration • openness • trust • healing • generosity • authenticity • possibility • connection",
  ],
  spheres: {
    love: "A relationship may offer room for greater honesty and acceptance. Allowing hopes and vulnerabilities to be shared can renew connection without requiring certainty about the future.",
    career: "A sense of purpose may return through work that feels meaningful. An emerging idea, a generous collaboration, or a longer-term aspiration can help clarify where energy wants to go.",
    money: "Financial recovery may begin to feel possible. Let that optimism support practical plans, with attention to the resources available and the commitments that can be sustained.",
  },
  shadow: [
    "discouragement • disconnection • depleted hope • guardedness • loss of inspiration • idealization • difficulty receiving support",
    "Hope becomes fragile when it depends on a promised outcome",
  ],
  meta: {
    element: { symbol: cardSymbols.air, value: "air" },
    planet: { symbol: cardSymbols.uranus, value: "URANUS" },
    sign: { symbol: cardSymbols.aquarius, value: "AQUARIUS" },
    keyword: { symbol: cardReference.symbolKey, value: "HOPE" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["There is reason to hope"],
  metaDescription: "The Star tarot card meaning in The World Tarot: hope • renewal • openness. Hope can return before there is any evidence that circumstances have changed.",
};

export const theMoon: MajorArcanaContent = {
  keywords: "Uncertainty • Instinct • Mystery",
  subtitle: "The familiar takes on an unfamiliar shape",
  essay: [
    "In moonlight, a familiar landscape can become difficult to read. Shapes remain visible, but their edges soften, and the imagination fills what cannot be clearly seen. The Moon appears when feeling, instinct, and uncertainty enter the same space. Something may be stirring beneath awareness before there are words to understand it.",
    "Traditionally shown above a dog and a wolf, with a crayfish emerging from water and a path winding between two towers, The Moon brings different layers of instinct into view. The tame and the wild respond to the same call. The path continues into the distance, but its destination remains hidden. Dreams, memories, and impressions rise to the surface, carrying meanings that resist a single explanation.",
    "At its deepest level, The Moon asks: how do we move through what we cannot yet understand? A feeling can deserve attention without providing a complete account of what is happening. Fear may draw on an old experience; longing may lend an uncertain possibility the appearance of truth. Discernment grows through allowing these impressions to be felt and questioned, leaving room for what has not yet become clear.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "UNCERTAINTY",
      body: "A situation remains difficult to read. Missing information or mixed signals may require more time before a clear judgment can be made.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "INNER IMAGERY",
      body: "Dreams, memories, or recurring impressions may bring an overlooked concern into awareness. Exploring their personal associations can reveal what is asking for attention.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "PROJECTION",
      body: "Fear or longing may be shaping the meaning given to events. Separating what has been observed from what has been assumed can loosen a misleading interpretation.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "MOVING THROUGH THE UNKNOWN",
      body: "The next step may be visible even when the larger direction is unclear. Proceeding carefully leaves room to respond as more becomes known.",
    },
  ],
  lookFor: [
    "uncertainty • instinct • dreams • mystery • imagination • illusion • subconscious • ambiguity • projection • intuition",
  ],
  spheres: {
    love: "Unspoken feelings or uncertain expectations may complicate a relationship. Direct conversation can help distinguish what is shared from what has been feared, hoped for, or assumed.",
    career: "Unclear expectations or incomplete information may make a work situation difficult to assess. Clarifying responsibilities and checking impressions against observable details can support better decisions.",
    money: "A financial situation may contain details that are easy to overlook or misunderstand. Reviewing terms, costs, and assumptions can reveal what needs clarification before a commitment is made.",
  },
  shadow: [
    "confusion • anxiety • avoidance • misleading appearances • projection • hidden fears • mistrust • emotional overwhelm",
    "Intuition becomes unreliable when every feeling is treated as fact",
  ],
  meta: {
    element: { symbol: cardSymbols.water, value: "water" },
    planet: { symbol: cardSymbols.neptune, value: "NEPTUNE" },
    sign: { symbol: cardSymbols.pisces, value: "PISCES" },
    keyword: { symbol: cardReference.symbolKey, value: "UNCERTAINTY" },
    yesNo: { symbol: cardSymbols.no, value: "NO" },
  },
  closing: ["Not everything is as it seems"],
  metaDescription: "The Moon tarot card meaning in The World Tarot: uncertainty • instinct • mystery. In moonlight, a familiar landscape can become difficult to read.",
};

export const theSun: MajorArcanaContent = {
  keywords: "Joy • Vitality • Clarity",
  subtitle: "Life comes fully into the light",
  essay: [
    "There are moments when being alive feels uncomplicated. Warmth, connection, and understanding arrive together, and energy that was bound up in doubt becomes available again. The Sun brings this directness of experience. Something can be seen clearly, enjoyed openly, or met with a wholehearted response.",
    "Traditionally shown above a child riding a white horse, with sunflowers growing behind a wall, The Sun joins illumination with vitality. The child meets the world without embarrassment or concealment. Under the open sky, growth becomes visible and joy finds expression. There is an ease in the image that comes from having nothing to prove before taking part in life.",
    "At its deepest level, The Sun asks: can we allow what is good to be fully experienced? Happiness can be interrupted by the urge to question whether it is deserved or how long it will last. The Sun invites participation in what is present. Understanding can be acted upon, affection can be expressed, and an accomplishment can be enjoyed without immediately turning toward the next demand",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "CLARITY",
      body: "A situation becomes easier to understand. What was uncertain can now be addressed with greater confidence and fewer assumptions.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "JOY",
      body: "An experience offers pleasure, connection, or a sense of belonging. Allowing time to enjoy it can deepen its place in everyday life.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "VITALITY",
      body: "Energy and enthusiasm support active participation. There may be greater freedom to create, contribute, or pursue something that previously felt difficult.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "VISIBLE SUCCESS",
      body: "Progress becomes recognizable. An achievement may be acknowledged, or sustained effort may begin to produce results that can be shared and enjoyed.",
    },
  ],
  lookFor: [
    "joy • vitality • clarity • warmth • confidence • success • openness • celebration • growth • freedom",
  ],
  spheres: {
    love: "A relationship may feel warmer, more open, and easier to trust. Shared enjoyment and freely expressed affection can strengthen connection and make room for both people to be themselves.",
    career: "Work may bring visible progress, recognition, or renewed enthusiasm. Clear goals and confidence in existing abilities can support a meaningful contribution.",
    money: "A clearer understanding of finances may reveal progress or greater room to maneuver. Recognizing what is working can support confident decisions while keeping future commitments realistic.",
  },
  shadow: [
    "arrogance • excessive pride • seeking validation • forced positivity • ignoring difficulties • need for attention",
    "Optimism loses clarity when it refuses to acknowledge difficulty",
  ],
  meta: {
    element: { symbol: cardSymbols.fire, value: "fire" },
    planet: { symbol: cardSymbols.sun, value: "SUN" },
    sign: { symbol: cardSymbols.leo, value: "LEO" },
    keyword: { symbol: cardReference.symbolKey, value: "JOY" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["There is room for joy"],
  metaDescription: "The Sun tarot card meaning in The World Tarot: joy • vitality • clarity. There are moments when being alive feels uncomplicated.",
};

export const judgement: MajorArcanaContent = {
  keywords: "Awakening • Reckoning • Renewal",
  subtitle: "A call that can no longer be ignored",
  essay: [
    "Something once accepted as settled begins to ask for a response. A decision, an unfinished part of the past, or a possibility long set aside returns with new significance. Judgment marks a moment of recognition in which the meaning of a life or experience can be reconsidered. What has happened remains, but the understanding of it is changing.",
    "Traditionally shown as an angel sounding a trumpet while figures rise from their graves, Judgment gives awakening the force of a summons. The figures emerge from enclosure and respond to something beyond their former condition. The image suggests that what seemed finished may still contain life, and that an honest reckoning can release possibilities held within an old account of who we are.",
    "At its deepest level, Judgment asks: what are we being called to answer? Discernment requires a willingness to acknowledge actions, consequences, and what has since been learned. Neither condemnation nor excuse can complete that work. Renewal becomes possible when recognition leads to a response—when the past can inform what comes next without deciding it entirely.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "AWAKENING",
      body: "An experience takes on new meaning. What once went unnoticed or seemed unchangeable may now call for a conscious response.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "RECKONING",
      body: "Past actions or decisions need an honest review. Acknowledging their consequences can clarify what requires responsibility, repair, or release.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "RENEWED POSSIBILITY",
      body: "Something considered finished may deserve another look. A return can become meaningful when it reflects a changed understanding of what happened before.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "ANSWERING THE CALL",
      body: "A direction or commitment becomes difficult to keep postponing. Recognition asks to be carried into action, even if the full path is still unfolding.",
    },
  ],
  lookFor: [
    "awakening • reckoning • discernment • renewal • accountability • recognition • calling • forgiveness • reflection • response",
  ],
  spheres: {
    love: "A relationship may reach a point of honest reassessment. Acknowledging shared history and present realities can clarify whether renewal is possible and what it would require.",
    career: "A review of past work may reveal a clearer sense of purpose. Experience can point toward a renewed commitment, a change in direction, or a responsibility that is ready to be accepted.",
    money: "Past financial decisions may need to be revisited with greater clarity. Taking stock of obligations, habits, and what has changed can support a more deliberate approach.",
  },
  shadow: [
    "self-criticism • harsh judgment • guilt • dwelling on past mistakes • fear of change • ignoring an inner calling",
    "Reflection becomes condemnation when past mistakes define your worth.",
  ],
  meta: {
    element: { symbol: cardSymbols.fire, value: "fire" },
    planet: { symbol: cardSymbols.pluto, value: "PLUTO" },
    sign: { symbol: cardSymbols.scorpio, value: "SCORPIO" },
    keyword: { symbol: cardReference.symbolKey, value: "AWAKENING" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["You are ready to answer the call"],
  metaDescription: "Judgement tarot card meaning in The World Tarot: awakening • reckoning • renewal. Something once accepted as settled begins to ask for a response.",
};

export const theWorld: MajorArcanaContent = {
  keywords: "Completion • Fulfillment • Wholeness",
  subtitle: "Everything comes together as a cycle reaches completion",
  essay: [
    "What has been unfolding reaches a point where its meaning can be seen as a whole. An undertaking, a relationship, or a period of growth arrives at completion, allowing its separate experiences to find their place within a larger pattern. The World marks a moment of fulfillment in which what has been lived can be recognized and integrated. There may be satisfaction, relief, or sadness in reaching this point. An ending need not be perfect to be complete.",
    "Traditionally shown as a dancing figure within a wreath, surrounded by four symbolic beings, The World gives completion a sense of movement. The wreath encloses the figure without confining it, while the beings at the corners suggest the breadth of the world in which that dance takes place. The image holds wholeness and motion together: a cycle has reached its fulfillment, yet life continues. What has been learned can now be carried into a wider field of experience.",
    "At its deepest level, The World asks: can we recognize what has come to completion and allow ourselves to inhabit it? This requires acknowledging both what has been achieved and what the experience has made possible within us. There is value in pausing long enough to receive that understanding, without immediately turning toward another task. A completed cycle becomes part of the ground we stand on, giving us a fuller sense of our place in the world and the freedom to enter what comes next.",
  ],
  appears: [
    {
      icon: cardReference.appearsIcon1,
      label: "WHOLENESS",
      body: "Separate experiences come together into a meaningful whole. A cycle reaches completion, allowing you to recognize what has been achieved and how you have changed.",
    },
    {
      icon: cardReference.appearsIcon2,
      label: "FULFILLMENT",
      body: "A sense of belonging grows as you become more at home in your experience. There is room to appreciate how far you have come without needing everything to be perfect.",
    },
    {
      icon: cardReference.appearsIcon3,
      label: "INTEGRATION",
      body: "Allow yourself to recognize what is complete. What you have learned can become part of how you live, even when some details remain unresolved.",
    },
    {
      icon: cardReference.appearsIcon4,
      label: "EXPANSION",
      body: "Completion opens space for a wider field of experience. Acknowledge this arrival, then allow what you have gained to support your next step.",
    },
  ],
  lookFor: [
    "completion • fulfillment • wholeness • integration • belonging • achievement • closure • recognition • expanded horizons • a cycle fulfilled",
  ],
  spheres: {
    love: "A relationship may reach a meaningful milestone, bringing a deeper sense of belonging and shared fulfillment. Whether together or single, recognizing what past experiences have taught you can make room for a fuller connection.",
    career: "A project or professional chapter may reach successful completion. Take stock of what you have accomplished and the skills you have gained. This experience can prepare you for broader opportunities or a new direction.",
    money: "A financial goal may be nearing completion, offering satisfaction and a clearer view of your resources. Recognize the habits that supported your progress and consider how they can sustain you beyond this milestone.",
  },
  shadow: [
    "incompletion • lack of closure • fear of endings • perfectionism • delayed fulfillment • clinging to the familiar",
    "Completion remains out of reach when every ending must be perfect.",
  ],
  meta: {
    element: { symbol: cardSymbols.earth, value: "earth" },
    planet: { symbol: cardSymbols.saturn, value: "SATURN" },
    sign: { symbol: cardSymbols.capricorn, value: "CAPRICORN" },
    keyword: { symbol: cardReference.symbolKey, value: "COMPLETION" },
    yesNo: { symbol: cardSymbols.yes, value: "YES" },
  },
  closing: ["You have come full circle"],
  metaDescription: "The World tarot card meaning in The World Tarot: completion • fulfillment • wholeness. What has been unfolding reaches a point where its meaning can be seen as a whole.",
};

/**
 * Every card's content, by slug.
 *
 * **The route does not use this** — it reads `card.content` off the card, which
 * is what makes a card without copy fall through to `ComingSoonPage`. This map
 * exists so tests can walk the whole set, and it is what lets
 * `card-content.test.ts` assert a shape across all twenty-two at once.
 */
export const majorArcanaContent: Record<string, MajorArcanaContent> = {
  "the-fool": theFool,
  "the-magician": theMagician,
  "the-high-priestess": theHighPriestess,
  "the-empress": theEmpress,
  "the-emperor": theEmperor,
  "the-high-priest": theHighPriest,
  "the-lovers": theLovers,
  "the-chariot": theChariot,
  strength: strength,
  "the-hermit": theHermit,
  "the-wheel": theWheel,
  justice: justice,
  "the-hangman": theHangman,
  death: death,
  temperance: temperance,
  "the-devil": theDevil,
  "the-tower": theTower,
  "the-star": theStar,
  "the-moon": theMoon,
  "the-sun": theSun,
  judgement: judgement,
  "the-world": theWorld,
};
