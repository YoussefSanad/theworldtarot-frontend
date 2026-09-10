/**
 * The World Tarot page's own copy (Figma node 344:30, "THE WORLD TAROT_09_05_26"),
 * kept out of the components so the wording can move to a CMS later without
 * touching layout. There is no separate mobile mockup for this frame — see
 * `src/components/world-tarot/README.md`.
 */

export const intro = {
  heading: "The World Tarot",
  tagline: ["A studio devoted to the living language", "of archetypal symbols"],
};

export const mission = {
  body: [
    "Through art, writing, and cinematic interpretation, The World Tarot explores archetypes as living presences — moving between symbolism and story.",
    "It extends tarot beyond the page through visual essays, symbolic libraries, and crafted readings designed to support clarity and perspective.",
  ],
};

export const artistNote = {
  /**
   * The heading is two pieces of the client's own artwork rather than type —
   * see `worldTarotArtwork.between` / `.skyStone` for why neither can be set.
   * `legend` is what a screen reader is given for the pair; the script word
   * above it is decorative and carries no alt of its own, so this string is
   * the whole heading as it reads aloud.
   */
  legend: "Between Sky & Stone",
  body: [
    "Welcome to The World Tarot — a place between sky and stone.",
    "I am a storyteller of symbols, shaped by a lifelong devotion to art, history, and the quiet mysteries between the seen and unseen.",
    "I began as a designer, drawn to sacred geometry and the visual languages that echo across cultures and time. For more than twenty years, I have worked with tarot as a reflective language — one that reveals patterns, thresholds, and inner truth.",
    "My work now lives at the intersection of art and intuition. I explore how symbols function not only as images, but as experiences — how a single card or form can focus attention, open perspective, and gently shift the way we move through the world.",
    "Through The World Tarot, I share readings and creative work shaped by place, myth, and history. This is a contemplative studio where art, symbolism, and intention meet.",
  ],
  photoAlt: "Serafina standing among the temple towers of Angkor Wat at sunset.",
  signatureAlt: "Serafina",
};

export const closing = {
  saying: ["Every journey is made", "one step at a time"],
  action: { label: "GET MY READING", href: "/readings/" },
};
