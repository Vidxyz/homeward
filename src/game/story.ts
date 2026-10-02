export const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export const ENDING_LINES = [
  'The arrow passes through twelve axe-heads without touching one.',
  'The hall falls silent. The beggar throws off his rags.',
  'Twenty years, and the sea has let you go. You are home.',
];

/** Label for an act on the picker: its name once you have started it, "???" before then (no spoilers). */
export function actLabel(id: number, seen: number[], names: string[]): string {
  return `${ROMAN[id - 1]} · ${seen.includes(id) ? names[id - 1] : '???'}`;
}
