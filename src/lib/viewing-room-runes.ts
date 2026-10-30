export type RuneName =
  | "fehu" | "uruz" | "thurisaz" | "ansuz" | "raidho" | "kaunan" | "gebo" | "wunjo"
  | "hagalaz" | "naudiz" | "isa" | "jera" | "eihwaz" | "perthro" | "algiz" | "sowilo"
  | "tiwaz" | "berkano" | "ehwaz" | "mannaz" | "laguz" | "ingwaz" | "dagaz" | "othala";

/** viewBox "0 0 12 20". Straight strokes only: absolute M and L commands. */
export const RUNE_VIEWBOX = { width: 12, height: 20 } as const;

export const RUNE_GLYPHS: Readonly<Record<RuneName, string>> = {
  fehu: "M 2 2 L 2 18 M 2 7 L 10 2 M 2 12 L 10 7",
  uruz: "M 2 18 L 2 2 L 10 6 L 10 18",
  thurisaz: "M 2 2 L 2 18 M 2 5 L 10 10 L 2 15",
  ansuz: "M 2 2 L 2 18 M 2 4 L 10 9 M 2 9 L 10 14",
  raidho: "M 2 2 L 2 18 M 2 2 L 10 6 L 2 11 M 2 11 L 10 18",
  kaunan: "M 10 2 L 2 10 L 10 18",
  gebo: "M 2 2 L 10 18 M 10 2 L 2 18",
  wunjo: "M 2 2 L 2 18 M 2 2 L 10 6 L 2 10",
  hagalaz: "M 2 2 L 2 18 M 10 2 L 10 18 M 2 5 L 10 15",
  naudiz: "M 6 2 L 6 18 M 2 12 L 10 8",
  isa: "M 6 2 L 6 18",
  jera: "M 2 2 L 6 6 L 2 10 M 10 10 L 6 14 L 10 18",
  eihwaz: "M 10 5 L 6 2 L 6 18 L 2 15",
  perthro: "M 2 2 L 2 18 M 2 2 L 6 6 L 10 2 M 2 18 L 6 14 L 10 18",
  algiz: "M 6 2 L 6 18 M 2 6 L 6 10 L 10 6",
  sowilo: "M 10 2 L 2 10 L 10 10 L 2 18",
  tiwaz: "M 6 2 L 6 18 M 2 7 L 6 2 L 10 7",
  berkano: "M 2 2 L 2 18 M 2 2 L 10 6 L 2 10 L 10 14 L 2 18",
  ehwaz: "M 2 18 L 2 2 L 6 9 L 10 2 L 10 18",
  mannaz: "M 2 2 L 2 18 M 10 2 L 10 18 M 2 2 L 10 10 M 10 2 L 2 10",
  laguz: "M 2 2 L 2 18 M 2 2 L 10 7",
  ingwaz: "M 6 3 L 10 10 L 6 17 L 2 10 L 6 3",
  dagaz: "M 2 2 L 2 18 L 10 2 L 10 18 L 2 2",
  othala: "M 6 2 L 10 7 L 6 12 L 2 7 L 6 2 M 6 12 L 2 18 M 6 12 L 10 18",
};

export type RunePlacement = {
  rune: RuneName;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  delay: number;
  duration: number;
};

/** Centres are in field percentages; the edge entries stay visible on phones. */
export const RUNE_PLACEMENTS: readonly RunePlacement[] = [
  { rune: "fehu", x: 10, y: 10, scale: 0.9, rotate: -12, delay: -1.2, duration: 4.5 },
  { rune: "uruz", x: 18, y: 18, scale: 0.7, rotate: 8, delay: -2.1, duration: 5.5 },
  { rune: "thurisaz", x: 8, y: 27, scale: 1.1, rotate: -5, delay: -0.8, duration: 4 },
  { rune: "ansuz", x: 19, y: 35, scale: 0.8, rotate: 15, delay: -3.2, duration: 6 },
  { rune: "raidho", x: 12, y: 44, scale: 1.2, rotate: -18, delay: -1.7, duration: 5 },
  { rune: "kaunan", x: 20, y: 53, scale: 0.7, rotate: 5, delay: -2.4, duration: 3.5 },
  { rune: "gebo", x: 8, y: 62, scale: 1, rotate: 12, delay: -4.1, duration: 6.5 },
  { rune: "wunjo", x: 17, y: 71, scale: 0.9, rotate: -8, delay: -1.3, duration: 4 },
  { rune: "hagalaz", x: 9, y: 80, scale: 0.8, rotate: 18, delay: -3.5, duration: 5.5 },
  { rune: "naudiz", x: 19, y: 89, scale: 1.1, rotate: -10, delay: -2.2, duration: 7 },

  { rune: "isa", x: 90, y: 11, scale: 0.8, rotate: 10, delay: -2.8, duration: 5 },
  { rune: "jera", x: 82, y: 20, scale: 1, rotate: -15, delay: -1.1, duration: 4.5 },
  { rune: "eihwaz", x: 92, y: 29, scale: 0.7, rotate: 7, delay: -3.4, duration: 6 },
  { rune: "perthro", x: 81, y: 38, scale: 1.1, rotate: -6, delay: -1.9, duration: 5.5 },
  { rune: "algiz", x: 88, y: 47, scale: 0.9, rotate: 16, delay: -0.6, duration: 3.5 },
  { rune: "sowilo", x: 80, y: 56, scale: 1.2, rotate: -13, delay: -4.3, duration: 7 },
  { rune: "tiwaz", x: 92, y: 65, scale: 0.8, rotate: 4, delay: -2.6, duration: 4 },
  { rune: "berkano", x: 83, y: 74, scale: 1, rotate: 11, delay: -3.1, duration: 6.5 },
  { rune: "ehwaz", x: 91, y: 83, scale: 0.7, rotate: -17, delay: -1.5, duration: 5 },
  { rune: "mannaz", x: 81, y: 91, scale: 1.1, rotate: 9, delay: -2.7, duration: 4.5 },

  { rune: "laguz", x: 28, y: 4.4, scale: 0.9, rotate: -8, delay: -1.4, duration: 5.5 },
  { rune: "ingwaz", x: 42, y: 4.7, scale: 0.7, rotate: 12, delay: -3.3, duration: 6 },
  { rune: "dagaz", x: 58, y: 4.5, scale: 1, rotate: -4, delay: -2, duration: 4 },
  { rune: "othala", x: 72, y: 4.6, scale: 0.8, rotate: 14, delay: -0.9, duration: 3.5 },
  { rune: "fehu", x: 29, y: 95.4, scale: 0.8, rotate: 10, delay: -3.7, duration: 6.5 },
  { rune: "gebo", x: 43, y: 95.6, scale: 1, rotate: -12, delay: -1.8, duration: 5 },
  { rune: "algiz", x: 57, y: 95.3, scale: 0.9, rotate: 6, delay: -2.9, duration: 4.5 },
  { rune: "ingwaz", x: 71, y: 95.5, scale: 0.7, rotate: -16, delay: -4.5, duration: 7 },
];

/** How far the field extends past the card, as fractions of the card's own box. */
export const RUNE_OVERHANG = { x: 0.45, y: 0.05 } as const;

/** The card's rectangle in field percentages, derived from RUNE_OVERHANG. */
export function cardRectInField(): { left: number; right: number; top: number; bottom: number } {
  const left = 100 * RUNE_OVERHANG.x / (1 + 2 * RUNE_OVERHANG.x);
  const top = 100 * RUNE_OVERHANG.y / (1 + 2 * RUNE_OVERHANG.y);

  return { left, right: 100 - left, top, bottom: 100 - top };
}
