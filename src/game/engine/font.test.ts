import { describe, expect, it } from 'vitest';
import { FONT_CHARS, GLYPH_H, GLYPH_W, glyph, textWidth } from './font';

describe('font', () => {
  it('has well-formed glyphs for every character', () => {
    for (const ch of FONT_CHARS) {
      const g = glyph(ch);
      expect(g, ch).not.toBeNull();
      expect(g!.length, `${ch} rows`).toBe(GLYPH_H);
      for (const row of g!) {
        expect(row.length, `${ch} width`).toBe(GLYPH_W);
        expect(row, `${ch} chars`).toMatch(/^[.#]+$/);
      }
    }
  });

  it('covers letters, digits and the punctuation the game uses', () => {
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:!?\'-()/') expect(glyph(ch), ch).not.toBeNull();
  });

  it('maps lowercase to uppercase and returns null for unknown characters', () => {
    expect(glyph('a')).toEqual(glyph('A'));
    expect(glyph('@')).toBeNull();
  });

  it('measures text width with one pixel of spacing', () => {
    expect(textWidth('', 1)).toBe(0);
    expect(textWidth('A', 1)).toBe(5);
    expect(textWidth('AB', 1)).toBe(11);
    expect(textWidth('AB', 2)).toBe(22);
  });
});
