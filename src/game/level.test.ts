import { describe, expect, it } from 'vitest';
import { parseLevel, tileAt } from './level';

describe('parseLevel', () => {
  it('extracts spawn, checkpoints, goal and entities and clears the markers', () => {
    const level = parseLevel(['..a.G', 'S.C.G', '#####']);
    expect(level.cols).toBe(5);
    expect(level.rows).toBe(3);
    expect(level.spawn).toEqual({ x: 0, y: 16 });
    expect(level.checkpoints).toEqual([{ x: 32, y: 16 }]);
    expect(level.goal).toEqual({ x: 64, y: 0, w: 16, h: 32 });
    expect(level.entities).toEqual([{ ch: 'a', col: 2, row: 0 }]);
    expect(level.tiles[1]).toBe('.....');
    expect(level.tiles[2]).toBe('#####');
  });

  it('pads short rows with empty tiles', () => {
    const level = parseLevel(['..SG', '#']);
    expect(level.cols).toBe(4);
    expect(level.tiles[1]).toBe('#...');
  });

  it('keeps H, ^ and ~ as tiles', () => {
    const level = parseLevel(['SH^~G']);
    expect(level.tiles[0]).toBe('.H^~.');
  });

  it('throws when there is no spawn', () => {
    expect(() => parseLevel(['..G'])).toThrow(/spawn/);
  });

  it('throws when there is no goal', () => {
    expect(() => parseLevel(['S..'])).toThrow(/goal/);
  });

  it('throws on more than one spawn', () => {
    expect(() => parseLevel(['SS.G'])).toThrow(/spawn/);
  });

  it('throws on unknown characters', () => {
    expect(() => parseLevel(['S?.G'])).toThrow(/unknown tile/);
  });

  it('throws on empty input', () => {
    expect(() => parseLevel([])).toThrow(/no rows/);
  });
});

describe('tileAt', () => {
  const level = parseLevel(['S.#G']);
  it('reads tiles inside the level', () => {
    expect(tileAt(level, 2, 0)).toBe('#');
    expect(tileAt(level, 1, 0)).toBe('.');
  });
  it('treats left, right and top outside as solid', () => {
    expect(tileAt(level, -1, 0)).toBe('#');
    expect(tileAt(level, 4, 0)).toBe('#');
    expect(tileAt(level, 1, -1)).toBe('#');
  });
  it('treats below the level as empty (falling is handled by physics)', () => {
    expect(tileAt(level, 1, 1)).toBe('.');
  });
});
