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

/** Centres are in full-viewport field percentages, in the gutters and along the card top. */
export const RUNE_PLACEMENTS: readonly RunePlacement[] = [
  { rune: "fehu", x: 5, y: 10, scale: 0.9, rotate: -12, delay: -1.2, duration: 6.5 },
  { rune: "uruz", x: 15, y: 14, scale: 0.7, rotate: 8, delay: -2.1, duration: 5.5 },
  { rune: "thurisaz", x: 25, y: 12, scale: 1.1, rotate: -5, delay: -0.8, duration: 8 },
  { rune: "ansuz", x: 8, y: 21, scale: 0.8, rotate: 15, delay: -3.2, duration: 6 },
  { rune: "raidho", x: 21, y: 23, scale: 1.2, rotate: -18, delay: -1.7, duration: 9 },
  { rune: "kaunan", x: 4, y: 31, scale: 0.7, rotate: 5, delay: -2.4, duration: 5 },
  { rune: "gebo", x: 14, y: 29, scale: 1, rotate: 12, delay: -4.1, duration: 7.5 },
  { rune: "wunjo", x: 25, y: 34, scale: 0.9, rotate: -8, delay: -1.3, duration: 6 },
  { rune: "hagalaz", x: 9, y: 40, scale: 0.8, rotate: 18, delay: -3.5, duration: 8.5 },
  { rune: "naudiz", x: 19, y: 39, scale: 1.1, rotate: -10, delay: -2.2, duration: 7 },
  { rune: "isa", x: 4, y: 49, scale: 0.6, rotate: 10, delay: -2.8, duration: 5.5 },
  { rune: "jera", x: 15, y: 47, scale: 1, rotate: -15, delay: -1.1, duration: 9.5 },
  { rune: "eihwaz", x: 25, y: 50, scale: 0.7, rotate: 7, delay: -3.4, duration: 6.5 },
  { rune: "perthro", x: 7, y: 58, scale: 1.1, rotate: -6, delay: -1.9, duration: 7.5 },
  { rune: "algiz", x: 20, y: 57, scale: 0.9, rotate: 16, delay: -0.6, duration: 5 },
  { rune: "sowilo", x: 4, y: 68, scale: 1.2, rotate: -13, delay: -4.3, duration: 10 },
  { rune: "tiwaz", x: 14, y: 65, scale: 0.8, rotate: 4, delay: -2.6, duration: 6 },
  { rune: "berkano", x: 25, y: 68, scale: 1, rotate: 11, delay: -3.1, duration: 8 },
  { rune: "ehwaz", x: 8, y: 77, scale: 0.7, rotate: -17, delay: -1.5, duration: 5.5 },
  { rune: "mannaz", x: 19, y: 75, scale: 1.1, rotate: 9, delay: -2.7, duration: 7 },
  { rune: "laguz", x: 4, y: 87, scale: 0.9, rotate: -8, delay: -1.4, duration: 8.5 },
  { rune: "ingwaz", x: 14, y: 85, scale: 0.7, rotate: 12, delay: -3.3, duration: 6.5 },
  { rune: "dagaz", x: 25, y: 88, scale: 1, rotate: -4, delay: -2, duration: 9 },

  { rune: "othala", x: 94, y: 11, scale: 0.8, rotate: 14, delay: -0.9, duration: 5 },
  { rune: "gebo", x: 84, y: 15, scale: 1, rotate: -12, delay: -1.8, duration: 7.5 },
  { rune: "algiz", x: 75, y: 12, scale: 0.9, rotate: 6, delay: -2.9, duration: 6 },
  { rune: "ingwaz", x: 91, y: 22, scale: 0.7, rotate: -16, delay: -4.5, duration: 8 },
  { rune: "fehu", x: 78, y: 23, scale: 1.2, rotate: 19, delay: -1.6, duration: 9.5 },
  { rune: "thurisaz", x: 96, y: 32, scale: 0.8, rotate: -9, delay: -3.8, duration: 5.5 },
  { rune: "raidho", x: 86, y: 29, scale: 1.1, rotate: 13, delay: -2.5, duration: 7 },
  { rune: "wunjo", x: 75, y: 34, scale: 0.6, rotate: -20, delay: -0.7, duration: 6.5 },
  { rune: "naudiz", x: 92, y: 40, scale: 1, rotate: 8, delay: -4.2, duration: 10 },
  { rune: "jera", x: 81, y: 39, scale: 0.9, rotate: -11, delay: -1.4, duration: 8.5 },
  { rune: "perthro", x: 96, y: 49, scale: 1.3, rotate: 17, delay: -3.6, duration: 7.5 },
  { rune: "sowilo", x: 85, y: 47, scale: 0.7, rotate: -6, delay: -2.3, duration: 5 },
  { rune: "berkano", x: 74, y: 50, scale: 1, rotate: 15, delay: -4.8, duration: 9 },
  { rune: "mannaz", x: 93, y: 58, scale: 0.8, rotate: -14, delay: -1.1, duration: 6 },
  { rune: "ingwaz", x: 80, y: 57, scale: 1.2, rotate: 5, delay: -3.7, duration: 8 },
  { rune: "othala", x: 96, y: 68, scale: 0.9, rotate: -18, delay: -2.6, duration: 7 },
  { rune: "uruz", x: 86, y: 65, scale: 1.1, rotate: 10, delay: -0.9, duration: 5.5 },
  { rune: "ansuz", x: 75, y: 68, scale: 0.7, rotate: -7, delay: -4.4, duration: 9.5 },
  { rune: "kaunan", x: 92, y: 77, scale: 1, rotate: 21, delay: -1.8, duration: 6.5 },
  { rune: "hagalaz", x: 81, y: 75, scale: 0.8, rotate: -13, delay: -3.1, duration: 8.5 },
  { rune: "isa", x: 96, y: 87, scale: 0.6, rotate: 4, delay: -2.2, duration: 5 },
  { rune: "eihwaz", x: 86, y: 85, scale: 1.1, rotate: -19, delay: -4.6, duration: 10 },
  { rune: "tiwaz", x: 75, y: 88, scale: 0.9, rotate: 12, delay: -1.3, duration: 7.5 },

  { rune: "ehwaz", x: 16, y: 4.3, scale: 0.8, rotate: -8, delay: -2.1, duration: 6 },
  { rune: "laguz", x: 23, y: 5.7, scale: 0.7, rotate: 11, delay: -3.4, duration: 8 },
  { rune: "dagaz", x: 30, y: 4.6, scale: 1, rotate: -5, delay: -1.5, duration: 7 },
  { rune: "fehu", x: 37, y: 6.2, scale: 0.9, rotate: 14, delay: -4.1, duration: 9 },
  { rune: "raidho", x: 44, y: 4.2, scale: 0.7, rotate: -10, delay: -2.8, duration: 5.5 },
  { rune: "gebo", x: 51, y: 5.6, scale: 1.1, rotate: 7, delay: -0.8, duration: 6.5 },
  { rune: "naudiz", x: 58, y: 4.5, scale: 0.8, rotate: -15, delay: -3.5, duration: 8.5 },
  { rune: "algiz", x: 65, y: 6.1, scale: 1, rotate: 9, delay: -1.9, duration: 7.5 },
  { rune: "sowilo", x: 73, y: 4.4, scale: 0.7, rotate: -12, delay: -4.7, duration: 10 },
  { rune: "othala", x: 82, y: 5.4, scale: 0.9, rotate: 16, delay: -2.4, duration: 9.5 },
];

/** Field extent above the card and inset from its bottom, in card heights. */
export const RUNE_FIELD_EXTENT = { above: 0.05, inset: 0.08 } as const;

/** The card's vertical edges in field percentages. */
export function cardEdgesInField(): { top: number; bottom: number } {
  const height = 1 + RUNE_FIELD_EXTENT.above - RUNE_FIELD_EXTENT.inset;
  const top = 100 * RUNE_FIELD_EXTENT.above / height;
  const bottom = 100 * (1 + RUNE_FIELD_EXTENT.above) / height;

  return { top, bottom };
}
